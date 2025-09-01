const { ethers } = require("hardhat");

async function main() {
    console.log("🔗 Phase 4.1: Simple CompoundStrategy Integration");
    console.log("===============================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("Integrating from account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    // Contract addresses
    const portfolioManagerAddress = "0x9189d6926e180F77650020f4fF9b4B9efd0a30C9";
    const compoundStrategyAddress = "0xE1638A4DfB877343D0Bf1CA5899BbEa66440279a";
    
    console.log("\n📋 Integration Addresses:");
    console.log("PortfolioManager:", portfolioManagerAddress);
    console.log("CompoundStrategy:", compoundStrategyAddress);
    
    // Connect to contracts
    const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
    const portfolio = PortfolioManager.attach(portfolioManagerAddress);
    
    try {
        // Check current active strategies
        console.log("\n🔍 Current Portfolio Status:");
        const activeStrategyCount = await portfolio.activeStrategyCount();
        console.log("Active strategy count:", activeStrategyCount.toString());
        
        const activeStrategiesList = await portfolio.getActiveStrategies();
        console.log("Active strategies:", activeStrategiesList.length);
        
        // Simple strategy addition with 20% allocation (2000 basis points)
        console.log("\n🔗 Adding CompoundStrategy...");
        console.log("Target allocation: 20% (2000 basis points)");
        
        const addStrategyTx = await portfolio.addStrategy(
            compoundStrategyAddress,
            2000, // 20% allocation
            "CompoundStrategy"
        );
        
        const receipt = await addStrategyTx.wait();
        console.log("✅ CompoundStrategy added successfully!");
        console.log("Transaction hash:", addStrategyTx.hash);
        console.log("Gas used:", receipt.gasUsed.toString());
        
        // Verify the addition
        console.log("\n📊 Verification:");
        const newActiveCount = await portfolio.activeStrategyCount();
        console.log("New active strategy count:", newActiveCount.toString());
        
        const strategyInfo = await portfolio.getStrategyInfo(compoundStrategyAddress);
        console.log("CompoundStrategy info:");
        console.log("- Strategy address:", strategyInfo.strategyAddress);
        console.log("- Target allocation:", strategyInfo.targetAllocationBPS.toString(), "basis points");
        console.log("- Active:", strategyInfo.active);
        console.log("- Name:", strategyInfo.name);
        
        // Show all active strategies
        const finalStrategies = await portfolio.getActiveStrategies();
        console.log("\n🎯 All Active Strategies:");
        for (let i = 0; i < finalStrategies.length; i++) {
            const addr = finalStrategies[i];
            const info = await portfolio.getStrategyInfo(addr);
            console.log(`${i + 1}. ${info.name}: ${info.targetAllocationBPS / 100}% allocation`);
        }
        
        console.log("\n🎉 Phase 4.1 Integration Complete!");
        console.log("🚀 Multi-Strategy Diversified Portfolio Active!");
        
        // Calculate total theoretical allocation
        let totalAlloc = 0;
        for (let i = 0; i < finalStrategies.length; i++) {
            const info = await portfolio.getStrategyInfo(finalStrategies[i]);
            totalAlloc += parseInt(info.targetAllocationBPS.toString());
        }
        console.log(`💡 Total target allocation: ${totalAlloc} basis points (${totalAlloc/100}%)`);
        
        if (totalAlloc <= 10000) {
            console.log("✅ Portfolio allocation within acceptable limits");
        } else {
            console.log("⚠️  Portfolio over-allocated - may need rebalancing");
        }
        
    } catch (error) {
        console.error("❌ Integration failed:", error.message);
        
        // Provide helpful error context
        if (error.message.includes("Strategy already exists")) {
            console.log("ℹ️  CompoundStrategy may already be added");
            
            try {
                const info = await portfolio.getStrategyInfo(compoundStrategyAddress);
                console.log("Existing strategy allocation:", info.targetAllocationBPS.toString(), "basis points");
            } catch (_e) {
                console.log("Strategy not found in portfolio");
            }
        }
        
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
