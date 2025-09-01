const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Phase 3 Completion Verification");
    console.log("==================================");
    
    const portfolioManagerAddress = "0x9189d6926e180F77650020f4fF9b4B9efd0a30C9";
    const curveStrategyAddress = "0x8CFD4548e9E7cb38cA714B188215019A63E9B90f";
    const liveStrategyAddress = "0x8a3ccb17f5bebce74ed5cbfcdaa5dba74dcacc2b";
    
    // Connect to PortfolioManager
    const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
    const portfolio = PortfolioManager.attach(portfolioManagerAddress);
    
    console.log("✅ PortfolioManager:", portfolioManagerAddress);
    
    try {
        // Check active strategy count
        const activeCount = await portfolio.activeStrategyCount();
        console.log("Active strategies:", activeCount.toString());
        
        // Check strategy info
        const liveStrategyInfo = await portfolio.getStrategyInfo(liveStrategyAddress);
        const curveStrategyInfo = await portfolio.getStrategyInfo(curveStrategyAddress);
        
        console.log("\n📊 Strategy Status:");
        console.log("LiveUniswapV3Strategy:", liveStrategyAddress);
        console.log("- Active:", liveStrategyInfo.active);
        console.log("- Allocation:", liveStrategyInfo.allocation.toString(), "basis points");
        
        console.log("CurveStableStrategy:", curveStrategyAddress);
        console.log("- Active:", curveStrategyInfo.active);
        console.log("- Allocation:", curveStrategyInfo.allocation.toString(), "basis points");
        
        // Check total allocation
        const totalAllocation = await portfolio.totalAllocation();
        console.log("\nTotal allocation:", totalAllocation.toString(), "basis points (should be 10000 for 100%)");
        
        if (activeCount >= 2 && totalAllocation == 10000) {
            console.log("\n🎉 PHASE 3 COMPLETE!");
            console.log("✅ Multi-strategy architecture deployed");
            console.log("✅ Both strategies integrated and active");
            console.log("✅ Ready for Phase 4 expansion");
        } else {
            console.log("\n⚠️ Phase 3 not fully complete yet");
        }
        
    } catch (error) {
        console.error("Error checking status:", error.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
