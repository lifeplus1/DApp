const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Enhanced Real Yield Strategy - Gas Analysis", function () {
  let usdc, strategy, vault, owner, user;
  let gasReports = [];

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock USDC
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    usdc = await ERC20Mock.deploy("USDC", "USDC");
    await usdc.waitForDeployment();
    
    // Deploy StableVault first
    const StableVault = await ethers.getContractFactory("StableVault");
    vault = await StableVault.deploy(await usdc.getAddress(), ethers.ZeroAddress);
    await vault.waitForDeployment();
    
    // Deploy Enhanced Real Yield Strategy
    const EnhancedRealYieldStrategy = await ethers.getContractFactory("EnhancedRealYieldStrategy");
    strategy = await EnhancedRealYieldStrategy.deploy(await usdc.getAddress(), await vault.getAddress(), owner.address);
    await strategy.waitForDeployment();
    
    // Set the strategy in the vault
    await vault.setStrategy(await strategy.getAddress());

    // Mint USDC to user
    await usdc.mint(user.address, ethers.parseUnits("100000", 18));
  });

  after(function () {
    console.log("\n=== Gas Usage Report ===");
    gasReports.forEach(report => {
      console.log(`${report.operation.padEnd(30)} | ${report.gasUsed.toString().padStart(8)} gas | ${report.description}`);
    });
    console.log("========================");
  });

  async function recordGas(operation, tx, description = "") {
    const receipt = await tx.wait();
    gasReports.push({
      operation,
      gasUsed: receipt.gasUsed,
      description
    });
    return receipt;
  }

  describe("Core Operations Gas Usage", function () {
    it("Should measure deposit gas costs", async function () {
      const amounts = [
        ethers.parseUnits("100", 18),
        ethers.parseUnits("1000", 18),
        ethers.parseUnits("10000", 18)
      ];

      for (let i = 0; i < amounts.length; i++) {
        await usdc.connect(user).approve(vault.target, amounts[i]);
        const tx = await vault.connect(user).deposit(amounts[i], user.address);
        await recordGas(`Deposit ${i + 1}`, tx, `$${ethers.formatUnits(amounts[i], 18)}`);
      }
    });

    it("Should measure withdrawal gas costs", async function () {
      // Setup: make deposits first
      const depositAmount = ethers.parseUnits("5000", 18);
      await usdc.connect(user).approve(vault.target, depositAmount);
      await vault.connect(user).deposit(depositAmount, user.address);

      // Generate some yield
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // 1 month
      await ethers.provider.send("evm_mine", []);

      const shares = await vault.balanceOf(user.address);
      const withdrawAmounts = [
        shares / 4n,  // 25%
        shares / 2n,  // 50% of remaining
        shares / 4n   // Final 25%
      ];

      for (let i = 0; i < withdrawAmounts.length; i++) {
        if (withdrawAmounts[i] > 0) {
          const tx = await vault.connect(user).redeem(withdrawAmounts[i], user.address, user.address);
          await recordGas(`Withdrawal ${i + 1}`, tx, `${((Number(withdrawAmounts[i]) / Number(shares)) * 100).toFixed(1)}% of shares`);
        }
      }
    });

    it("Should measure harvest gas costs", async function () {
      // Setup: make deposit and generate yield
      await usdc.connect(user).approve(vault.target, ethers.parseUnits("10000", 18));
      await vault.connect(user).deposit(ethers.parseUnits("10000", 18), user.address);

      const timeIntervals = [
        7 * 24 * 60 * 60,   // 1 week
        30 * 24 * 60 * 60,  // 1 month
        90 * 24 * 60 * 60   // 3 months
      ];

      for (let i = 0; i < timeIntervals.length; i++) {
        await ethers.provider.send("evm_increaseTime", [timeIntervals[i]]);
        await ethers.provider.send("evm_mine", []);

        const tx = await vault.harvest();
        await recordGas(`Harvest ${i + 1}`, tx, `After ${timeIntervals[i] / (24 * 60 * 60)} days`);
      }
    });

    it("Should measure view function gas costs", async function () {
      await usdc.connect(user).approve(vault.target, ethers.parseUnits("5000", 18));
      await vault.connect(user).deposit(ethers.parseUnits("5000", 18), user.address);

      // Fast forward to generate yield
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      // Measure view functions (these don't actually consume gas in transactions, but we can estimate)
      const provider = ethers.provider;
      
      const apyGas = await provider.estimateGas({
        to: await strategy.getAddress(),
        data: strategy.interface.encodeFunctionData("getAPY")
      });
      gasReports.push({ operation: "getAPY (view)", gasUsed: apyGas, description: "Read-only APY calculation" });

      const totalAssetsGas = await provider.estimateGas({
        to: await strategy.getAddress(),
        data: strategy.interface.encodeFunctionData("totalAssets")
      });
      gasReports.push({ operation: "totalAssets (view)", gasUsed: totalAssetsGas, description: "Read-only total assets" });

      const metricsGas = await provider.estimateGas({
        to: await strategy.getAddress(),
        data: strategy.interface.encodeFunctionData("getStrategyMetrics")
      });
      gasReports.push({ operation: "getStrategyMetrics (view)", gasUsed: metricsGas, description: "Read-only strategy metrics" });
    });
  });

  describe("Batch Operations Gas Analysis", function () {
    it("Should compare single vs multiple operations", async function () {
      // Single large deposit
      const largeAmount = ethers.parseUnits("5000", 18);
      await usdc.connect(user).approve(vault.target, largeAmount);
      const largeTx = await vault.connect(user).deposit(largeAmount, user.address);
      await recordGas("Single Large Deposit", largeTx, `$${ethers.formatUnits(largeAmount, 18)}`);

      // Multiple small deposits (simulate different user)
      const [, , user2] = await ethers.getSigners();
      await usdc.mint(user2.address, ethers.parseUnits("10000", 18));

      let totalGasSmall = 0n;
      const smallAmount = ethers.parseUnits("1000", 18);
      
      for (let i = 0; i < 5; i++) {
        await usdc.connect(user2).approve(vault.target, smallAmount);
        const tx = await vault.connect(user2).deposit(smallAmount, user2.address);
        const receipt = await tx.wait();
        totalGasSmall += receipt.gasUsed;
      }

      gasReports.push({
        operation: "5x Small Deposits (total)",
        gasUsed: totalGasSmall,
        description: `5x $${ethers.formatUnits(smallAmount, 18)} vs 1x $${ethers.formatUnits(largeAmount, 18)}`
      });

      // Analysis
      const efficiency = (Number(largeTx.gasUsed) / Number(totalGasSmall) * 100).toFixed(1);
      console.log(`\nGas Efficiency: Single large deposit uses ${efficiency}% of multiple small deposits`);
    });

    it("Should analyze gas costs over strategy lifetime", async function () {
      const users = await ethers.getSigners();
      const activeUsers = users.slice(1, 6); // Use 5 users
      let cumulativeGas = 0n;

      // Mint tokens for all users
      for (const user of activeUsers) {
        await usdc.mint(user.address, ethers.parseUnits("20000", 18));
      }

      // Simulate 6 months of activity
      for (let month = 1; month <= 6; month++) {
        console.log(`\n--- Month ${month} Activity ---`);
        
        // Each user deposits
        for (let i = 0; i < activeUsers.length; i++) {
          const user = activeUsers[i];
          const amount = ethers.parseUnits((1000 + i * 500).toString(), 18);
          
          await usdc.connect(user).approve(vault.target, amount);
          const tx = await vault.connect(user).deposit(amount, user.address);
          const receipt = await tx.wait();
          cumulativeGas += receipt.gasUsed;
        }

        // Fast forward 1 month
        await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine", []);

        // Monthly harvest
        const harvestTx = await vault.harvest();
        const harvestReceipt = await harvestTx.wait();
        cumulativeGas += harvestReceipt.gasUsed;

        // Some users withdraw (alternating months)
        if (month % 2 === 0) {
          for (let i = 0; i < 2; i++) {
            const user = activeUsers[i];
            const shares = await vault.balanceOf(user.address);
            const withdrawShares = shares / 3n; // Withdraw 1/3
            
            if (withdrawShares > 0) {
              const tx = await vault.connect(user).redeem(withdrawShares, user.address, user.address);
              const receipt = await tx.wait();
              cumulativeGas += receipt.gasUsed;
            }
          }
        }
      }

      gasReports.push({
        operation: "6-Month Simulation Total",
        gasUsed: cumulativeGas,
        description: "5 users, monthly deposits, bi-monthly withdrawals, monthly harvests"
      });

      const avgMonthlyGas = cumulativeGas / 6n;
      gasReports.push({
        operation: "Average Monthly Gas",
        gasUsed: avgMonthlyGas,
        description: "Total gas divided by 6 months"
      });
    });
  });

  describe("Gas Optimization Verification", function () {
    it("Should verify view functions are gas-efficient", async function () {
      await usdc.connect(user).approve(vault.target, ethers.parseUnits("1000", 18));
      await vault.connect(user).deposit(ethers.parseUnits("1000", 18), user.address);

      // These should be very low gas since they're view functions
      const viewFunctions = [
        { name: "getAPY", maxGas: 50000 },
        { name: "totalAssets", maxGas: 30000 },
        { name: "balanceOf", maxGas: 10000 },
        { name: "isActive", maxGas: 5000 }
      ];

      for (const { name, maxGas } of viewFunctions) {
        try {
          const estimatedGas = await ethers.provider.estimateGas({
            to: await strategy.getAddress(),
            data: strategy.interface.encodeFunctionData(name, name === "balanceOf" ? [user.address] : [])
          });
          
          expect(Number(estimatedGas)).to.be.lt(maxGas, 
            `${name} should use less than ${maxGas} gas, got ${estimatedGas}`);
        } catch (error) {
          console.log(`Could not estimate gas for ${name}: ${error.message}`);
        }
      }
    });

    it("Should ensure harvest gas usage scales reasonably", async function () {
      const depositAmounts = [
        ethers.parseUnits("1000", 18),
        ethers.parseUnits("10000", 18),
        ethers.parseUnits("100000", 18)
      ];

      let harvestGasUsages = [];

      for (let i = 0; i < depositAmounts.length; i++) {
        // Fresh setup for each test
        const [newOwner, newUser] = await ethers.getSigners();
        
        const newUsdc = await (await ethers.getContractFactory("ERC20Mock")).deploy("USDC", "USDC");
        const newVault = await (await ethers.getContractFactory("StableVault")).deploy(await newUsdc.getAddress(), ethers.ZeroAddress);
        const newStrategy = await (await ethers.getContractFactory("EnhancedRealYieldStrategy")).deploy(
          await newUsdc.getAddress(), 
          await newVault.getAddress(), 
          newOwner.address
        );
        
        await newVault.setStrategy(await newStrategy.getAddress());
        await newUsdc.mint(newUser.address, depositAmounts[i] * 2n);
        
        // Deposit and generate yield
        await newUsdc.connect(newUser).approve(newVault.target, depositAmounts[i]);
        await newVault.connect(newUser).deposit(depositAmounts[i], newUser.address);
        
        await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // 1 month
        await ethers.provider.send("evm_mine", []);
        
        const tx = await newVault.harvest();
        const receipt = await tx.wait();
        harvestGasUsages.push({
          deposit: depositAmounts[i],
          gas: receipt.gasUsed
        });
      }

      // Gas usage should not scale linearly with deposit amount (should be relatively constant)
      const gasRatio = Number(harvestGasUsages[2].gas) / Number(harvestGasUsages[0].gas);
      expect(gasRatio).to.be.lt(3, `Harvest gas should scale sub-linearly with deposit size. Ratio: ${gasRatio.toFixed(2)}`);
      
      harvestGasUsages.forEach((usage, i) => {
        gasReports.push({
          operation: `Harvest Scale Test ${i + 1}`,
          gasUsed: usage.gas,
          description: `$${ethers.formatUnits(usage.deposit, 18)} deposit`
        });
      });
    });
  });
});
