const { ethers } = require("hardhat");

async function main() {
    console.log("🔗 Phase 4.1: Integrating CompoundStrategy with PortfolioManager");
    console.log("===============================================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("Integrating from account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    // Contract addresses from previous deployments
    const portfolioManagerAddress = "0x9189d6926e180F77650020f4fF9b4B9efd0a30C9";
    const compoundStrategyAddress = "0xE1638A4DfB877343D0Bf1CA5899BbEa66440279a";
    const liveUniswapAddress = "0x8a3ccb17f5bebce74ed5cbfcdaa5dba74dcacc2b";
    const curveStrategyAddress = "0x8CFD4548e9E7cb38cA714B188215019A63E9B90f";
    
    console.log("\n📋 Integration Addresses:");
    console.log("PortfolioManager:", portfolioManagerAddress);
    console.log("CompoundStrategy:", compoundStrategyAddress);
    console.log("LiveUniswapV3Strategy:", liveUniswapAddress);
    console.log("CurveStableStrategy:", curveStrategyAddress);
    
    // Connect to PortfolioManager
    const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
    const portfolio = PortfolioManager.attach(portfolioManagerAddress);
    
    try {
        // Check current status
        console.log("\n🔍 Current Portfolio Status:");
        const activeStrategies = await portfolio.getActiveStrategies();
        console.log("Active strategies count:", activeStrategies.length);
        
        for (let i = 0; i < activeStrategies.length; i++) {
            const strategyAddr = activeStrategies[i];
            const strategyInfo = await portfolio.getStrategyInfo(strategyAddr);
            console.log(`Strategy ${i + 1}:`, strategyAddr);
            console.log(`  - Active: ${strategyInfo.active}`);
            console.log(`  - Allocation: ${strategyInfo.allocation} basis points (${strategyInfo.allocation / 100}%)`);
        }
        
        // Add CompoundStrategy with 20% allocation (2000 basis points)
        console.log("\n🔗 Adding CompoundStrategy to Portfolio...");
        
        // Check if we need to rebalance existing strategies first
        const totalAllocation = await portfolio.totalAllocation();
        console.log("Current total allocation:", totalAllocation.toString(), "basis points");
        
        if (totalAllocation >= 8000) {
            console.log("⚠️  Portfolio at 80%+ allocation, need to rebalance before adding new strategy");
            
            // Rebalance existing strategies to make room
            console.log("🔄 Rebalancing existing strategies...");
            
            // Update LiveUniswapV3Strategy to 30% (3000 basis points)
            const updateUniswapTx = await portfolio.updateStrategyAllocation(liveUniswapAddress, 3000);
            await updateUniswapTx.wait();
            console.log("✅ LiveUniswapV3Strategy updated to 30%");
            
            // Update CurveStableStrategy to 30% (3000 basis points) 
            const updateCurveTx = await portfolio.updateStrategyAllocation(curveStrategyAddress, 3000);
            await updateCurveTx.wait();
            console.log("✅ CurveStableStrategy updated to 30%");
        }
        
        // Add CompoundStrategy with 20% allocation
        const addStrategyTx = await portfolio.addStrategy(compoundStrategyAddress, 2000, "CompoundStrategy");
        const addReceipt = await addStrategyTx.wait();
        
        console.log("✅ CompoundStrategy added successfully!");
        console.log("Transaction hash:", addStrategyTx.hash);
        console.log("Gas used:", addReceipt.gasUsed.toString());
        
        // Verify final portfolio state
        console.log("\n📊 Final Portfolio Allocation:");
        const finalActiveStrategies = await portfolio.getActiveStrategies();
        const finalTotalAllocation = await portfolio.totalAllocation();
        
        console.log("Total active strategies:", finalActiveStrategies.length);
        console.log("Total allocation:", finalTotalAllocation.toString(), "basis points (should be ≤10000)");
        
        for (let i = 0; i < finalActiveStrategies.length; i++) {
            const strategyAddr = finalActiveStrategies[i];
            const strategyInfo = await portfolio.getStrategyInfo(strategyAddr);
            
            let strategyName = "Unknown";
            if (strategyAddr.toLowerCase() === liveUniswapAddress.toLowerCase()) strategyName = "LiveUniswapV3";
            if (strategyAddr.toLowerCase() === curveStrategyAddress.toLowerCase()) strategyName = "CurveStable";
            if (strategyAddr.toLowerCase() === compoundStrategyAddress.toLowerCase()) strategyName = "Compound";
            
            console.log(`${strategyName}: ${strategyInfo.allocation / 100}% allocation`);
        }
        
        // Test portfolio operations if desired
        console.log("\n🧪 Portfolio Integration Tests Available:");
        console.log("- Multi-strategy deposit operations");
        console.log("- Automatic rebalancing triggers");
        console.log("- Cross-strategy yield optimization");
        console.log("- Risk-weighted portfolio management");
        
        console.log("\n🎉 Phase 4.1 CompoundStrategy Integration Complete!");
        console.log("🚀 Three-Strategy Diversified Portfolio Now Active!");
        console.log("====================================================");
        console.log("✅ LiveUniswapV3Strategy: 30%");
        console.log("✅ CurveStableStrategy: 30%");  
        console.log("✅ CompoundStrategy: 20%");
        console.log("💡 Total: 80% allocated, 20% buffer for optimization");
        
    } catch (error) {
        console.error("❌ Integration failed:", error.message);
        
        // Check if it's already added
        if (error.message.includes("Strategy already added")) {
            console.log("ℹ️  CompoundStrategy already added to portfolio");
            
            // Show current status
            const strategies = await portfolio.getActiveStrategies();
            console.log("Current active strategies:", strategies.length);
        } else {
            throw error;
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
