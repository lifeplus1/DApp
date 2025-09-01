const hre = require("hardhat");

/**
 * Deploy LiveUniswapV3Strategy to Sepolia with conservative settings
 */

async function main() {
  console.log("🦄 Deploying Live Uniswap V3 Strategy to Sepolia...");
  console.log("===================================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Sepolia USDC (or use a test token)
  const sepoliaUSDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  
  try {
    console.log("🪙 Using Sepolia USDC:", sepoliaUSDC);
    console.log("🌐 Network:", hre.network.name);

    // Deploy with conservative gas settings
    console.log("\n🚀 Deploying LiveUniswapV3Strategy...");
    
    const LiveUniswapV3Strategy = await hre.ethers.getContractFactory("LiveUniswapV3Strategy");
    
    // Deploy with explicit gas settings to prevent hanging
    const strategy = await LiveUniswapV3Strategy.deploy(sepoliaUSDC, {
      gasLimit: 3000000,
      gasPrice: hre.ethers.parseUnits("20", "gwei")
    });
    
    console.log("⏳ Waiting for deployment transaction...");
    await strategy.waitForDeployment();
    
    const strategyAddress = await strategy.getAddress();
    console.log("✅ LiveUniswapV3Strategy deployed to:", strategyAddress);

    // Wait a bit for the contract to be available
    console.log("⏳ Waiting for contract to be available...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Basic verification
    try {
      console.log("\n🔍 Verifying deployment...");
      const strategyInfo = await strategy.getStrategyInfo();
      console.log("📊 Strategy Info:");
      console.log("   Name:", strategyInfo[0]);
      console.log("   Version:", strategyInfo[1]);
      console.log("   Token:", await strategy.token());
    } catch (verifyError) {
      console.warn("⚠️  Could not verify immediately, contract may need more time");
    }

    console.log("\n🎉 SEPOLIA DEPLOYMENT COMPLETE!");
    console.log("================================");
    console.log("🦄 Strategy Address:", strategyAddress);
    console.log("🌐 Network: Sepolia");
    console.log("🔗 Etherscan:", `https://sepolia.etherscan.io/address/${strategyAddress}`);
    
    // Save deployment info
    const deploymentInfo = {
      network: "sepolia",
      LiveUniswapV3Strategy: strategyAddress,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      etherscan: `https://sepolia.etherscan.io/address/${strategyAddress}`
    };
    
    console.log("\n📝 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    return deploymentInfo;

  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    
    // Provide helpful debugging info
    console.log("\n🔧 Troubleshooting Tips:");
    console.log("1. Check your account has enough ETH for gas");
    console.log("2. Verify RPC endpoint is working");
    console.log("3. Try increasing gas limit or gas price");
    console.log("4. Check network connectivity");
    
    throw error;
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
