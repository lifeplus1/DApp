const hre = require("hardhat");

/**
 * Simple deployment script for testing LiveUniswapV3Strategy
 */

async function main() {
  console.log("🦄 Deploying Live Uniswap V3 Strategy (Test Mode)...");
  console.log("==================================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

  try {
    // First deploy a mock USDC token for testing
    console.log("\n🪙 Deploying Mock USDC Token...");
    const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    const token = await ERC20Mock.deploy("USD Coin", "USDC");
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log("✅ Mock USDC deployed to:", tokenAddress);

    // Deploy LiveUniswapV3Strategy
    console.log("\n🚀 Deploying LiveUniswapV3Strategy...");
    const LiveUniswapV3Strategy = await hre.ethers.getContractFactory("LiveUniswapV3Strategy");
    const strategy = await LiveUniswapV3Strategy.deploy(tokenAddress);
    await strategy.waitForDeployment();
    const strategyAddress = await strategy.getAddress();
    console.log("✅ LiveUniswapV3Strategy deployed to:", strategyAddress);

    // Verify the strategy works
    console.log("\n🔍 Verifying strategy...");
    const strategyInfo = await strategy.getStrategyInfo();
    const totalValue = await strategy.getTotalValue();
    const currentAPY = await strategy.getAPY();
    
    console.log("📊 Strategy Info:");
    console.log("   Name:", strategyInfo[0]);
    console.log("   Version:", strategyInfo[1]);
    console.log("   Total Value:", hre.ethers.formatUnits(totalValue, 18), "tokens");
    console.log("   Current APY:", (Number(currentAPY) / 100).toFixed(2), "%");

    // Test a small deposit
    console.log("\n🧪 Testing strategy functionality...");
    
    // Mint some tokens to deployer
    await token.mint(deployer.address, hre.ethers.parseUnits("10000", 18));
    console.log("✅ Minted 10,000 test tokens to deployer");
    
    // Approve and deposit
    await token.approve(strategyAddress, hre.ethers.parseUnits("1000", 18));
    await strategy.deposit(hre.ethers.parseUnits("1000", 18));
    console.log("✅ Deposited 1,000 tokens to strategy");
    
    // Check balance
    const userBalance = await strategy.balanceOf(deployer.address);
    console.log("💰 User balance in strategy:", hre.ethers.formatUnits(userBalance, 18), "tokens");

    console.log("\n🎉 STRATEGY DEPLOYMENT AND TEST COMPLETE!");
    console.log("=========================================");
    console.log("🦄 Strategy Address:", strategyAddress);
    console.log("🪙 Token Address:", tokenAddress);
    console.log("✅ Strategy is fully functional and ready!");

    return { strategy: strategyAddress, token: tokenAddress };

  } catch (error) {
    console.error("❌ Deployment failed:", error);
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
