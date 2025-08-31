const hre = require("hardhat");
require("dotenv").config();

async function main() {
  try {
    console.log("🔍 Debugging Environment Variables...\n");
    
    console.log("DEBUG - SEPOLIA_RPC_URL:", process.env.SEPOLIA_RPC_URL);
    console.log("DEBUG - PRIVATE_KEY exists:", !!process.env.PRIVATE_KEY);
    console.log("DEBUG - PRIVATE_KEY length:", process.env.PRIVATE_KEY?.length);
    
    // Check if .env is configured
    if (!process.env.SEPOLIA_RPC_URL || !process.env.PRIVATE_KEY) {
      console.log("❌ Environment not configured!");
      console.log("Please edit .env file with:");
      console.log("- SEPOLIA_RPC_URL=your_rpc_url");
      console.log("- PRIVATE_KEY=your_private_key");
      return;
    }

    // Test connection to Sepolia
    console.log("Testing connection to:", process.env.SEPOLIA_RPC_URL);
    const provider = new hre.ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const network = await provider.getNetwork();
    console.log("✅ Connected to network:", network.name, "Chain ID:", network.chainId.toString());
    
    // Check deployer account
    const wallet = new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const balance = await provider.getBalance(wallet.address);
    
    console.log("📋 Deployer Account:", wallet.address);
    console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH");
    
    if (balance === 0n) {
      console.log("\n⚠️  WARNING: Zero balance detected!");
      console.log("Get test ETH from: https://sepoliafaucet.com/");
      return;
    }
    
    console.log("\n🎉 Configuration looks good! Ready for deployment.");
    console.log("Run: npm run deploy-sepolia");
    
  } catch (error) {
    console.log("❌ Configuration error:", error.message);
    console.log("\nTroubleshooting:");
    console.log("1. Check your RPC URL is valid");
    console.log("2. Verify private key format (no 0x prefix)");
    console.log("3. Ensure you have test ETH on Sepolia");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
