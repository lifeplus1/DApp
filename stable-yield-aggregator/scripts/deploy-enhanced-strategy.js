const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Enhanced Real Yield Strategy Platform...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  try {
    // Deploy Mock USDC
    console.log("\n📍 Step 1: Deploying Mock USDC...");
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const usdc = await ERC20Mock.deploy("Mock USDC", "mUSDC");
    await usdc.waitForDeployment();
    console.log("✅ Mock USDC deployed to:", usdc.target);

    // Deploy Enhanced Real Yield Strategy
    console.log("\n📍 Step 2: Deploying Enhanced Real Yield Strategy...");
    const EnhancedRealYieldStrategy = await ethers.getContractFactory("EnhancedRealYieldStrategy");
    const strategy = await EnhancedRealYieldStrategy.deploy(
      usdc.target,
      deployer.address, // vault address (temporary)
      deployer.address  // owner
    );
    await strategy.waitForDeployment();
    console.log("✅ Enhanced Real Yield Strategy deployed to:", strategy.target);
    
    // Deploy Stable Vault
    console.log("\n📍 Step 3: Deploying Stable Vault...");
    const StableVault = await ethers.getContractFactory("StableVault");
    const vault = await StableVault.deploy(usdc.target, strategy.target);
    await vault.waitForDeployment();
    console.log("✅ Stable Vault deployed to:", vault.target);

    // Initialize strategy performance
    console.log("\n📍 Step 4: Initializing Strategy...");
    const currentAPY = await strategy.getAPY();
    const strategyMetrics = await strategy.getStrategyMetrics();
    
    console.log("📊 Strategy initialized with:");
    console.log(`   - Current APY: ${Number(currentAPY) / 100}%`);
    console.log(`   - Base APY: 8%`);
    console.log(`   - Strategy Name: ${await strategy.name()}`);
    console.log(`   - Active Status: ${await strategy.isActive()}`);

    // Create deployment summary
    const deploymentSummary = {
      network: await ethers.provider.getNetwork(),
      deployer: deployer.address,
      contracts: {
        mockUSDC: usdc.target,
        enhancedStrategy: strategy.target,
        stableVault: vault.target
      },
      performance: {
        currentAPY: `${Number(currentAPY) / 100}%`,
        strategyActive: await strategy.isActive(),
        deploymentTime: new Date().toISOString()
      }
    };

    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log("📋 Deployment Summary:");
    console.log(JSON.stringify(deploymentSummary, null, 2));

    // Save deployment addresses for frontend
    const fs = require('fs');
    const deploymentFile = {
      ...deploymentSummary,
      lastUpdated: new Date().toISOString()
    };
    
    fs.writeFileSync(
      './frontend/src/deployments.json', 
      JSON.stringify(deploymentFile, null, 2)
    );
    console.log("\n✅ Deployment addresses saved to frontend/src/deployments.json");

    // Verify strategy functionality
    console.log("\n🧪 Testing Strategy Functionality...");
    
    // Mint some tokens for testing
    await usdc.mint(deployer.address, ethers.parseUnits("1000", 18));
    console.log("✅ Minted 1000 USDC for testing");
    
    // Test strategy metrics
    const metrics = await strategy.getStrategyMetrics();
    console.log("📊 Strategy Metrics:");
    console.log(`   - Total Deposits: ${ethers.formatUnits(metrics[0], 18)} USDC`);
    console.log(`   - Total Yield: ${ethers.formatUnits(metrics[1], 18)} USDC`);
    console.log(`   - Current APY: ${Number(metrics[2]) / 100}%`);
    console.log(`   - Harvest Count: ${metrics[3]}`);

    console.log("\n🚀 Enhanced Real Yield Strategy Platform Ready!");
    console.log("💡 Next Steps:");
    console.log("   1. Update frontend with new contract addresses");
    console.log("   2. Test 21% APY generation over time");
    console.log("   3. Integrate with real Uniswap V3 pools");
    console.log("   4. Launch community testing");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
