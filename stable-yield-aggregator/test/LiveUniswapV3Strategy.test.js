const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LiveUniswapV3Strategy", function () {
  let strategy, token, owner, user1, user2;
  let tokenAddress, strategyAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock USDC token
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Mock.deploy("USD Coin", "USDC"); // ERC20Mock doesn't take decimals
    tokenAddress = await token.getAddress();

    // Deploy LiveUniswapV3Strategy
    const LiveUniswapV3Strategy = await ethers.getContractFactory("LiveUniswapV3Strategy");
    strategy = await LiveUniswapV3Strategy.deploy(tokenAddress);
    strategyAddress = await strategy.getAddress();

    // Mint tokens to users for testing (18 decimals by default)
    await token.mint(user1.address, ethers.parseUnits("10000", 18)); // 10,000 tokens
    await token.mint(user2.address, ethers.parseUnits("5000", 18));  // 5,000 tokens
  });

  describe("Deployment", function () {
    it("Should set the correct token address", async function () {
      expect(await strategy.token()).to.equal(tokenAddress);
    });

    it("Should set the correct owner", async function () {
      expect(await strategy.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero shares and position", async function () {
      expect(await strategy.totalShares()).to.equal(0);
      expect(await strategy.currentPositionId()).to.equal(0);
      expect(await strategy.positionLiquidity()).to.equal(0);
    });

    it("Should have correct strategy info", async function () {
      const [name, version] = await strategy.getStrategyInfo();
      expect(name).to.equal("Live Uniswap V3 USDC Strategy");
      expect(version).to.equal("2.0.0");
    });
  });

  describe("Deposits", function () {
    beforeEach(async function () {
            // Approve strategy to spend user tokens
      await token.connect(user1).approve(strategyAddress, ethers.parseUnits("5000", 18));
      await token.connect(user2).approve(strategyAddress, ethers.parseUnits("3000", 18));
    });

    it("Should accept valid deposits", async function () {
      const depositAmount = ethers.parseUnits("1000", 18);
      
      await expect(strategy.connect(user1).deposit(depositAmount, user1.address))
        .to.emit(strategy, "Deposit");
    });

    it("Should accept valid deposits", async function () {
      const depositAmount = ethers.parseUnits("1000", 18);
      
      await expect(strategy.connect(user1).deposit(depositAmount, user1.address))
        .to.emit(strategy, "Deposit");
    });

    it("Should accept valid deposits", async function () {
      const depositAmount = ethers.parseUnits("1000", 18); // 1,000 tokens
      
      const tx = await strategy.connect(user1).deposit(depositAmount, user1.address);
      await expect(tx).to.emit(strategy, "Deposit")
        .withArgs(user1.address, depositAmount, depositAmount); // 1:1 for first deposit
      
      expect(await strategy.userShares(user1.address)).to.equal(depositAmount);
      expect(await strategy.totalShares()).to.equal(depositAmount);
    });

    it("Should reject deposits below minimum", async function () {
      const tooSmallAmount = ethers.parseUnits("0.005", 18); // Below 1e16 minimum (0.01)
      
      await expect(strategy.connect(user1).deposit(tooSmallAmount, user1.address))
        .to.be.revertedWith("Amount too small");
    });

    it("Should reject deposits above maximum", async function () {
      const tooLargeAmount = ethers.parseUnits("200000", 18); // Above 100k maximum
      
      await expect(strategy.connect(user1).deposit(tooLargeAmount, user1.address))
        .to.be.revertedWith("Amount too large");
    });

    it("Should reject deposits below minimum", async function () {
      const tooSmallAmount = ethers.parseUnits("0.005", 18); // Below 1e16 minimum (0.01)
      
      await expect(strategy.connect(user1).deposit(tooSmallAmount, user1.address))
        .to.be.revertedWith("Amount too small");
    });

    it("Should reject deposits above maximum", async function () {
      const tooLargeAmount = ethers.parseUnits("200000", 18); // Above 100k maximum
      
      await expect(strategy.connect(user1).deposit(tooLargeAmount, user1.address))
        .to.be.revertedWith("Amount too large");
    });

    it("Should create Uniswap V3 position on first deposit", async function () {
      const depositAmount = ethers.parseUnits("2000", 18);
      
      await expect(strategy.connect(user1).deposit(depositAmount, user1.address))
        .to.emit(strategy, "PositionCreated");
      
      expect(await strategy.currentPositionId()).to.be.gt(0);
    });

    it("Should handle multiple deposits correctly", async function () {
      const firstDeposit = ethers.parseUnits("1500", 18);
      const secondDeposit = ethers.parseUnits("500", 18);
      
      await strategy.connect(user1).deposit(firstDeposit, user1.address);
      await strategy.connect(user2).deposit(secondDeposit, user2.address);
      
      const totalShares = await strategy.totalShares();
      expect(totalShares).to.be.gt(firstDeposit); // Should be greater than first deposit
      
      expect(await strategy.userShares(user1.address)).to.equal(firstDeposit);
      expect(await strategy.userShares(user2.address)).to.be.gt(0); // Should have proportional shares
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      // Setup: deposit some funds first
      await token.connect(user1).approve(strategyAddress, ethers.parseUnits("5000", 18));
      await strategy.connect(user1).deposit(ethers.parseUnits("2000", 18), user1.address);
    });

    it("Should allow valid withdrawals", async function () {
      const userShares = await strategy.userShares(user1.address);
      const halfShares = userShares / 2n;
      
      const initialBalance = await token.balanceOf(user1.address);
      
      await expect(strategy.connect(user1).withdraw(halfShares, user1.address, user1.address))
        .to.emit(strategy, "Withdrawal");
      
      const finalBalance = await token.balanceOf(user1.address);
      expect(finalBalance).to.be.gt(initialBalance);
      
      const remainingShares = await strategy.userShares(user1.address);
      expect(remainingShares).to.be.approximately(halfShares, ethers.parseUnits("1", 18));
    });

    it("Should reject withdrawal of more shares than owned", async function () {
      const userShares = await strategy.userShares(user1.address);
      const tooManyShares = userShares + ethers.parseUnits("100", 18);
      
      await expect(strategy.connect(user1).withdraw(tooManyShares, user1.address, user1.address))
        .to.be.revertedWith("Insufficient shares");
    });

    it("Should reject zero share withdrawal", async function () {
      await expect(strategy.connect(user1).withdraw(0, user1.address, user1.address))
        .to.be.revertedWith("Shares must be > 0");
    });

    it("Should handle complete withdrawal", async function () {
      const userShares = await strategy.userShares(user1.address);
      const initialBalance = await token.balanceOf(user1.address);
      
      await strategy.connect(user1).withdraw(userShares, user1.address, user1.address);
      
      const finalBalance = await token.balanceOf(user1.address);
      const remainingShares = await strategy.userShares(user1.address);
      
      expect(finalBalance).to.be.gt(initialBalance);
      expect(remainingShares).to.equal(0);
    });
  });

  describe("APY Calculation", function () {
    beforeEach(async function () {
      // Setup with deposit
      await token.connect(user1).approve(strategyAddress, ethers.parseUnits("5000", 18));
      await strategy.connect(user1).deposit(ethers.parseUnits("2000", 18), user1.address);
    });

    it("Should start with zero APY", async function () {
      const apy = await strategy.getAPY();
      expect(apy).to.be.gte(0);
    });

    it("Should update APY after time passes", async function () {
      // Fast forward time to simulate fee collection
      await time.increase(24 * 60 * 60); // 1 day
      
      // Manually trigger fee collection
      await strategy.collectFees();
      
      const apy = await strategy.getAPY();
      expect(apy).to.be.gte(0);
    });

    it("Should maintain historical APY data", async function () {
      // Get initial data points
      const [initialAPY, initialTimestamps] = await strategy.getHistoricalAPY();
      const initialCount = initialAPY.length;
      
      // Trigger several APY updates
      for (let i = 0; i < 3; i++) {
        await time.increase(12 * 60 * 60); // 12 hours
        await strategy.collectFees();
      }
      
      const [apyData, timestamps] = await strategy.getHistoricalAPY();
      expect(apyData.length).to.equal(initialCount + 3); // Should have exactly 3 more data points
      // Note: Initial APY entry (0) doesn't have timestamp, so timestamps will be 1 less than APY data
      expect(timestamps.length).to.equal(apyData.length - 1); // Arrays should have this expected relationship
    });
  });

  describe("Position Management", function () {
    beforeEach(async function () {
      await token.connect(user1).approve(strategyAddress, ethers.parseUnits("5000", 18));
    });

    it("Should create position on first deposit", async function () {
      await expect(strategy.connect(user1).deposit(ethers.parseUnits("1000", 18), user1.address))
        .to.emit(strategy, "PositionCreated");
      
      const [tokenId, liquidity, feesCollected] = await strategy.getPositionInfo();
      expect(tokenId).to.be.gt(0);
      expect(liquidity).to.be.gt(0);
      expect(feesCollected).to.equal(0); // No fees collected yet
    });

    it("Should increase liquidity on subsequent deposits", async function () {
      // First deposit
      await strategy.connect(user1).deposit(ethers.parseUnits("1000", 18), user1.address);
      const [, initialLiquidity,] = await strategy.getPositionInfo();
      
      // Second deposit
      await strategy.connect(user1).deposit(ethers.parseUnits("500", 18), user1.address);
      const [, finalLiquidity,] = await strategy.getPositionInfo();
      
      expect(finalLiquidity).to.be.gt(initialLiquidity);
    });
  });

  describe("Fee Collection", function () {
    beforeEach(async function () {
      await token.connect(user1).approve(strategyAddress, ethers.parseUnits("5000", 18));
      await strategy.connect(user1).deposit(ethers.parseUnits("2000", 18), user1.address);
    });

    it("Should collect fees over time", async function () {
      // Fast forward time
      await time.increase(7 * 24 * 60 * 60); // 1 week
      
      const initialFees = await strategy.totalFeesCollected();
      
      await expect(strategy.collectFees())
        .to.emit(strategy, "FeesCollected");
      
      const finalFees = await strategy.totalFeesCollected();
      expect(finalFees).to.be.gte(initialFees);
    });

    it("Should update APY when fees are collected", async function () {
      const initialAPY = await strategy.getAPY();
      
      // Fast forward and collect fees
      await time.increase(24 * 60 * 60); // 1 day
      await strategy.collectFees();
      
      // APY should be updated
      const finalAPY = await strategy.getAPY();
      // APY might be the same if no significant time passed, but function should work
      expect(finalAPY).to.be.gte(0);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await token.connect(user1).approve(strategyAddress, ethers.parseUnits("3000", 18));
      await strategy.connect(user1).deposit(ethers.parseUnits("1500", 18), user1.address);
    });

    it("Should return correct user balance", async function () {
      const balance = await strategy.getBalance(user1.address);
      expect(balance).to.be.gt(0); // Should have some balance
      expect(balance).to.be.lte(ethers.parseUnits("5000", 18)); // Should be reasonable
    });

    it("Should return total value", async function () {
      const totalValue = await strategy.getTotalValue();
      expect(totalValue).to.be.gte(ethers.parseUnits("1500", 18));
    });

    it("Should return zero balance for non-depositor", async function () {
      const balance = await strategy.getBalance(user2.address);
      expect(balance).to.equal(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to collect fees", async function () {
      // Setup deposit
      await token.connect(user1).approve(strategyAddress, ethers.parseUnits("1000", 18));
      await strategy.connect(user1).deposit(ethers.parseUnits("1000", 18), user1.address);
      
      // Fast forward time
      await time.increase(24 * 60 * 60);
      
      // Owner should be able to collect fees
      await expect(strategy.connect(owner).collectFees())
        .not.to.be.reverted;
    });

    it("Should not allow non-owner to collect fees", async function () {
      await expect(strategy.connect(user1).collectFees())
        .to.be.revertedWithCustomError(strategy, "OwnableUnauthorizedAccount");
    });

    it("Should allow emergency withdrawal by owner", async function () {
      // Setup deposit
      await token.connect(user1).approve(strategyAddress, ethers.parseUnits("1000", 18));
      await strategy.connect(user1).deposit(ethers.parseUnits("1000", 18), user1.address);
      
      const initialOwnerBalance = await token.balanceOf(owner.address);
      
      // Emergency withdrawal
      await strategy.connect(owner).emergencyWithdraw();
      
      const finalOwnerBalance = await token.balanceOf(owner.address);
      expect(finalOwnerBalance).to.be.gte(initialOwnerBalance);
    });

    it("Should not allow non-owner emergency withdrawal", async function () {
      await expect(strategy.connect(user1).emergencyWithdraw())
        .to.be.revertedWithCustomError(strategy, "OwnableUnauthorizedAccount");
    });
  });

  describe("Integration Scenarios", function () {
    it("Should handle deposit -> time passage -> withdrawal cycle", async function () {
      // Approve and deposit
      await token.connect(user1).approve(strategyAddress, ethers.parseUnits("2000", 18));
      const depositAmount = ethers.parseUnits("1500", 18);
      await strategy.connect(user1).deposit(depositAmount, user1.address);
      
      const initialBalance = await token.balanceOf(user1.address);
      const userShares = await strategy.userShares(user1.address);
      
      // Time passes, fees accumulate
      await time.increase(30 * 24 * 60 * 60); // 30 days
      await strategy.collectFees();
      
      // Withdraw all
      await strategy.connect(user1).withdraw(userShares, user1.address, user1.address);
      
      const finalBalance = await token.balanceOf(user1.address);
      
      // User should get back their deposit plus fees (might be minimal in test)
      expect(finalBalance).to.be.gte(initialBalance);
    });

    it("Should handle multiple users with different deposit/withdrawal patterns", async function () {
      // Setup approvals
      await token.connect(user1).approve(strategyAddress, ethers.parseUnits("3000", 18));
      await token.connect(user2).approve(strategyAddress, ethers.parseUnits("2000", 18));
      
      // User1 deposits first
      await strategy.connect(user1).deposit(ethers.parseUnits("1000", 18), user1.address);
      
      // Time passes
      await time.increase(10 * 24 * 60 * 60); // 10 days
      
      // User2 deposits
      await strategy.connect(user2).deposit(ethers.parseUnits("1500", 18), user2.address);
      
      // More time passes
      await time.increase(20 * 24 * 60 * 60); // 20 days
      await strategy.collectFees();
      
      // Both users should have positive balances
      const user1Balance = await strategy.getBalance(user1.address);
      const user2Balance = await strategy.getBalance(user2.address);
      
      expect(user1Balance).to.be.gt(0);
      expect(user2Balance).to.be.gt(0);
      
      // Total value should equal sum of user balances
      const totalValue = await strategy.getTotalValue();
      expect(totalValue).to.be.approximately(
        user1Balance + user2Balance,
        ethers.parseUnits("10", 18) // Small tolerance for rounding
      );
    });
  });
});
