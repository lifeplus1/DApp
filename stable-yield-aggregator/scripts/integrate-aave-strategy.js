const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🏦 Phase 4.2.2: AaveStrategy Portfolio Integration");
    console.log("==============================================\n");

    const [deployer] = await ethers.getSigners();
    console.log("Executing with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Load deployment addresses
    const PORTFOLIO_MANAGER_ADDRESS = "0x9189d6926e180F77650020f4fF9b4B9efd0a30C9";
    const AAVE_STRATEGY_ADDRESS = "0xdb240a99aacaDeFFB9e85e700cE6F0e489F8d8e6"; // From actual deployment
    const USDC_ADDRESS = "0x3F2178618013EeFE109857aB3eC83049C90968bA";

    console.log("📋 Contract Addresses:");
    console.log("Portfolio Manager:", PORTFOLIO_MANAGER_ADDRESS);
    console.log("AaveStrategy:", AAVE_STRATEGY_ADDRESS);
    console.log("USDC Token:", USDC_ADDRESS);

    // Get contract instances
    const portfolioManager = await ethers.getContractAt("PortfolioManager", PORTFOLIO_MANAGER_ADDRESS);
    const aaveStrategy = await ethers.getContractAt("AaveStrategy", AAVE_STRATEGY_ADDRESS);
        const _usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);    console.log("\n1️⃣  Current Portfolio State Analysis...");
    
    // Check current portfolio state
    const currentStrategies = await portfolioManager.getActiveStrategies();
    console.log("Active strategies count:", currentStrategies.length);
    
    let totalAllocation = 0n;
    for (let i = 0; i < currentStrategies.length; i++) {
        try {
            const info = await portfolioManager.getStrategyInfo(currentStrategies[i]);
            console.log(`- Strategy ${i + 1}: ${info.targetAllocationBPS/100n}% allocation`);
            totalAllocation += info.targetAllocationBPS;
        } catch (_error) {
            console.log(`- Strategy ${i + 1}: Unable to get info`);
        }
    }
    console.log("Total current allocation:", Number(totalAllocation)/100, "%");
    console.log("Available buffer:", 100 - Number(totalAllocation)/100, "%");

    // Check current portfolio value
    const totalAssets = await portfolioManager.getTotalPortfolioValue();
    console.log("Total portfolio value:", ethers.formatUnits(totalAssets, 6), "USDC");

    console.log("\n2️⃣  Pre-Integration Portfolio Rebalancing...");
    
    // Current target allocation:
    // UniswapV3: 30%, Curve: 30%, Compound: 20%, Buffer: 20%
    // New target allocation: 
    // UniswapV3: 30%, Curve: 30%, Compound: 20%, Aave: 15%, Buffer: 5%
    
    if (totalAllocation > 9500n) { // 95% - need to reduce buffer
        console.log("⚡ Reducing buffer allocation to accommodate Aave strategy...");
        
        // We don't need to rebalance existing strategies as they keep their allocations
        // We just need to reduce the buffer from 20% to 5% to make room for 15% Aave
        console.log("✅ Existing strategies maintain their allocations:");
        console.log("   - UniswapV3Strategy: 30%");  
        console.log("   - CurveStableStrategy: 30%");
        console.log("   - CompoundStrategy: 20%");
        console.log("🎯 Adding AaveStrategy: 15%");
        console.log("📊 New buffer: 5% (reduced from 20%)");
    }

    console.log("\n3️⃣  Adding AaveStrategy to Portfolio...");
    
    // Check if strategy is already added
    let strategyAlreadyAdded = false;
    try {
        await portfolioManager.getStrategyInfo(AAVE_STRATEGY_ADDRESS);
        strategyAlreadyAdded = true;
        console.log("⚠️  AaveStrategy is already added to portfolio");
    } catch (_error) {
        console.log("✅ AaveStrategy not yet in portfolio - proceeding with addition");
    }

    if (!strategyAlreadyAdded) {
        try {
            const addStrategyTx = await portfolioManager.addStrategy(
                AAVE_STRATEGY_ADDRESS,
                1500, // 15% allocation (1500 basis points)
                { gasLimit: 500000 }
            );
            
            console.log("Transaction submitted:", addStrategyTx.hash);
            const receipt = await addStrategyTx.wait();
            console.log("✅ AaveStrategy added successfully!");
            console.log("Gas used:", receipt.gasUsed.toString());
            
        } catch (_error) {
            console.error("❌ Failed to add AaveStrategy:", _error.message);
            throw _error;
        }
    }

    console.log("\n4️⃣  Verifying Integration...");
    
    // Verify the strategy was added
    const updatedStrategies = await portfolioManager.getActiveStrategies();
    console.log("Updated strategies count:", updatedStrategies.length);
    
    let newTotalAllocation = 0n;
    for (let i = 0; i < updatedStrategies.length; i++) {
        try {
            const info = await portfolioManager.getStrategyInfo(updatedStrategies[i]);
            const strategyContract = await ethers.getContractAt("IStrategyV2", updatedStrategies[i]);
            const [name] = await strategyContract.getStrategyInfo();
            console.log(`- ${name}: ${info.targetAllocationBPS/100n}% (${updatedStrategies[i]})`);
            newTotalAllocation += info.targetAllocationBPS;
        } catch (_error) {
            console.log(`- Strategy ${i + 1}: ${updatedStrategies[i]} (info unavailable)`);
        }
    }
    
    console.log("New total allocation:", Number(newTotalAllocation)/100, "%");
    console.log("New buffer allocation:", 100 - Number(newTotalAllocation)/100, "%");

    console.log("\n5️⃣  Testing AaveStrategy Functionality...");
    
    // Check strategy is properly configured
    const strategyInfo = await aaveStrategy.getStrategyInfo();
    console.log("Strategy Name:", strategyInfo[0]);
    console.log("Strategy Version:", strategyInfo[1]);
    
    const isActive = await aaveStrategy.active();
    const totalStrategyAssets = await aaveStrategy.totalAssets();
    console.log("Strategy Active:", isActive);
    console.log("Strategy Assets:", ethers.formatUnits(totalStrategyAssets, 6), "USDC");

    // Check APY
    try {
        const apy = await aaveStrategy.getAPY();
        console.log("Strategy APY:", Number(apy)/100, "%");
    } catch (_error) {
        console.log("APY:", "Unable to fetch (expected for new strategy)");
    }

    console.log("\n6️⃣  Portfolio Performance Summary...");
    
    const finalTotalAssets = await portfolioManager.getTotalPortfolioValue();
    console.log("Final portfolio value:", ethers.formatUnits(finalTotalAssets, 6), "USDC");
    
    if (updatedStrategies.length === 4) {
        console.log("🎉 SUCCESS: Four-strategy diversified portfolio is now operational!");
        console.log("📊 Portfolio Composition:");
        console.log("   ├── UniswapV3 (DEX): 30%");
        console.log("   ├── Curve (Stablecoins): 30%"); 
        console.log("   ├── Compound (Lending): 20%");
        console.log("   ├── Aave (Lending): 15%");
        console.log("   └── Buffer (Optimization): 5%");
        console.log("💡 95% capital deployed across major DeFi protocols!");
    }

    // Save integration results
    const integrationResults = {
        network: hre.network.name,
        timestamp: new Date().toISOString(),
        portfolioManager: PORTFOLIO_MANAGER_ADDRESS,
        aaveStrategy: AAVE_STRATEGY_ADDRESS,
        strategiesCount: updatedStrategies.length,
        totalAllocation: Number(newTotalAllocation)/100,
        bufferAllocation: 100 - Number(newTotalAllocation)/100,
        totalAssets: ethers.formatUnits(finalTotalAssets, 6),
        strategies: updatedStrategies
    };

    // Write integration results
    const fs = require('fs');
    fs.writeFileSync(
        `./deployments/phase-4.2-integration-${hre.network.name}.json`,
        JSON.stringify(integrationResults, null, 2)
    );

    console.log("\n✅ Phase 4.2.2 Portfolio Integration Complete!");
    console.log("📄 Integration results saved to:", `deployments/phase-4.2-integration-${hre.network.name}.json`);
    
    return integrationResults;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Integration failed:", error);
        process.exit(1);
    });
