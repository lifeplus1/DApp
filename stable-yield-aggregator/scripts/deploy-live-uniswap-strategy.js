const hre = require("hardhat");

/**
 * Deploy Live Uniswap V3 Strategy - Real yield generation
 * 
 * This script deploys the LiveUniswapV3Strategy contract that provides
 * actual yields through real Uniswap V3 liquidity provision.
 */

async function main() {
  console.log("🦄 Deploying Live Uniswap V3 Strategy...");
  console.log("=====================================");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  // Get account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Token addresses for different networks
  const tokenAddresses = {
    hardhat: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Mock USDC
    sepolia: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia USDC
    mainnet: "0xA0b86a33E6417aB9ad1Fc8fd9C6E6f39eff2b5c8" // Mainnet USDC
  };

  const networkName = hre.network.name;
  const tokenAddress = tokenAddresses[networkName];
  
  if (!tokenAddress) {
    throw new Error(`❌ No token address configured for network: ${networkName}`);
  }
  
  console.log("🪙 Using token address:", tokenAddress);
  console.log("🌐 Network:", networkName);

  try {
    // Deploy LiveUniswapV3Strategy
    console.log("\n🚀 Deploying LiveUniswapV3Strategy...");
    
    const LiveUniswapV3Strategy = await hre.ethers.getContractFactory("LiveUniswapV3Strategy");
    const strategy = await LiveUniswapV3Strategy.deploy(tokenAddress);
    
    await strategy.waitForDeployment();
    const strategyAddress = await strategy.getAddress();
    
    console.log("✅ LiveUniswapV3Strategy deployed to:", strategyAddress);

    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    
    const strategyInfo = await strategy.getStrategyInfo();
    const totalValue = await strategy.getTotalValue();
    const currentAPY = await strategy.getAPY();
    
    console.log("📊 Strategy Info:");
    console.log("   Name:", strategyInfo[0]);
    console.log("   Version:", strategyInfo[1]);
    console.log("   Total Value:", hre.ethers.formatUnits(totalValue, 6), "USDC");
    console.log("   Current APY:", (Number(currentAPY) / 1e16).toFixed(2), "%");

    // Deploy StableVault with new strategy
    console.log("\n🏦 Deploying StableVault with Live Strategy...");
    
    const StableVault = await hre.ethers.getContractFactory("StableVault");
    const vault = await StableVault.deploy(tokenAddress, strategyAddress);
    
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    
    console.log("✅ StableVault deployed to:", vaultAddress);

    // The strategy is already connected via constructor
    console.log("✅ Strategy connected to vault via constructor");

    // Save deployment information
    const deployment = {
      network: networkName,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        LiveUniswapV3Strategy: {
          address: strategyAddress,
          name: strategyInfo[0],
          version: strategyInfo[1],
          tokenAddress: tokenAddress
        },
        StableVault: {
          address: vaultAddress,
          connectedStrategy: strategyAddress
        }
      },
      verification: {
        strategyName: strategyInfo[0],
        strategyVersion: strategyInfo[1],
        initialAPY: (Number(currentAPY) / 1e16).toFixed(2) + "%",
        totalValue: hre.ethers.formatUnits(totalValue, 6) + " USDC"
      }
    };

    // Write deployment to file
    const fs = require('fs');
    const deploymentFile = `deployments/${networkName}-live-uniswap-deployment.json`;
    fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
    
    console.log("\n💾 Deployment saved to:", deploymentFile);

    // Update main deployment file
    let mainDeployment = {};
    const mainDeploymentFile = `deployments/${networkName}-deployment.json`;
    
    if (fs.existsSync(mainDeploymentFile)) {
      mainDeployment = JSON.parse(fs.readFileSync(mainDeploymentFile, 'utf8'));
    }
    
    mainDeployment.LiveUniswapV3Strategy = strategyAddress;
    mainDeployment.StableVault = vaultAddress;
    mainDeployment.lastUpdated = new Date().toISOString();
    
    fs.writeFileSync(mainDeploymentFile, JSON.stringify(mainDeployment, null, 2));
    
    console.log("💾 Main deployment updated:", mainDeploymentFile);

    // Display success message
    console.log("\n🎉 LIVE UNISWAP V3 STRATEGY DEPLOYMENT COMPLETE!");
    console.log("================================================");
    console.log("🦄 Live Strategy:", strategyAddress);
    console.log("🏦 Vault:", vaultAddress);
    console.log("🌐 Network:", networkName);
    console.log("📈 Ready for real yield generation!");
    
    if (networkName === 'sepolia') {
      console.log("\n🔗 Sepolia Etherscan Links:");
      console.log("   Strategy:", `https://sepolia.etherscan.io/address/${strategyAddress}`);
      console.log("   Vault:", `https://sepolia.etherscan.io/address/${vaultAddress}`);
    }

    console.log("\n🚀 Next Steps:");
    console.log("1. Update frontend with new contract addresses");
    console.log("2. Test deposits and withdrawals");
    console.log("3. Monitor real yield generation");
    console.log("4. Deploy to mainnet when ready");

    return {
      liveStrategy: strategyAddress,
      vault: vaultAddress,
      network: networkName
    };

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

// Execute deployment
if (require.main === module) {
  main()
    .then((_result) => {
      console.log("\n✅ Deployment completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Deployment failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
