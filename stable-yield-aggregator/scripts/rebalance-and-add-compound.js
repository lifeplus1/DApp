const { ethers } = require("hardhat");

async function main() {
    console.log("🔄 Phase 4.1: Portfolio Rebalancing for CompoundStrategy Integration");
    console.log("================================================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("Rebalancing from account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    // Contract addresses
    const portfolioManagerAddress = "0x9189d6926e180F77650020f4fF9b4B9efd0a30C9";
    const compoundStrategyAddress = "0xE1638A4DfB877343D0Bf1CA5899BbEa66440279a";
    
    console.log("\n📋 Contract Addresses:");
    console.log("PortfolioManager:", portfolioManagerAddress);
    console.log("CompoundStrategy:", compoundStrategyAddress);
    
    // Connect to PortfolioManager
    const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
    const portfolio = PortfolioManager.attach(portfolioManagerAddress);
    
    try {
        // Get current strategies
        console.log("\n🔍 Current Portfolio Analysis:");
        const activeStrategies = await portfolio.getActiveStrategies();
        console.log("Active strategies:", activeStrategies.length);
        
        let totalCurrentAllocation = 0;
        const strategyDetails = [];
        
        for (let i = 0; i < activeStrategies.length; i++) {
            const addr = activeStrategies[i];
            const info = await portfolio.getStrategyInfo(addr);
            const allocation = parseInt(info.targetAllocationBPS.toString());
            totalCurrentAllocation += allocation;
            
            strategyDetails.push({
                address: addr,
                name: info.name,
                currentAllocation: allocation
            });
            
            console.log(`${i + 1}. ${info.name}`);
            console.log(`   Address: ${addr}`);
            console.log(`   Current allocation: ${allocation} basis points (${allocation/100}%)`);
        }
        
        console.log(`\nTotal current allocation: ${totalCurrentAllocation} basis points (${totalCurrentAllocation/100}%)`);
        
        if (totalCurrentAllocation >= 8000) { // If > 80%
            console.log("\n🔄 Rebalancing Required - Portfolio at 80%+ allocation");
            console.log("Target: Reduce existing strategies to make room for CompoundStrategy (20%)");
            console.log("New allocation plan:");
            console.log("- Strategy 1: 30% (down from current)");
            console.log("- Strategy 2: 30% (down from current)"); 
            console.log("- CompoundStrategy: 20% (new)");
            console.log("- Reserve: 20% (buffer)");
            
            // Rebalance existing strategies to 30% each
            for (let i = 0; i < Math.min(2, strategyDetails.length); i++) {
                const strategy = strategyDetails[i];
                if (strategy.currentAllocation > 3000) {
                    console.log(`\n📉 Reducing ${strategy.name} allocation to 30%...`);
                    
                    const updateTx = await portfolio.updateStrategyAllocation(strategy.address, 3000);
                    const receipt = await updateTx.wait();
                    
                    console.log(`✅ ${strategy.name} updated to 30%`);
                    console.log(`   Transaction: ${updateTx.hash}`);
                    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
                } else {
                    console.log(`ℹ️  ${strategy.name} already at or below 30%, no change needed`);
                }
            }
            
            // Wait a moment for state to update
            console.log("\n⏳ Waiting for rebalancing to settle...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } else {
            console.log("✅ Portfolio has sufficient room for new strategy");
        }
        
        // Now add CompoundStrategy
        console.log("\n🔗 Adding CompoundStrategy with 20% allocation...");
        
        const addStrategyTx = await portfolio.addStrategy(
            compoundStrategyAddress,
            2000, // 20% allocation
            "CompoundStrategy"
        );
        
        const addReceipt = await addStrategyTx.wait();
        console.log("✅ CompoundStrategy added successfully!");
        console.log("Transaction hash:", addStrategyTx.hash);
        console.log("Gas used:", addReceipt.gasUsed.toString());
        
        // Final portfolio verification
        console.log("\n📊 Final Portfolio State:");
        const finalStrategies = await portfolio.getActiveStrategies();
        let finalTotalAllocation = 0;
        
        for (let i = 0; i < finalStrategies.length; i++) {
            const addr = finalStrategies[i];
            const info = await portfolio.getStrategyInfo(addr);
            const allocation = parseInt(info.targetAllocationBPS.toString());
            finalTotalAllocation += allocation;
            
            console.log(`${i + 1}. ${info.name}: ${allocation/100}% allocation`);
        }
        
        console.log(`\nFinal total allocation: ${finalTotalAllocation} basis points (${finalTotalAllocation/100}%)`);
        console.log(`Available buffer: ${(10000 - finalTotalAllocation)/100}%`);
        
        console.log("\n🎉 Phase 4.1 Portfolio Rebalancing Complete!");
        console.log("🚀 Three-Strategy Diversified Portfolio Now Active!");
        console.log("====================================================");
        
        // Show final summary
        if (finalTotalAllocation <= 8000) {
            console.log("✅ Diversified portfolio with healthy buffer for optimization");
            console.log("✅ Risk spread across multiple DeFi protocols");
            console.log("✅ Ready for automated rebalancing and yield optimization");
        }
        
    } catch (error) {
        console.error("❌ Rebalancing failed:", error.message);
        
        if (error.message.includes("Strategy already exists")) {
            console.log("ℹ️  CompoundStrategy already added to portfolio");
            
            // Show current portfolio state
            try {
                const strategies = await portfolio.getActiveStrategies();
                console.log("\nCurrent portfolio strategies:");
                for (let i = 0; i < strategies.length; i++) {
                    const info = await portfolio.getStrategyInfo(strategies[i]);
                    console.log(`- ${info.name}: ${info.targetAllocationBPS/100}%`);
                }
            } catch (e) {
                console.log("Could not retrieve portfolio state");
            }
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
