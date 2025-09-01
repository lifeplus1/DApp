const { ethers } = require("hardhat");

async function main() {
  console.log("🌟 Phase 3 Deployment: CurveStableStrategy Integration");
  console.log("======================================================");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying from account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Configuration - Using mock addresses for testnet (Curve not available on Sepolia)
  const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  const PORTFOLIO_MANAGER = "0x9189d6926e180F77650020f4fF9b4B9efd0a30C9"; // Just deployed
  
  // Mock Curve addresses for Sepolia testnet deployment
  const MOCK_CURVE_POOL = "0x0000000000000000000000000000000000000001";
  const MOCK_CURVE_GAUGE = "0x0000000000000000000000000000000000000002"; 
  const MOCK_CURVE_3LP = "0x0000000000000000000000000000000000000003";
  const MOCK_CRV_TOKEN = "0x0000000000000000000000000000000000000004";
  
  console.log("\n📋 Deployment Configuration:");
  console.log("Asset (USDC):", SEPOLIA_USDC);
  console.log("PortfolioManager:", PORTFOLIO_MANAGER);
  console.log("Curve Pool (Mock):", MOCK_CURVE_POOL);

  try {
    // For testnet, we'll deploy a simplified version that doesn't require actual Curve contracts
    console.log("\n🔨 Deploying CurveStableStrategy (Testnet Version)...");
    
    // First, let's deploy a DummyStrategy to represent Curve strategy
    const DummyStrategy = await ethers.getContractFactory("DummyStrategy");
    const curveStrategy = await DummyStrategy.deploy(
      SEPOLIA_USDC        // Only _asset parameter needed
    );

    await curveStrategy.waitForDeployment();
    const curveStrategyAddress = await curveStrategy.getAddress();

    console.log("✅ CurveStableStrategy (Mock) deployed to:", curveStrategyAddress);

    // Connect to PortfolioManager and add the new strategy
    console.log("\n🔗 Integrating with PortfolioManager...");
    const portfolioManager = await ethers.getContractAt("PortfolioManager", PORTFOLIO_MANAGER);

    // Add Curve strategy with 40% allocation (LiveUniswap has 60%, total = 100%)
    const addStrategyTx = await portfolioManager.addStrategy(
      curveStrategyAddress,
      4000, // 40% allocation
      "Curve 3Pool Stable Strategy"
    );
    await addStrategyTx.wait();
    
    console.log("✅ CurveStableStrategy added to portfolio with 40% allocation");

    // Verify portfolio state
    console.log("\n📊 Portfolio Status:");
    const activeStrategies = await portfolioManager.getActiveStrategies();
    console.log("Total active strategies:", activeStrategies.length);

    for (let i = 0; i < activeStrategies.length; i++) {
      const strategyAddress = activeStrategies[i];
      const strategyInfo = await portfolioManager.getStrategyInfo(strategyAddress);
      console.log(`Strategy ${i + 1}:`, strategyInfo.strategyName);
      console.log(`  Address: ${strategyAddress}`);
      console.log(`  Allocation: ${strategyInfo.targetAllocationBPS}BPS (${strategyInfo.targetAllocationBPS / 100}%)`);
      console.log(`  Active: ${strategyInfo.isActive}`);
    }

    // Check if rebalancing is needed
    const needsRebalancing = await portfolioManager.needsRebalancing();
    console.log("\nRebalancing needed:", needsRebalancing);

    // Get portfolio metrics
    const totalValue = await portfolioManager.getTotalPortfolioValue();
    const weightedAPY = await portfolioManager.calculateWeightedAPY();
    console.log("Total portfolio value:", ethers.formatUnits(totalValue, 6), "USDC");
    console.log("Weighted APY:", weightedAPY.toString(), "BPS");

    // Calculate deployment costs
    const deploymentTx = curveStrategy.deploymentTransaction();
    if (deploymentTx) {
      const receipt = await deploymentTx.wait();
      const gasUsed = receipt.gasUsed;
      const gasPrice = deploymentTx.gasPrice || BigInt("20000000000");
      const totalCost = gasUsed * gasPrice;
      
      console.log("\n💰 Deployment Costs:");
      console.log("Gas used:", gasUsed.toString());
      console.log("Total cost:", ethers.formatEther(totalCost), "ETH");
    }

    // Test portfolio operations
    console.log("\n🧪 Testing Portfolio Operations...");
    
    // Test optimal allocation calculation
    try {
      const optimalAllocations = await portfolioManager.calculateOptimalAllocation();
      console.log("Optimal allocations calculated:", optimalAllocations.map(a => a.toString()));
    } catch (error) {
      console.log("Optimal allocation calculation:", error.message);
    }

    // Test rebalance configuration
    const rebalanceConfig = await portfolioManager.rebalanceConfig();
    console.log("Rebalance threshold:", rebalanceConfig.rebalanceThresholdBPS.toString(), "BPS");
    console.log("Auto-rebalancing enabled:", rebalanceConfig.autoRebalanceEnabled);

    console.log("\n🎉 Phase 3 Multi-Strategy Setup Complete!");
    console.log("==========================================");
    console.log("PortfolioManager:", PORTFOLIO_MANAGER);
    console.log("CurveStableStrategy (Mock):", curveStrategyAddress);
    console.log("Total Strategies: 2 (LiveUniswap V3 60% + Curve 40%)");
    console.log("Status: Ready for multi-strategy yield optimization");

    // Create deployment summary
    const deploymentSummary = {
      phase: "Phase 3 - Multi-Strategy Integration",
      network: "sepolia", 
      timestamp: new Date().toISOString(),
      portfolioManager: PORTFOLIO_MANAGER,
      strategies: {
        "LiveUniswapV3Strategy": {
          address: "0x46375e552F269a90F42CE4746D23FA9d347142CB",
          allocation: "60%",
          status: "active"
        },
        "CurveStableStrategy": {
          address: curveStrategyAddress,
          allocation: "40%", 
          status: "active",
          note: "Testnet mock implementation"
        }
      },
      capabilities: [
        "Multi-strategy allocation",
        "Automated rebalancing", 
        "Yield optimization",
        "Portfolio analytics",
        "Risk management"
      ],
      nextSteps: [
        "Fund portfolio for testing",
        "Test rebalancing operations",
        "Deploy to mainnet with real Curve integration",
        "Add Compound and Aave strategies"
      ]
    };

    console.log("\n📋 Phase 3 Summary:");
    console.log(JSON.stringify(deploymentSummary, null, 2));

    return {
      portfolioManager: PORTFOLIO_MANAGER,
      curveStrategy: curveStrategyAddress,
      totalStrategies: activeStrategies.length
    };

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
