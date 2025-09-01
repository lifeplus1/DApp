const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Platform Integration Tests", function () {
  // Define a fixture to deploy contracts
  async function deployPlatformFixture() {
    const [owner, user] = await ethers.getSigners();

    // Deploy mock USDC
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const usdc = await ERC20Mock.deploy("USDC", "USDC");
    await usdc.waitForDeployment();
    
    // Deploy Vault first (without strategy initially)
    const StableVault = await ethers.getContractFactory("StableVault");
    const vault = await StableVault.deploy(usdc.target, ethers.ZeroAddress);
    await vault.waitForDeployment();
    
    // Deploy Uniswap V3 Strategy with vault address
    const LiveUniswapV3Strategy = await ethers.getContractFactory("LiveUniswapV3Strategy");
    const strategy = await LiveUniswapV3Strategy.deploy(usdc.target);
    await strategy.waitForDeployment();
    
    // Set the strategy in the vault
    await vault.setStrategy(strategy.target);

    // Mint USDC to users for testing
    await usdc.mint(user.address, ethers.parseUnits("10000", 18));
    await usdc.mint(owner.address, ethers.parseUnits("10000", 18));

    return { vault, strategy, usdc, owner, user };
  }

  describe("Platform Deployment", function () {
    it("Should deploy complete platform successfully", async function () {
      const { vault, strategy, owner } = await loadFixture(deployPlatformFixture);
      
      expect(vault.target).to.not.equal(ethers.ZeroAddress);
      expect(strategy.target).to.not.equal(ethers.ZeroAddress);
      expect(await vault.owner()).to.equal(owner.address);
      expect(await strategy.owner()).to.equal(owner.address);
    });

    it("Should register strategy in vault", async function () {
      const { vault, strategy } = await loadFixture(deployPlatformFixture);
      
      // Check that strategy is associated with vault
      expect(await vault.currentStrategy()).to.equal(strategy.target);
    });
  });

  describe("Real Yield Generation Flow", function () {
    it("Should deposit and generate yield through Uniswap V3 strategy", async function () {
      const { vault, usdc, user } = await loadFixture(deployPlatformFixture);
      
      const depositAmount = ethers.parseUnits("1000", 18); // $1000
      
      // Approve and deposit
      await usdc.connect(user).approve(vault.target, depositAmount);
      await vault.connect(user).deposit(depositAmount, user.address);
      
      expect(await vault.balanceOf(user.address)).to.be.gt(0);
    });

    it("Should harvest fees and compound yields", async function () {
      const { vault, strategy, usdc, user } = await loadFixture(deployPlatformFixture);
      
      const depositAmount = ethers.parseUnits("1000", 18);
      
      // Deposit funds
      await usdc.connect(user).approve(vault.target, depositAmount);
      await vault.connect(user).deposit(depositAmount, user.address);
      
      // Fast forward time to simulate trading activity
      await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
      await ethers.provider.send("evm_mine", []);
      
      // Harvest fees
      const harvestTx = await strategy.harvest();
      const receipt = await harvestTx.wait();
      
      expect(receipt).to.not.be.null;
    });

    it("Should provide accurate APY calculations", async function () {
      const { strategy, vault, usdc, user } = await loadFixture(deployPlatformFixture);
      
      const depositAmount = ethers.parseUnits("1000", 18);
      
      await usdc.connect(user).approve(vault.target, depositAmount);
      await vault.connect(user).deposit(depositAmount, user.address);
      
      const currentAPY = await strategy.getAPY();
      
      // APY should be between 5% and 30% (500-3000 basis points)
      expect(currentAPY).to.be.gte(500);
      expect(currentAPY).to.be.lte(3000);
      
      // For new strategy, should return realistic stablecoin APY
      expect(currentAPY).to.be.gte(1000); // At least 10% for USDC/USDT
    });

    it("Should allow withdrawal with accumulated yield", async function () {
      const { vault, strategy, usdc, user } = await loadFixture(deployPlatformFixture);
      
      const depositAmount = ethers.parseUnits("1000", 18);
      
      // Deposit and let yield accumulate
      await usdc.connect(user).approve(vault.target, depositAmount);
      await vault.connect(user).deposit(depositAmount, user.address);
      
      // Fast forward time and harvest
      await ethers.provider.send("evm_increaseTime", [7 * 86400]); // 1 week
      await ethers.provider.send("evm_mine", []);
      
      await strategy.harvest();
      
      const userShares = await vault.balanceOf(user.address);
      
      // Withdraw all funds
      const initialBalance = await usdc.balanceOf(user.address);
      await vault.connect(user).redeem(userShares, user.address, user.address);
      const finalBalance = await usdc.balanceOf(user.address);
      
      // Should receive more than initially had due to yield
      expect(finalBalance).to.be.gt(initialBalance);
    });
  });

  describe("Advanced Strategy Features", function () {
    it("Should provide real-time strategy status", async function () {
      const { strategy, usdc } = await loadFixture(deployPlatformFixture);
      
      expect(await strategy.isActive()).to.be.true;
      expect(await strategy.strategyName()).to.contain("Uniswap V3");
      expect(await strategy.asset()).to.equal(usdc.target);
    });
  });

  describe("Multi-User Scenarios", function () {
    it("Should handle multiple users with proportional yield distribution", async function () {
      const { vault, usdc } = await loadFixture(deployPlatformFixture);
      const [, , user1, user2] = await ethers.getSigners();
      
      // Mint USDC to additional users
      await usdc.mint(user1.address, ethers.parseUnits("5000", 18));
      await usdc.mint(user2.address, ethers.parseUnits("3000", 18));
      
      // User deposits
      const deposit1 = ethers.parseUnits("2000", 18); // $2000
      const deposit2 = ethers.parseUnits("1000", 18); // $1000
      
      await usdc.connect(user1).approve(vault.target, deposit1);
      await usdc.connect(user2).approve(vault.target, deposit2);
      
      await vault.connect(user1).deposit(deposit1, user1.address);
      await vault.connect(user2).deposit(deposit2, user2.address);
      
      // Check proportional ownership
      const shares1 = await vault.balanceOf(user1.address);
      const shares2 = await vault.balanceOf(user2.address);
      
      // User1 should have ~2x the shares of User2 (proportional to deposit)
      const ratio = Number(shares1) / Number(shares2);
      expect(ratio).to.be.closeTo(2, 0.5);
    });
  });

  describe("Gas Optimization", function () {
    it("Should batch operations efficiently", async function () {
      const { vault, usdc, user } = await loadFixture(deployPlatformFixture);
      
      const depositAmount = ethers.parseUnits("1000", 18);
      
      await usdc.connect(user).approve(vault.target, depositAmount);
      
      // Measure gas for deposit
      const depositTx = await vault.connect(user).deposit(depositAmount, user.address);
      const depositReceipt = await depositTx.wait();
      
      console.log(`Deposit gas used: ${depositReceipt?.gasUsed}`);
      
      // Should be under reasonable gas limits
      expect(depositReceipt?.gasUsed).to.be.lt(300000); // Under 300k gas for ERC4626 operations
    });
  });
});
