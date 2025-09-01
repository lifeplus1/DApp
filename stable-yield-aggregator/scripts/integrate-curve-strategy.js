const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🔗 Phase 3: Integrating CurveStableStrategy with PortfolioManager");
    console.log("==========================================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("Integrating from account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    // Contract addresses
    const portfolioManagerAddress = "0x9189d6926e180F77650020f4fF9b4B9efd0a30C9";
    const curveStrategyAddress = "0x8CFD4548e9E7cb38cA714B188215019A63E9B90f";
    
    // Connect to PortfolioManager
    const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
    const portfolio = PortfolioManager.attach(portfolioManagerAddress);
    
    console.log("\n🔗 Integrating CurveStableStrategy...");
    
    try {
        // Add CurveStableStrategy with 40% allocation (4000 basis points)
        const addTx = await portfolio.addStrategy(curveStrategyAddress, 4000, "CurveStableStrategy");
        const addReceipt = await addTx.wait();
        
        console.log("✅ CurveStableStrategy added successfully!");
        console.log("Transaction hash:", addTx.hash);
        console.log("Gas used:", addReceipt.gasUsed.toString());
        
        // Verify current strategy allocations
        console.log("\n📊 Current Strategy Allocations:");
        const strategyCount = await portfolio.getStrategyCount();
        console.log("Total strategies:", strategyCount.toString());
        
        for (let i = 0; i < strategyCount; i++) {
            const strategyInfo = await portfolio.strategies(i);
            console.log(`Strategy ${i + 1}:`, strategyInfo.strategy);
            console.log(`Allocation: ${strategyInfo.allocation} basis points (${strategyInfo.allocation / 100}%)`);
        }
        
        // Check total allocation
        const totalAllocation = await portfolio.totalAllocation();
        console.log("Total allocation:", totalAllocation.toString(), "basis points");
        
        console.log("\n🎉 Phase 3 Multi-Strategy Portfolio Complete!");
        console.log("======================================================");
        console.log("PortfolioManager:", portfolioManagerAddress);
        console.log("LiveUniswapV3Strategy: 60% allocation");
        console.log("CurveStableStrategy: 40% allocation");
        console.log("Total Portfolio Value Ready for Testing!");
        
    } catch (error) {
        console.error("❌ Integration failed:", error.message);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
