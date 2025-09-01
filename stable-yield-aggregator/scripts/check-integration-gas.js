const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Estimating gas for CurveStableStrategy integration");
    console.log("==================================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("Account:", deployer.address);
    console.log("Current balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    // Contract addresses
    const portfolioManagerAddress = "0x9189d6926e180F77650020f4fF9b4B9efd0a30C9";
    const curveStrategyAddress = "0x8CFD4548e9E7cb38cA714B188215019A63E9B90f";
    
    // Connect to PortfolioManager
    const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
    const portfolio = PortfolioManager.attach(portfolioManagerAddress);
    
    try {
        // Estimate gas for addStrategy
        const gasEstimate = await portfolio.addStrategy.estimateGas(curveStrategyAddress, 4000, "CurveStableStrategy");
        console.log("Estimated gas:", gasEstimate.toString());
        
        // Get current gas price
        const feeData = await deployer.provider.getFeeData();
        const gasPrice = feeData.gasPrice;
        console.log("Current gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
        
        // Calculate required ETH
        const requiredETH = gasEstimate * gasPrice;
        console.log("Required ETH:", ethers.formatEther(requiredETH));
        
        const currentBalance = await deployer.provider.getBalance(deployer.address);
        const buffer = requiredETH * BigInt(120) / BigInt(100); // 20% buffer
        
        console.log("Required ETH with buffer:", ethers.formatEther(buffer));
        
        if (currentBalance >= buffer) {
            console.log("✅ Sufficient balance to proceed!");
            return true;
        } else {
            console.log("❌ Insufficient balance. Need:", ethers.formatEther(buffer - currentBalance), "more ETH");
            return false;
        }
        
    } catch (error) {
        console.error("❌ Gas estimation failed:", error.message);
        return false;
    }
}

main()
    .then((canProceed) => {
        if (canProceed) {
            console.log("\n🚀 Ready to proceed with integration!");
        } else {
            console.log("\n⏳ Please obtain more Sepolia ETH before proceeding");
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
