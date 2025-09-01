const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("PortfolioManager - Phase 3 Multi-Strategy Tests", function () {
  // Test fixture for contract deployment
  async function deployPortfolioFixture() {
    const [owner, user, rebalancer, emergencyOp] = await ethers.getSigners();

    // Deploy mock USDC token
    const MockToken = await ethers.getContractFactory("MockToken");
    const usdc = await MockToken.deploy("USD Coin", "USDC", 6);

    // Deploy mock strategies
    const DummyStrategy = await ethers.getContractFactory("DummyStrategy");
    const strategy1 = await DummyStrategy.deploy(await usdc.getAddress());
    const strategy2 = await DummyStrategy.deploy(await usdc.getAddress());
    const strategy3 = await DummyStrategy.deploy(await usdc.getAddress());

    // Deploy PortfolioManager
    const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
    const portfolioManager = await PortfolioManager.deploy(
      await usdc.getAddress(),
      owner.address
    );

    // Setup initial balances
    await usdc.mint(owner.address, ethers.parseUnits("100000", 6));
    await usdc.mint(user.address, ethers.parseUnits("10000", 6));
    await usdc.mint(await portfolioManager.getAddress(), ethers.parseUnits("50000", 6));

    return {
      portfolioManager,
      usdc,
      strategy1,
      strategy2,
      strategy3,
      owner,
      user,
      rebalancer,
      emergencyOp
    };
  }

  describe("Deployment and Initialization", function () {
    it("Should deploy with correct initial configuration", async function () {
      const { portfolioManager, usdc, owner } = await loadFixture(deployPortfolioFixture);

      expect(await portfolioManager.asset()).to.equal(await usdc.getAddress());
      expect(await portfolioManager.owner()).to.equal(owner.address);
      expect(await portfolioManager.activeStrategyCount()).to.equal(0);

      const rebalanceConfig = await portfolioManager.rebalanceConfig();
      expect(rebalanceConfig.rebalanceThresholdBPS).to.equal(500); // 5%
      expect(rebalanceConfig.maxSlippageBPS).to.equal(100); // 1%
      expect(rebalanceConfig.autoRebalanceEnabled).to.be.true;
    });

    it("Should initialize portfolio metrics correctly", async function () {
      const { portfolioManager } = await loadFixture(deployPortfolioFixture);

      const metrics = await portfolioManager.portfolioMetrics();
      expect(metrics.totalValue).to.equal(0);
      expect(metrics.weightedAPY).to.equal(0);
      expect(metrics.rebalanceCount).to.equal(0);
      expect(metrics.totalYieldGenerated).to.equal(0);
    });
  });

  describe("Strategy Management", function () {
    it("Should add strategies correctly", async function () {
      const { portfolioManager, strategy1, strategy2, owner } = await loadFixture(deployPortfolioFixture);

      // Add first strategy with 60% allocation
      await expect(
        portfolioManager.connect(owner).addStrategy(
          await strategy1.getAddress(),
          6000, // 60%
          "Test Strategy 1"
        )
      ).to.emit(portfolioManager, "StrategyAdded")
        .withArgs(await strategy1.getAddress(), 6000, "Test Strategy 1");

      // Add second strategy with 40% allocation
      await expect(
        portfolioManager.connect(owner).addStrategy(
          await strategy2.getAddress(),
          4000, // 40%
          "Test Strategy 2"
        )
      ).to.emit(portfolioManager, "StrategyAdded")
        .withArgs(await strategy2.getAddress(), 4000, "Test Strategy 2");

      expect(await portfolioManager.activeStrategyCount()).to.equal(2);

      const activeStrategies = await portfolioManager.getActiveStrategies();
      expect(activeStrategies.length).to.equal(2);
      expect(activeStrategies[0]).to.equal(await strategy1.getAddress());
      expect(activeStrategies[1]).to.equal(await strategy2.getAddress());
    });

    it("Should prevent adding strategies with invalid allocations", async function () {
      const { portfolioManager, strategy1, strategy2, strategy3, owner } = await loadFixture(deployPortfolioFixture);

      // Add strategies totaling 100%
      await portfolioManager.connect(owner).addStrategy(
        await strategy1.getAddress(),
        6000,
        "Strategy 1"
      );
      await portfolioManager.connect(owner).addStrategy(
        await strategy2.getAddress(),
        4000,
        "Strategy 2"
      );

      // Try to add another strategy that would exceed 100%
      await expect(
        portfolioManager.connect(owner).addStrategy(
          await strategy3.getAddress(),
          1000, // This would make total 110%
          "Strategy 3"
        )
      ).to.be.revertedWith("Total allocation exceeds 100%");
    });

    it("Should update strategy allocations", async function () {
      const { portfolioManager, strategy1, owner } = await loadFixture(deployPortfolioFixture);

      await portfolioManager.connect(owner).addStrategy(
        await strategy1.getAddress(),
        5000,
        "Test Strategy"
      );

      // Update allocation
      await expect(
        portfolioManager.connect(owner).updateStrategyAllocation(
          await strategy1.getAddress(),
          7000
        )
      ).to.emit(portfolioManager, "StrategyUpdated")
        .withArgs(await strategy1.getAddress(), 7000);

      const strategyInfo = await portfolioManager.getStrategyInfo(await strategy1.getAddress());
      expect(strategyInfo.targetAllocationBPS).to.equal(7000);
    });

    it("Should remove strategies correctly", async function () {
      const { portfolioManager, strategy1, strategy2, owner } = await loadFixture(deployPortfolioFixture);

      await portfolioManager.connect(owner).addStrategy(
        await strategy1.getAddress(),
        6000,
        "Strategy 1"
      );
      await portfolioManager.connect(owner).addStrategy(
        await strategy2.getAddress(),
        4000,
        "Strategy 2"
      );

      // Remove strategy
      await expect(
        portfolioManager.connect(owner).removeStrategy(await strategy1.getAddress())
      ).to.emit(portfolioManager, "StrategyRemoved")
        .withArgs(await strategy1.getAddress());

      expect(await portfolioManager.activeStrategyCount()).to.equal(1);
      const activeStrategies = await portfolioManager.getActiveStrategies();
      expect(activeStrategies[0]).to.equal(await strategy2.getAddress());
    });

    it("Should prevent non-owner from managing strategies", async function () {
      const { portfolioManager, strategy1, user } = await loadFixture(deployPortfolioFixture);

      await expect(
        portfolioManager.connect(user).addStrategy(
          await strategy1.getAddress(),
          5000,
          "Unauthorized Strategy"
        )
      ).to.be.revertedWithCustomError(portfolioManager, "OwnableUnauthorizedAccount");
    });
  });

  describe("Portfolio Calculations", function () {
    it("Should calculate total portfolio value correctly", async function () {
      const { portfolioManager, usdc, strategy1, strategy2, owner } = await loadFixture(deployPortfolioFixture);

      // Add strategies
      await portfolioManager.connect(owner).addStrategy(
        await strategy1.getAddress(),
        6000,
        "Strategy 1"
      );
      await portfolioManager.connect(owner).addStrategy(
        await strategy2.getAddress(),
        4000,
        "Strategy 2"
      );

      // Fund strategies with some deposits
      await usdc.connect(owner).approve(await strategy1.getAddress(), ethers.parseUnits("1000", 6));
      await strategy1.connect(owner).deposit(ethers.parseUnits("1000", 6), owner.address);

      await usdc.connect(owner).approve(await strategy2.getAddress(), ethers.parseUnits("500", 6));
      await strategy2.connect(owner).deposit(ethers.parseUnits("500", 6), owner.address);

      const totalValue = await portfolioManager.getTotalPortfolioValue();
      
      // Should include strategy balances plus unallocated portfolio manager balance
      const expectedValue = ethers.parseUnits("1500", 6) + await usdc.balanceOf(await portfolioManager.getAddress());
      expect(totalValue).to.be.closeTo(expectedValue, ethers.parseUnits("1", 6)); // Allow 1 USDC tolerance
    });

    it("Should calculate weighted APY correctly", async function () {
      const { portfolioManager, usdc, strategy1, strategy2, owner } = await loadFixture(deployPortfolioFixture);

      // Add strategies with different APYs
      await portfolioManager.connect(owner).addStrategy(
        await strategy1.getAddress(),
        6000,
        "High APY Strategy"
      );
      await portfolioManager.connect(owner).addStrategy(
        await strategy2.getAddress(),
        4000,
        "Low APY Strategy"
      );

      // Fund the strategies
      await usdc.connect(owner).approve(await strategy1.getAddress(), ethers.parseUnits("6000", 6));
      await strategy1.connect(owner).deposit(ethers.parseUnits("6000", 6), owner.address);

      await usdc.connect(owner).approve(await strategy2.getAddress(), ethers.parseUnits("4000", 6));
      await strategy2.connect(owner).deposit(ethers.parseUnits("4000", 6), owner.address);

      const weightedAPY = await portfolioManager.calculateWeightedAPY();
      
      // Should be between the individual strategy APYs
      expect(weightedAPY).to.be.gt(0);
      expect(weightedAPY).to.be.lt(3000); // Should be reasonable APY
    });

    it("Should detect when rebalancing is needed", async function () {
      const { portfolioManager, usdc, strategy1, strategy2, owner } = await loadFixture(deployPortfolioFixture);

      // Add strategies with 50/50 allocation
      await portfolioManager.connect(owner).addStrategy(
        await strategy1.getAddress(),
        5000,
        "Strategy 1"
      );
      await portfolioManager.connect(owner).addStrategy(
        await strategy2.getAddress(),
        5000,
        "Strategy 2"
      );

      // Create imbalanced allocation by funding only one strategy
      await usdc.connect(owner).approve(await strategy1.getAddress(), ethers.parseUnits("10000", 6));
      await strategy1.connect(owner).deposit(ethers.parseUnits("10000", 6), owner.address);

      const needsRebalancing = await portfolioManager.needsRebalancing();
      expect(needsRebalancing).to.be.true;
    });
  });

  describe("Rebalancing Operations", function () {
    it("Should rebalance portfolio correctly", async function () {
      const { portfolioManager, usdc, strategy1, strategy2, owner, rebalancer } = await loadFixture(deployPortfolioFixture);

      // Add rebalancer authorization
      await portfolioManager.connect(owner).addRebalancer(rebalancer.address);

      // Add strategies
      await portfolioManager.connect(owner).addStrategy(
        await strategy1.getAddress(),
        5000,
        "Strategy 1"
      );
      await portfolioManager.connect(owner).addStrategy(
        await strategy2.getAddress(),
        5000,
        "Strategy 2"
      );

      // Create initial imbalanced state
      await usdc.connect(owner).approve(await strategy1.getAddress(), ethers.parseUnits("8000", 6));
      await strategy1.connect(owner).deposit(ethers.parseUnits("8000", 6), owner.address);

      // Fund portfolio manager for rebalancing
      await usdc.connect(owner).transfer(await portfolioManager.getAddress(), ethers.parseUnits("2000", 6));

      // Perform rebalancing
      await expect(
        portfolioManager.connect(rebalancer).rebalancePortfolio()
      ).to.emit(portfolioManager, "PortfolioRebalanced");

      // Check that portfolioMetrics were updated
      const metrics = await portfolioManager.portfolioMetrics();
      expect(metrics.rebalanceCount).to.equal(1);
    });

    it("Should prevent unauthorized rebalancing", async function () {
      const { portfolioManager, user } = await loadFixture(deployPortfolioFixture);

      await expect(
        portfolioManager.connect(user).rebalancePortfolio()
      ).to.be.revertedWith("Not authorized to rebalance");
    });

    it("Should respect minimum rebalance interval", async function () {
      const { portfolioManager, owner, rebalancer } = await loadFixture(deployPortfolioFixture);

      await portfolioManager.connect(owner).addRebalancer(rebalancer.address);

      // First rebalance
      await portfolioManager.connect(rebalancer).rebalancePortfolio();

      // Immediate second rebalance should fail
      await expect(
        portfolioManager.connect(rebalancer).rebalancePortfolio()
      ).to.be.revertedWith("Rebalance too frequent");
    });
  });

  describe("Yield Harvesting", function () {
    it("Should harvest yield from all strategies", async function () {
      const { portfolioManager, strategy1, strategy2, owner, rebalancer } = await loadFixture(deployPortfolioFixture);

      await portfolioManager.connect(owner).addRebalancer(rebalancer.address);

      // Add strategies
      await portfolioManager.connect(owner).addStrategy(
        await strategy1.getAddress(),
        5000,
        "Strategy 1"
      );
      await portfolioManager.connect(owner).addStrategy(
        await strategy2.getAddress(),
        5000,
        "Strategy 2"
      );

      // Harvest yield
      await expect(
        portfolioManager.connect(rebalancer).harvestAllStrategies()
      ).to.emit(portfolioManager, "YieldHarvested");
    });
  });

  describe("Emergency Operations", function () {
    it("Should allow emergency pause of strategies", async function () {
      const { portfolioManager, strategy1, owner, emergencyOp } = await loadFixture(deployPortfolioFixture);

      // Add strategy
      await portfolioManager.connect(owner).addStrategy(
        await strategy1.getAddress(),
        5000,
        "Test Strategy"
      );

      // Add emergency operator
      await portfolioManager.connect(owner).setVariable("emergencyOperators", emergencyOp.address, true);

      // Emergency pause strategy
      await expect(
        portfolioManager.connect(emergencyOp).emergencyPauseStrategy(await strategy1.getAddress())
      ).to.emit(portfolioManager, "EmergencyPause")
        .withArgs(await strategy1.getAddress(), emergencyOp.address);

      const strategyInfo = await portfolioManager.getStrategyInfo(await strategy1.getAddress());
      expect(strategyInfo.isEmergencyPaused).to.be.true;
    });
  });

  describe("Configuration Updates", function () {
    it("Should update rebalance configuration", async function () {
      const { portfolioManager, owner } = await loadFixture(deployPortfolioFixture);

      await expect(
        portfolioManager.connect(owner).updateRebalanceConfig(1000, 200)
      ).to.emit(portfolioManager, "RebalanceConfigUpdated")
        .withArgs(1000, 200);

      const config = await portfolioManager.rebalanceConfig();
      expect(config.rebalanceThresholdBPS).to.equal(1000);
      expect(config.maxSlippageBPS).to.equal(200);
    });

    it("Should reject invalid configuration values", async function () {
      const { portfolioManager, owner } = await loadFixture(deployPortfolioFixture);

      // Too high threshold
      await expect(
        portfolioManager.connect(owner).updateRebalanceConfig(2500, 100)
      ).to.be.revertedWith("Threshold too high");

      // Too high slippage
      await expect(
        portfolioManager.connect(owner).updateRebalanceConfig(500, 600)
      ).to.be.revertedWith("Slippage too high");
    });
  });

  describe("View Functions", function () {
    it("Should return strategy information correctly", async function () {
      const { portfolioManager, strategy1, owner } = await loadFixture(deployPortfolioFixture);

      await portfolioManager.connect(owner).addStrategy(
        await strategy1.getAddress(),
        6000,
        "Test Strategy"
      );

      const strategyInfo = await portfolioManager.getStrategyInfo(await strategy1.getAddress());
      expect(strategyInfo.strategyAddress).to.equal(await strategy1.getAddress());
      expect(strategyInfo.targetAllocationBPS).to.equal(6000);
      expect(strategyInfo.strategyName).to.equal("Test Strategy");
      expect(strategyInfo.isActive).to.be.true;
    });

    it("Should return active strategies list", async function () {
      const { portfolioManager, strategy1, strategy2, owner } = await loadFixture(deployPortfolioFixture);

      await portfolioManager.connect(owner).addStrategy(
        await strategy1.getAddress(),
        5000,
        "Strategy 1"
      );
      await portfolioManager.connect(owner).addStrategy(
        await strategy2.getAddress(),
        5000,
        "Strategy 2"
      );

      const activeStrategies = await portfolioManager.getActiveStrategies();
      expect(activeStrategies.length).to.equal(2);
      expect(activeStrategies).to.include(await strategy1.getAddress());
      expect(activeStrategies).to.include(await strategy2.getAddress());
    });

    it("Should calculate optimal allocation correctly", async function () {
      const { portfolioManager, strategy1, strategy2, owner } = await loadFixture(deployPortfolioFixture);

      await portfolioManager.connect(owner).addStrategy(
        await strategy1.getAddress(),
        5000,
        "Strategy 1"
      );
      await portfolioManager.connect(owner).addStrategy(
        await strategy2.getAddress(),
        5000,
        "Strategy 2"
      );

      const optimalAllocations = await portfolioManager.calculateOptimalAllocation();
      expect(optimalAllocations.length).to.equal(2);
      
      // Sum should equal 10000 (100%)
      const totalAllocation = optimalAllocations.reduce((sum, allocation) => sum + Number(allocation), 0);
      expect(totalAllocation).to.be.closeTo(10000, 100); // Allow small deviation
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete portfolio lifecycle", async function () {
      const { portfolioManager, usdc, strategy1, strategy2, owner, rebalancer } = await loadFixture(deployPortfolioFixture);

      // Setup
      await portfolioManager.connect(owner).addRebalancer(rebalancer.address);

      // Add strategies
      await portfolioManager.connect(owner).addStrategy(
        await strategy1.getAddress(),
        6000,
        "Primary Strategy"
      );
      await portfolioManager.connect(owner).addStrategy(
        await strategy2.getAddress(),
        4000,
        "Secondary Strategy"
      );

      // Initial funding
      await usdc.connect(owner).transfer(await portfolioManager.getAddress(), ethers.parseUnits("10000", 6));

      // Rebalance to achieve target allocation
      await portfolioManager.connect(rebalancer).rebalancePortfolio();

      // Harvest yield
      await portfolioManager.connect(rebalancer).harvestAllStrategies();

      // Check final state
      const totalValue = await portfolioManager.getTotalPortfolioValue();
      const weightedAPY = await portfolioManager.calculateWeightedAPY();
      const metrics = await portfolioManager.portfolioMetrics();

      expect(totalValue).to.be.gt(0);
      expect(weightedAPY).to.be.gt(0);
      expect(metrics.rebalanceCount).to.equal(1);
    });

    it("Should handle strategy failures gracefully", async function () {
      const { portfolioManager, strategy1, owner, rebalancer } = await loadFixture(deployPortfolioFixture);

      await portfolioManager.connect(owner).addRebalancer(rebalancer.address);
      await portfolioManager.connect(owner).addStrategy(
        await strategy1.getAddress(),
        5000,
        "Test Strategy"
      );

      // Emergency pause strategy
      await portfolioManager.connect(owner).emergencyPauseStrategy(await strategy1.getAddress());

      // Harvest should continue working even with paused strategy
      await expect(
        portfolioManager.connect(rebalancer).harvestAllStrategies()
      ).not.to.be.reverted;
    });
  });
});
