const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Phase 3 Deployment: PortfolioManager to Sepolia");
  console.log("=====================================================");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying from account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Configuration
  const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Sepolia USDC
  
  console.log("\n📋 Deployment Configuration:");
  console.log("Asset (USDC):", SEPOLIA_USDC);
  console.log("Owner:", deployer.address);

  try {
    // Deploy PortfolioManager
    console.log("\n🔨 Deploying PortfolioManager...");
    const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
    
    const portfolioManager = await PortfolioManager.deploy(
      SEPOLIA_USDC,        // asset
      deployer.address     // initial owner
    );

    await portfolioManager.waitForDeployment();
    const portfolioManagerAddress = await portfolioManager.getAddress();

    console.log("✅ PortfolioManager deployed to:", portfolioManagerAddress);

    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    const asset = await portfolioManager.asset();
    const owner = await portfolioManager.owner();
    const activeStrategyCount = await portfolioManager.activeStrategyCount();
    const rebalanceConfig = await portfolioManager.rebalanceConfig();

    console.log("Asset address:", asset);
    console.log("Owner address:", owner);
    console.log("Active strategy count:", activeStrategyCount.toString());
    console.log("Rebalance threshold:", rebalanceConfig.rebalanceThresholdBPS.toString(), "BPS");
    console.log("Max slippage:", rebalanceConfig.maxSlippageBPS.toString(), "BPS");
    console.log("Auto-rebalance enabled:", rebalanceConfig.autoRebalanceEnabled);

    // Get existing LiveUniswapV3Strategy for integration
    const LIVE_STRATEGY = "0x46375e552F269a90F42CE4746D23FA9d347142CB";
    console.log("\n🔗 Integration with existing Phase 2 contracts:");
    console.log("LiveUniswapV3Strategy:", LIVE_STRATEGY);

    // Add LiveUniswapV3Strategy as first strategy (60% allocation)
    console.log("\n📈 Adding LiveUniswapV3Strategy to portfolio...");
    try {
      const addStrategyTx = await portfolioManager.addStrategy(
        LIVE_STRATEGY,
        6000, // 60% allocation
        "Live Uniswap V3 USDC Strategy"
      );
      await addStrategyTx.wait();
      console.log("✅ LiveUniswapV3Strategy added with 60% allocation");

      // Verify strategy was added
      const strategyInfo = await portfolioManager.getStrategyInfo(LIVE_STRATEGY);
      console.log("Strategy name:", strategyInfo.strategyName);
      console.log("Target allocation:", strategyInfo.targetAllocationBPS.toString(), "BPS");
      console.log("Strategy active:", strategyInfo.isActive);

      const activeStrategies = await portfolioManager.getActiveStrategies();
      console.log("Total active strategies:", activeStrategies.length);

    } catch (error) {
      console.log("⚠️ Could not add LiveUniswapV3Strategy (may need manual integration):", error.message);
    }

    // Calculate gas costs
    const deploymentTx = portfolioManager.deploymentTransaction();
    if (deploymentTx) {
      const receipt = await deploymentTx.wait();
      const gasUsed = receipt.gasUsed;
      const gasPrice = deploymentTx.gasPrice || BigInt("20000000000"); // 20 gwei default
      const totalCost = gasUsed * gasPrice;
      
      console.log("\n💰 Deployment Costs:");
      console.log("Gas used:", gasUsed.toString());
      console.log("Gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
      console.log("Total cost:", ethers.formatEther(totalCost), "ETH");
    }

    // Final summary
    console.log("\n🎉 Phase 3 PortfolioManager Deployment Complete!");
    console.log("================================================");
    console.log("PortfolioManager Address:", portfolioManagerAddress);
    console.log("Network: Sepolia Testnet");
    console.log("Status: Ready for multi-strategy integration");
    console.log("Next Steps: Deploy CurveStableStrategy and begin portfolio management");
    
    // Save deployment info
    const deploymentInfo = {
      network: "sepolia",
      timestamp: new Date().toISOString(),
      contracts: {
        PortfolioManager: portfolioManagerAddress,
        asset: SEPOLIA_USDC,
        owner: deployer.address
      },
      phase: "Phase 3 - Multi-Strategy Portfolio Management",
      status: "deployed",
      integrations: {
        LiveUniswapV3Strategy: LIVE_STRATEGY
      }
    };

    console.log("\n📋 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    return {
      portfolioManager: portfolioManagerAddress,
      deployer: deployer.address
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
