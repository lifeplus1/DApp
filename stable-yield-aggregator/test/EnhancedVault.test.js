const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Enhanced Stablecoin Yield Aggregator", function () {
  let asset, dummyStrategy, uniStrategy, vault, strategyManager;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy Mock USDC
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    asset = await ERC20Mock.deploy("Mock USDC", "mUSDC");
    await asset.waitForDeployment();

    // Deploy Strategy Manager
    const StrategyManager = await ethers.getContractFactory("StrategyManager");
    strategyManager = await StrategyManager.deploy();
    await strategyManager.waitForDeployment();

    // Deploy Strategies
    const DummyStrategy = await ethers.getContractFactory("DummyStrategy");
    dummyStrategy = await DummyStrategy.deploy(asset.target);
    await dummyStrategy.waitForDeployment();

    const LiveUniswapV3Strategy = await ethers.getContractFactory("LiveUniswapV3Strategy");
    uniStrategy = await LiveUniswapV3Strategy.deploy(asset.target);
    await uniStrategy.waitForDeployment();

    // Deploy Vault
    const StableVault = await ethers.getContractFactory("StableVault");
    vault = await StableVault.deploy(asset.target, dummyStrategy.target);
    await vault.waitForDeployment();

    // Setup test tokens
    await asset.mint(user1.address, ethers.parseEther("10000"));
    await asset.mint(user2.address, ethers.parseEther("5000"));
    await asset.connect(user1).approve(vault.target, ethers.parseEther("10000"));
    await asset.connect(user2).approve(vault.target, ethers.parseEther("5000"));
  });

  describe("Strategy Manager", function() {
    it("Should add and manage multiple strategies", async function() {
      // Add strategies to manager
      await strategyManager.addStrategy(dummyStrategy.target, "Dummy Strategy", 500); // 5%
      await strategyManager.addStrategy(uniStrategy.target, "Uniswap V3", 750); // 7.5%

      const strategies = await strategyManager.getAllStrategies();
      expect(strategies.length).to.equal(2);

      const bestStrategy = await strategyManager.getBestStrategy();
      expect(bestStrategy[0]).to.equal(uniStrategy.target);
      expect(bestStrategy[1]).to.equal(750);
    });

    it("Should update APR and find new best strategy", async function() {
      await strategyManager.addStrategy(dummyStrategy.target, "Dummy Strategy", 500);
      await strategyManager.addStrategy(uniStrategy.target, "Uniswap V3", 300);

      let bestStrategy = await strategyManager.getBestStrategy();
      expect(bestStrategy[0]).to.equal(dummyStrategy.target);

      // Update Uniswap strategy to higher APR
      await strategyManager.updateAPR(uniStrategy.target, 800);
      
      bestStrategy = await strategyManager.getBestStrategy();
      expect(bestStrategy[0]).to.equal(uniStrategy.target);
      expect(bestStrategy[1]).to.equal(800);
    });
  });

  describe("Enhanced Vault Operations", function() {
    it("Should handle multiple users and track individual balances", async function() {
      // User 1 deposits
      await vault.connect(user1).deposit(ethers.parseEther("1000"), user1.address);
      expect(await vault.balanceOf(user1.address)).to.be.gt(0);

      // User 2 deposits
      await vault.connect(user2).deposit(ethers.parseEther("500"), user2.address);
      expect(await vault.balanceOf(user2.address)).to.be.gt(0);

      // Check total assets
      expect(await vault.totalAssets()).to.equal(ethers.parseEther("1500"));
    });

    it("Should distribute yields proportionally", async function() {
      // Both users deposit
      await vault.connect(user1).deposit(ethers.parseEther("2000"), user1.address);
      await vault.connect(user2).deposit(ethers.parseEther("1000"), user2.address);

      const user1SharesBefore = await vault.balanceOf(user1.address);
      const user2SharesBefore = await vault.balanceOf(user2.address);

      // Simulate yield by minting tokens to strategy
      await asset.mint(dummyStrategy.target, ethers.parseEther("30")); // 1% yield

      // Harvest should increase share value
      await vault.harvest();

      // Check that users can withdraw more than they deposited (due to yield)
      const user1AssetsAfter = await vault.convertToAssets(user1SharesBefore);
      const user2AssetsAfter = await vault.convertToAssets(user2SharesBefore);

      expect(user1AssetsAfter).to.be.gt(ethers.parseEther("2000"));
      expect(user2AssetsAfter).to.be.gt(ethers.parseEther("1000"));
    });

    it("Should handle strategy switching", async function() {
      await vault.connect(user1).deposit(ethers.parseEther("1000"), user1.address);
      
      const initialAssets = await vault.totalAssets();
      
      // Switch to a new strategy (this would be called by owner when better yields are found)
      await vault.setStrategy(uniStrategy.target);
      
      // Assets should be maintained during strategy switch (may be higher due to yield)
      expect(await vault.totalAssets()).to.be.gte(initialAssets);
    });
  });

  describe("Fee Collection", function() {
    it("Should collect performance fees correctly", async function() {
      await vault.connect(user1).deposit(ethers.parseEther("10000"), user1.address);
      
      const ownerBalanceBefore = await asset.balanceOf(owner.address);
      
      // Simulate significant yield
      await asset.mint(dummyStrategy.target, ethers.parseEther("100")); // 1% yield
      
      await vault.harvest();
      
      const ownerBalanceAfter = await asset.balanceOf(owner.address);
      const feeCollected = ownerBalanceAfter - ownerBalanceBefore;
      
      // Should collect 1% of 100 = 1 token as fee
      expect(feeCollected).to.equal(ethers.parseEther("1"));
    });
  });

  describe("Edge Cases and Security", function() {
    it("Should prevent unauthorized harvesting", async function() {
      await expect(
        vault.connect(user1).harvest()
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Should prevent unauthorized strategy changes", async function() {
      await expect(
        vault.connect(user1).setStrategy(uniStrategy.target)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Should handle zero deposits gracefully", async function() {
      // Zero deposits should be allowed but result in zero shares
      await vault.connect(user1).deposit(0, user1.address);
      expect(await vault.balanceOf(user1.address)).to.equal(0);
    });
  });
});
