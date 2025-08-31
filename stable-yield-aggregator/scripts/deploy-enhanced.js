const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("=== Stablecoin Yield Aggregator Deployment ===");
  console.log("Deploying with account:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
  console.log("");

  // Step 1: Deploy Mock USDC for testing (skip on mainnet)
  let usdcAddress;
  if (hre.network.name === "mainnet") {
    usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // Real USDC
    console.log("Using real USDC on mainnet:", usdcAddress);
  } else {
    console.log("📄 Deploying Mock USDC...");
    const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    const mockUSDC = await ERC20Mock.deploy("Mock USDC", "mUSDC");
    await mockUSDC.waitForDeployment();
    usdcAddress = await mockUSDC.getAddress();
    console.log("✅ Mock USDC deployed:", usdcAddress);
    
    // Mint test tokens
    await mockUSDC.mint(deployer.address, hre.ethers.parseEther("100000"));
    console.log("💰 Minted 100,000 mUSDC to deployer");
  }

  // Step 2: Deploy Strategy Manager
  console.log("\n📄 Deploying Strategy Manager...");
  const StrategyManager = await hre.ethers.getContractFactory("StrategyManager");
  const strategyManager = await StrategyManager.deploy();
  await strategyManager.waitForDeployment();
  console.log("✅ Strategy Manager deployed:", await strategyManager.getAddress());

  // Step 3: Deploy Dummy Strategy (for initial testing)
  console.log("\n📄 Deploying Dummy Strategy...");
  const DummyStrategy = await hre.ethers.getContractFactory("DummyStrategy");
  const dummyStrategy = await DummyStrategy.deploy(usdcAddress);
  await dummyStrategy.waitForDeployment();
  console.log("✅ Dummy Strategy deployed:", await dummyStrategy.getAddress());

  // Step 4: Deploy Main Vault
  console.log("\n📄 Deploying Stable Vault...");
  const StableVault = await hre.ethers.getContractFactory("StableVault");
  const vault = await StableVault.deploy(usdcAddress, await dummyStrategy.getAddress());
  await vault.waitForDeployment();
  console.log("✅ Stable Vault deployed:", await vault.getAddress());

  // Step 5: Add strategy to manager
  console.log("\n🔧 Configuring Strategy Manager...");
  await strategyManager.addStrategy(
    await dummyStrategy.getAddress(),
    "Dummy Strategy",
    500 // 5% APR in basis points
  );
  console.log("✅ Added Dummy Strategy to manager");

  // Step 6: Create deployment summary
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      mockUSDC: hre.network.name !== "mainnet" ? usdcAddress : null,
      realUSDC: hre.network.name === "mainnet" ? usdcAddress : null,
      strategyManager: await strategyManager.getAddress(),
      dummyStrategy: await dummyStrategy.getAddress(),
      stableVault: await vault.getAddress()
    },
    gasUsed: "Estimated", // Could track actual gas used
    timestamp: new Date().toISOString()
  };

  console.log("\n=== 🎉 DEPLOYMENT COMPLETE ===");
  console.log("📋 Contract Addresses:");
  console.log("   USDC Token:", usdcAddress);
  console.log("   Strategy Manager:", await strategyManager.getAddress());
  console.log("   Dummy Strategy:", await dummyStrategy.getAddress());
  console.log("   Stable Vault:", await vault.getAddress());
  console.log("\n📝 Next Steps:");
  console.log("1. Update frontend with contract addresses");
  console.log("2. Verify contracts on Etherscan");
  console.log("3. Add liquidity for testing");
  console.log("4. Deploy additional strategies");

  // Save deployment info
  const fs = require('fs');
  const deploymentPath = `./deployments/${hre.network.name}-deployment.json`;
  fs.mkdirSync('./deployments', { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
