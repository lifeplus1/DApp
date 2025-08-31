const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🚀 Deploying Advanced DeFi Architecture...");
  console.log("👤 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Get existing contract addresses from previous deployment
  const MOCK_USDC = "0x3F2178618013EeFE109857aB3eC83049C90968bA";
  const VAULT = "0xc40Ddb079330D8E53245DF51A245BC42BA5cd74c";

  console.log("\n📦 Deploying Enhanced UniswapV3 Strategy...");
  
  // Deploy Enhanced UniswapV3Strategy
  const UniswapV3Strategy = await ethers.getContractFactory("UniswapV3Strategy");
  const uniswapStrategy = await UniswapV3Strategy.deploy(
    MOCK_USDC, // asset
    VAULT,     // vault
    deployer.address // initial owner
  );
  await uniswapStrategy.waitForDeployment();
  const uniswapStrategyAddress = await uniswapStrategy.getAddress();
  console.log("✅ Enhanced UniswapV3Strategy deployed to:", uniswapStrategyAddress);

  console.log("\n🧠 Deploying Advanced Yield Optimizer...");
  
  // Deploy YieldOptimizer
  const YieldOptimizer = await ethers.getContractFactory("YieldOptimizer");
  const yieldOptimizer = await YieldOptimizer.deploy(deployer.address); // Pass initial owner
  await yieldOptimizer.waitForDeployment();
  const yieldOptimizerAddress = await yieldOptimizer.getAddress();
  console.log("✅ Advanced Yield Optimizer deployed to:", yieldOptimizerAddress);

  console.log("\n⚙️  Configuring Advanced Architecture...");

  // Add strategies to the yield optimizer
  await yieldOptimizer.addStrategy(uniswapStrategyAddress, {
    gasLimit: 500000
  });
  console.log("✅ Enhanced UniswapV3Strategy added to Yield Optimizer");

  // Update strategy with current metrics
  await yieldOptimizer.updateStrategyMetrics(uniswapStrategyAddress, {
    gasLimit: 300000
  });
  console.log("✅ Strategy metrics updated");

  console.log("\n🎯 Advanced Architecture Deployment Summary:");
  console.log("==========================================");
  console.log("🏦 Vault (existing):", VAULT);
  console.log("💎 Mock USDC (existing):", MOCK_USDC);
  console.log("🔄 Enhanced UniswapV3Strategy:", uniswapStrategyAddress);
  console.log("🧠 Advanced Yield Optimizer:", yieldOptimizerAddress);
  console.log("==========================================");

  console.log("\n✨ Enterprise-Grade DeFi Platform Features:");
  console.log("• Intelligent yield routing with risk-adjusted scoring");
  console.log("• Automated rebalancing with configurable thresholds");
  console.log("• Real-time performance tracking and analytics");
  console.log("• Advanced strategy reliability monitoring");
  console.log("• TypeScript integration with bulletproof type safety");
  console.log("• Professional React UI components");
  console.log("• Enterprise-grade error handling and state management");

  console.log("\n🚀 Ready for long-term competitive advantage!");

  // Return deployment info for frontend integration
  return {
    vault: VAULT,
    mockUSDC: MOCK_USDC,
    enhancedUniswapStrategy: uniswapStrategyAddress,
    yieldOptimizer: yieldOptimizerAddress,
    deployerAddress: deployer.address
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
