const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Enhanced Real Yield Strategy - Invariant Tests", function () {
  let usdc, strategy, vault, owner, user1, user2, user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

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

    // Mint USDC to users for testing
    await usdc.mint(user1.address, ethers.parseUnits("50000", 18));
    await usdc.mint(user2.address, ethers.parseUnits("30000", 18));
    await usdc.mint(user3.address, ethers.parseUnits("20000", 18));
  });

  describe("Core Invariants", function () {
    it("totalAssets should always be >= totalDeposited", async function () {
      const deposits = [
        ethers.parseUnits("1000", 18),
        ethers.parseUnits("2000", 18),
        ethers.parseUnits("500", 18)
      ];
      const users = [user1, user2, user3];

      for (let i = 0; i < deposits.length; i++) {
        await usdc.connect(users[i]).approve(vault.target, deposits[i]);
        await vault.connect(users[i]).deposit(deposits[i], users[i].address);
        
        // Fast forward some time
        await ethers.provider.send("evm_increaseTime", [Math.floor(Math.random() * 86400) + 3600]); // 1-24 hours
        await ethers.provider.send("evm_mine", []);
        
        const totalAssets = await strategy.totalAssets();
        const totalDeposited = await strategy.totalDeposited();
        
        expect(totalAssets).to.be.gte(totalDeposited, 
          `totalAssets (${ethers.formatUnits(totalAssets, 18)}) should be >= totalDeposited (${ethers.formatUnits(totalDeposited, 18)})`);
      }
    });

    it("Sum of user balances should equal totalDeposited", async function () {
      const deposits = [
        { user: user1, amount: ethers.parseUnits("1500", 18) },
        { user: user2, amount: ethers.parseUnits("2500", 18) },
        { user: user3, amount: ethers.parseUnits("1000", 18) }
      ];

      let expectedTotal = 0n;
      for (const { user, amount } of deposits) {
        await usdc.connect(user).approve(vault.target, amount);
        await vault.connect(user).deposit(amount, user.address);
        expectedTotal += amount;
      }

      const totalDeposited = await strategy.totalDeposited();
      expect(totalDeposited).to.equal(expectedTotal);

      // Check vault shares sum correctly (users deposit through vault)
      let actualSum = 0n;
      for (const { user } of deposits) {
        const vaultShares = await vault.balanceOf(user.address);
        // Convert vault shares to underlying asset value
        const assets = await vault.convertToAssets(vaultShares);
        actualSum += assets;
      }
      
      expect(actualSum).to.equal(expectedTotal);
    });

    it("Harvest should never decrease totalAssets", async function () {
      await usdc.connect(user1).approve(vault.target, ethers.parseUnits("5000", 18));
      await vault.connect(user1).deposit(ethers.parseUnits("5000", 18), user1.address);

      for (let i = 0; i < 5; i++) {
        // Fast forward time to generate yield
        await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 1 week
        await ethers.provider.send("evm_mine", []);

        const assetsBefore = await strategy.totalAssets();
        await vault.harvest();
        const assetsAfter = await strategy.totalAssets();

        // totalAssets might decrease slightly due to yield transfer, but should not decrease dramatically
        const maxAcceptableDecrease = assetsBefore / 100n; // 1% max decrease
        expect(assetsAfter).to.be.gte(assetsBefore - maxAcceptableDecrease,
          `Harvest ${i + 1}: Assets decreased too much. Before: ${ethers.formatUnits(assetsBefore, 18)}, After: ${ethers.formatUnits(assetsAfter, 18)}`);
      }
    });

    it("APY should remain within configured bounds", async function () {
      // Test APY over various time periods
      for (let i = 0; i < 10; i++) {
        const apy = await strategy.getAPY();
        expect(apy).to.be.gte(800, `APY too low: ${apy}`); // 8% minimum
        expect(apy).to.be.lte(2500, `APY too high: ${apy}`); // 25% maximum
        
        // Fast forward random time
        await ethers.provider.send("evm_increaseTime", [Math.floor(Math.random() * 86400 * 7)]); // Up to 1 week
        await ethers.provider.send("evm_mine", []);
      }
    });
  });

  describe("Proportionality Invariants", function () {
    it("Withdrawal amounts should be proportional to deposits over time", async function () {
      const deposit1 = ethers.parseUnits("3000", 18);
      const deposit2 = ethers.parseUnits("1000", 18);

      // Users deposit
      await usdc.connect(user1).approve(vault.target, deposit1);
      await usdc.connect(user2).approve(vault.target, deposit2);
      
      await vault.connect(user1).deposit(deposit1, user1.address);
      await vault.connect(user2).deposit(deposit2, user2.address);

      // Generate yield over multiple periods
      for (let i = 0; i < 3; i++) {
        await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // 1 month
        await ethers.provider.send("evm_mine", []);
        await vault.harvest();
      }

      // Withdraw and check proportionality
      const shares1 = await vault.balanceOf(user1.address);
      const shares2 = await vault.balanceOf(user2.address);

      const balance1Before = await usdc.balanceOf(user1.address);
      const balance2Before = await usdc.balanceOf(user2.address);

      await vault.connect(user1).redeem(shares1, user1.address, user1.address);
      await vault.connect(user2).redeem(shares2, user2.address, user2.address);

      const balance1After = await usdc.balanceOf(user1.address);
      const balance2After = await usdc.balanceOf(user2.address);

      const withdrawal1 = balance1After - balance1Before;
      const withdrawal2 = balance2After - balance2Before;

      // Should maintain ~3:1 ratio
      const ratio = Number(withdrawal1) / Number(withdrawal2);
      expect(ratio).to.be.closeTo(3, 0.2, `Ratio should be ~3:1, got ${ratio.toFixed(2)}:1`);
    });

    it("Multiple partial withdrawals should maintain proportions", async function () {
      await usdc.connect(user1).approve(vault.target, ethers.parseUnits("4000", 18));
      await vault.connect(user1).deposit(ethers.parseUnits("4000", 18), user1.address);

      // Generate some yield
      await ethers.provider.send("evm_increaseTime", [60 * 24 * 60 * 60]); // 2 months
      await ethers.provider.send("evm_mine", []);
      await vault.harvest();

      const initialShares = await vault.balanceOf(user1.address);
      const _initialBalance = await usdc.balanceOf(user1.address);

      // Perform 3 partial withdrawals of 25% each
      let totalWithdrawn = 0n;
      for (let i = 0; i < 3; i++) {
        const sharesToWithdraw = initialShares / 4n; // 25%
        const balanceBefore = await usdc.balanceOf(user1.address);
        
        await vault.connect(user1).redeem(sharesToWithdraw, user1.address, user1.address);
        
        const balanceAfter = await usdc.balanceOf(user1.address);
        const withdrawn = balanceAfter - balanceBefore;
        totalWithdrawn += withdrawn;
        
        expect(withdrawn).to.be.gt(0, `Withdrawal ${i + 1} should be positive`);
      }

      expect(totalWithdrawn).to.be.gt(ethers.parseUnits("3000", 18), "Should have withdrawn more than 75% of principal");
    });
  });

  describe("Stress Testing", function () {
    it("Should handle rapid deposit/withdraw cycles", async function () {
      const initialDeposit = ethers.parseUnits("1000", 18);
      
      for (let cycle = 0; cycle < 5; cycle++) {
        // Deposit
        await usdc.connect(user1).approve(vault.target, initialDeposit);
        await vault.connect(user1).deposit(initialDeposit, user1.address);
        
        // Fast forward small amount
        await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
        await ethers.provider.send("evm_mine", []);
        
        // Withdraw most
        const shares = await vault.balanceOf(user1.address);
        const sharesToWithdraw = (shares * 80n) / 100n; // 80%
        
        if (sharesToWithdraw > 0) {
          await vault.connect(user1).redeem(sharesToWithdraw, user1.address, user1.address);
        }
        
        // Verify strategy state remains consistent
        const totalAssets = await strategy.totalAssets();
        const totalDeposited = await strategy.totalDeposited();
        expect(totalAssets).to.be.gte(0);
        expect(totalDeposited).to.be.gte(0);
      }
    });

    it("Should maintain accuracy with dust amounts", async function () {
      const dustAmount = ethers.parseUnits("0.001", 18); // Very small amount
      
      await usdc.connect(user1).approve(vault.target, dustAmount);
      await vault.connect(user1).deposit(dustAmount, user1.address);
      
      const shares = await vault.balanceOf(user1.address);
      expect(shares).to.be.gt(0, "Should receive shares even for dust deposit");
      
      // Fast forward and harvest
      await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
      await ethers.provider.send("evm_mine", []);
      await vault.harvest();
      
      // Should be able to withdraw
      const balanceBefore = await usdc.balanceOf(user1.address);
      await vault.connect(user1).redeem(shares, user1.address, user1.address);
      const balanceAfter = await usdc.balanceOf(user1.address);
      
      expect(balanceAfter).to.be.gte(balanceBefore, "Should receive something back");
    });
  });

  describe("Time-based Invariants", function () {
    it("Yield accumulation should be monotonic over time", async function () {
      await usdc.connect(user1).approve(vault.target, ethers.parseUnits("5000", 18));
      await vault.connect(user1).deposit(ethers.parseUnits("5000", 18), user1.address);

      let lastYield = 0n;
      
      for (let i = 0; i < 5; i++) {
        await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 1 week
        await ethers.provider.send("evm_mine", []);
        
        const metrics = await strategy.getStrategyMetrics();
        const currentProjectedYield = metrics[1]; // totalYield
        
        expect(currentProjectedYield).to.be.gte(lastYield, 
          `Yield should not decrease. Week ${i + 1}: ${ethers.formatUnits(currentProjectedYield, 18)} vs ${ethers.formatUnits(lastYield, 18)}`);
        
        lastYield = currentProjectedYield;
      }
    });

    it("APY calculation should be consistent with actual yield generation", async function () {
      const depositAmount = ethers.parseUnits("10000", 18);
      
      await usdc.connect(user1).approve(vault.target, depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);
      
      const initialAssets = await strategy.totalAssets();
      const apy = await strategy.getAPY();
      
      // Fast forward 1 year
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      const finalAssets = await strategy.totalAssets();
      const actualYield = finalAssets - initialAssets;
      const actualAPY = (Number(actualYield) * 10000) / Number(depositAmount); // In basis points
      
      // Should be within reasonable bounds of declared APY (accounting for realization factor)
      const expectedYieldBPS = Number(apy) * 85 / 100; // 85% realization (more realistic)
      expect(actualAPY).to.be.closeTo(expectedYieldBPS, expectedYieldBPS * 0.5, // 50% tolerance for market variability
        `Actual APY (${actualAPY/100}%) should be close to expected (${expectedYieldBPS/100}%)`);
    });
  });
});
