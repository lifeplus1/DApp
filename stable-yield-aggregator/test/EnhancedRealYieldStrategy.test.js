const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Enhanced Real Yield Strategy", function () {
  let usdc, strategy, vault, owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock USDC
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    usdc = await ERC20Mock.deploy("USDC", "USDC");
    await usdc.waitForDeployment();
    
    // Deploy StableVault first (without strategy initially)
    const StableVault = await ethers.getContractFactory("StableVault");
    vault = await StableVault.deploy(await usdc.getAddress(), ethers.ZeroAddress);
    await vault.waitForDeployment();
    
    // Deploy Enhanced Real Yield Strategy with vault address
    const EnhancedRealYieldStrategy = await ethers.getContractFactory("EnhancedRealYieldStrategy");
    strategy = await EnhancedRealYieldStrategy.deploy(await usdc.getAddress(), await vault.getAddress(), owner.address);
    await strategy.waitForDeployment();
    
    // Set the strategy in the vault
    await vault.setStrategy(await strategy.getAddress());

    // Mint USDC to users for testing
    await usdc.mint(user.address, ethers.parseUnits("10000", 18));
    await usdc.mint(await strategy.getAddress(), ethers.parseUnits("1000", 18)); // For strategy operations
  });

  describe("Enhanced Yield Generation", function () {
    it("Should provide realistic market-based APY", async function () {
      const currentAPY = await strategy.getAPY();
      
      // Should be between 8% and 25% (realistic for stablecoin strategies with volatility)
      expect(currentAPY).to.be.gte(800); // 8% minimum
      expect(currentAPY).to.be.lte(2500); // 25% maximum (includes volatility bonuses)
      console.log(`Current APY: ${Number(currentAPY) / 100}%`);
    });

    it("Should generate yield over time with compound growth", async function () {
      const depositAmount = ethers.parseUnits("1000", 18); // $1000
      
      // Deposit funds directly to strategy (as owner)
      await usdc.connect(user).transfer(owner.address, depositAmount);
      await usdc.connect(owner).approve(await strategy.getAddress(), depositAmount);
      await strategy.connect(owner).deposit(depositAmount, owner.address);
      
      const initialAssets = await strategy.totalAssets();
      console.log(`Initial assets: $${ethers.formatUnits(initialAssets, 18)}`);
      
      // Fast forward 30 days
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // 30 days
      await ethers.provider.send("evm_mine", []);
      
      const assetsAfter30Days = await strategy.totalAssets();
      console.log(`Assets after 30 days: $${ethers.formatUnits(assetsAfter30Days, 18)}`);
      
      // Should have generated meaningful yield (at least 1% in 30 days for 15% APY)
      const expectedMinYield = depositAmount / 100n; // 1% minimum
      expect(assetsAfter30Days).to.be.gt(initialAssets + expectedMinYield);
      
      // Calculate approximate APY achieved
      const yieldGenerated = assetsAfter30Days - initialAssets;
      const monthlyReturn = Number(yieldGenerated) / Number(depositAmount);
      const annualizedAPY = monthlyReturn * 12 * 100;
      console.log(`Achieved APY: ${annualizedAPY.toFixed(2)}%`);
      
      expect(annualizedAPY).to.be.gte(8); // At least 8% APY
      expect(annualizedAPY).to.be.lte(25); // Not more than 25% APY
    });

    it("Should harvest accumulated yield correctly", async function () {
      const depositAmount = ethers.parseUnits("1000", 18);
      
      await usdc.connect(user).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user).deposit(depositAmount, user.address);
      
      // Fast forward to generate yield
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 1 week
      await ethers.provider.send("evm_mine", []);
      
      const initialBalance = await usdc.balanceOf(await vault.getAddress());
      await vault.harvest(); // Call harvest through vault, not directly on strategy
      const finalBalance = await usdc.balanceOf(await vault.getAddress());
      const harvestedYield = finalBalance - initialBalance;
      
      expect(harvestedYield).to.be.gt(0);
      
      // Check strategy metrics
      const metrics = await strategy.getStrategyMetrics();
      console.log(`Strategy metrics - Total Deposits: $${ethers.formatUnits(metrics[0], 18)}`);
      console.log(`Strategy metrics - Cumulative Yield: $${ethers.formatUnits(metrics[4], 18)}`);
      
      expect(metrics[3]).to.equal(1); // Harvest count should be 1
    });

    it("Should handle dynamic APY based on market conditions", async function () {
      // Get initial APY
      const initialAPY = await strategy.getAPY();
      
      // Fast forward time to change market conditions
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]); // 1 day
      await ethers.provider.send("evm_mine", []);
      
      const newAPY = await strategy.getAPY();
      
      // APY should change due to volatility and volume factors
      console.log(`Initial APY: ${Number(initialAPY) / 100}%, New APY: ${Number(newAPY) / 100}%`);
      
      // Both should be in realistic range
      expect(initialAPY).to.be.gte(800).and.lte(2000);
      expect(newAPY).to.be.gte(800).and.lte(2000);
    });

    it("Should track detailed performance metrics", async function () {
      const depositAmount = ethers.parseUnits("500", 18);
      
      await usdc.connect(user).approve(vault.target, depositAmount);
      await vault.connect(user).deposit(depositAmount, user.address);
      
      // Generate some yield
      await ethers.provider.send("evm_increaseTime", [14 * 24 * 60 * 60]); // 2 weeks
      await ethers.provider.send("evm_mine", []);
      
      await strategy.harvest();
      
      const metrics = await strategy.getStrategyMetrics();
      const [totalDeposits, totalYield, currentAPY, harvestsCount, cumulativeYield] = metrics;
      
      console.log(`Performance Metrics:`);
      console.log(`- Total Deposits: $${ethers.formatUnits(totalDeposits, 18)}`);
      console.log(`- Total Yield: $${ethers.formatUnits(totalYield, 18)}`);
      console.log(`- Current APY: ${Number(currentAPY) / 100}%`);
      console.log(`- Harvests Count: ${harvestsCount}`);
      console.log(`- Cumulative Yield: $${ethers.formatUnits(cumulativeYield, 18)}`);
      
      expect(totalDeposits).to.equal(depositAmount);
      expect(totalYield).to.be.gte(0);
      expect(currentAPY).to.be.gte(800);
      expect(harvestsCount).to.equal(1);
      expect(cumulativeYield).to.be.gt(0);
    });
  });

  describe("Advanced Strategy Management", function () {
    it("Should allow owner to update strategy parameters", async function () {
      const newBaseAPY = 1000; // 10%
      const newVolatilityBonus = 500; // 5%
      const newLiquidityBonus = 400; // 4%
      const newTradingFeeAPY = 300; // 3%
      
      await strategy.updateStrategyParameters(
        newBaseAPY,
        newVolatilityBonus,
        newLiquidityBonus,
        newTradingFeeAPY
      );
      
      const newAPY = await strategy.getAPY();
      console.log(`Updated APY: ${Number(newAPY) / 100}%`);
      
      // New APY should reflect the updated parameters
      expect(newAPY).to.be.gte(newBaseAPY);
    });

    it("Should prevent unauthorized parameter updates", async function () {
      await expect(
        strategy.connect(user).updateStrategyParameters(1500, 600, 400, 300)
      ).to.be.revertedWithCustomError(strategy, "OwnableUnauthorizedAccount");
    });

    it("Should enforce reasonable limits on APY parameters", async function () {
      // Should reject excessive base APY (over 20%)
      await expect(
        strategy.updateStrategyParameters(2500, 400, 300, 200) // 25% base APY
      ).to.be.revertedWith("Base APY too high");
      
      // Should reject excessive volatility bonus (over 10%)
      await expect(
        strategy.updateStrategyParameters(1000, 1500, 300, 200) // 15% volatility bonus
      ).to.be.revertedWith("Volatility bonus too high");
    });

    it("Should toggle active status correctly", async function () {
      expect(await strategy.isActive()).to.be.true;
      
      await strategy.toggleActive();
      expect(await strategy.isActive()).to.be.false;
      
      // Should reject deposits when inactive
      await usdc.connect(user).approve(vault.target, ethers.parseUnits("100", 18));
      await expect(
        vault.connect(user).deposit(ethers.parseUnits("100", 18), user.address)
      ).to.be.revertedWith("Strategy is not active");
    });
  });

  describe("Integration with Vault", function () {
    it("Should work seamlessly with vault operations", async function () {
      const depositAmount = ethers.parseUnits("1000", 18);
      
      // Test full deposit -> harvest -> withdraw cycle
      await usdc.connect(user).approve(vault.target, depositAmount);
      await vault.connect(user).deposit(depositAmount, user.address);
      
      // Generate yield
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      // Harvest yield
      await vault.harvest();
      
      // Check user can withdraw with profit
      const userShares = await vault.balanceOf(user.address);
      const initialBalance = await usdc.balanceOf(user.address);
      
      await vault.connect(user).redeem(userShares, user.address, user.address);
      
      const finalBalance = await usdc.balanceOf(user.address);
      const profit = finalBalance - initialBalance;
      
      console.log(`User profit: $${ethers.formatUnits(profit, 18)}`);
      expect(profit).to.be.gt(0); // User should have made profit
    });

    it("Should handle multiple users proportionally", async function () {
      const deposit1 = ethers.parseUnits("2000", 18);
      const deposit2 = ethers.parseUnits("1000", 18);
      
      // Second user
      const [, , user2] = await ethers.getSigners();
      await usdc.mint(user2.address, ethers.parseUnits("5000", 18));
      
      // Both users deposit
      await usdc.connect(user).approve(vault.target, deposit1);
      await usdc.connect(user2).approve(vault.target, deposit2);
      
      await vault.connect(user).deposit(deposit1, user.address);
      await vault.connect(user2).deposit(deposit2, user2.address);
      
      // Generate yield
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      await vault.harvest();
      
      // Check proportional shares
      const shares1 = await vault.balanceOf(user.address);
      const shares2 = await vault.balanceOf(user2.address);
      
      const ratio = Number(shares1) / Number(shares2);
      expect(ratio).to.be.closeTo(2, 0.1); // User1 should have ~2x shares
    });
  });

  describe("Real-World Scenario Simulation", function () {
    it("Should simulate realistic DeFi yield farming scenario", async function () {
      console.log("\n=== DeFi Yield Farming Simulation ===");
      
      const initialDeposit = ethers.parseUnits("5000", 18); // $5000
      
      // User deposits into vault
      await usdc.connect(user).approve(vault.target, initialDeposit);
      await vault.connect(user).deposit(initialDeposit, user.address);
      
      console.log(`Initial deposit: $${ethers.formatUnits(initialDeposit, 18)}`);
      
      // Simulate 3 months of yield generation with monthly harvests
      for (let month = 1; month <= 3; month++) {
        // Fast forward 1 month
        await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine", []);
        
        const totalAssets = await strategy.totalAssets();
        const currentAPY = await strategy.getAPY();
        
        console.log(`\nMonth ${month}:`);
        console.log(`- Total Assets: $${ethers.formatUnits(totalAssets, 18)}`);
        console.log(`- Current APY: ${Number(currentAPY) / 100}%`);
        
        // Harvest monthly
        const initialVaultBalance = await usdc.balanceOf(await vault.getAddress());
        await strategy.harvest();
        const finalVaultBalance = await usdc.balanceOf(await vault.getAddress());
        const harvestedYield = finalVaultBalance - initialVaultBalance;
        console.log(`- Monthly Harvest: $${ethers.formatUnits(harvestedYield, 18)}`);
      }
      
      // Final withdrawal
      const userShares = await vault.balanceOf(user.address);
      const balanceBefore = await usdc.balanceOf(user.address);
      
      await vault.connect(user).redeem(userShares, user.address, user.address);
      
      const balanceAfter = await usdc.balanceOf(user.address);
      const totalReturn = balanceAfter - balanceBefore;
      const profitPercentage = ((Number(totalReturn) / Number(initialDeposit)) * 100);
      
      console.log(`\n=== Final Results ===`);
      console.log(`Initial Investment: $${ethers.formatUnits(initialDeposit, 18)}`);
      console.log(`Final Balance: $${ethers.formatUnits(balanceAfter, 18)}`);
      console.log(`Total Return: $${ethers.formatUnits(totalReturn, 18)}`);
      console.log(`Profit Percentage: ${profitPercentage.toFixed(2)}%`);
      console.log(`Annualized Return: ${(profitPercentage * 4).toFixed(2)}%`);
      
      // Should have generated meaningful returns (at least 2% over 3 months)
      expect(profitPercentage).to.be.gte(2);
      expect(profitPercentage).to.be.lte(8); // Not more than 8% in 3 months
    });
  });
});
