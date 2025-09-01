const _hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 AaveStrategy Portfolio Addition (Direct Approach)");
    console.log("===================================================\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const PORTFOLIO_MANAGER_ADDRESS = "0x9189d6926e180F77650020f4fF9b4B9efd0a30C9";
    const AAVE_STRATEGY_ADDRESS = "0xdb240a99aacaDeFFB9e85e700cE6F0e489F8d8e6";

    const portfolioManager = await ethers.getContractAt("PortfolioManager", PORTFOLIO_MANAGER_ADDRESS);

    console.log("1️⃣  Checking current state...");
    
    // Check if we're the owner
    const owner = await portfolioManager.owner();
    console.log("Portfolio Manager owner:", owner);
    console.log("Our address:", deployer.address);
    console.log("Are we owner?", owner.toLowerCase() === deployer.address.toLowerCase());

    // Get current strategies
    const strategies = await portfolioManager.getActiveStrategies();
    console.log("Current active strategies:", strategies.length);

    // Check if AaveStrategy exists but is inactive
    try {
        const info = await portfolioManager.getStrategyInfo(AAVE_STRATEGY_ADDRESS);
        console.log("AaveStrategy info:", {
            address: info.strategyAddress,
            allocation: Number(info.targetAllocationBPS)/100 + "%",
            isActive: info.isActive
        });
        
        if (info.strategyAddress === "0x0000000000000000000000000000000000000000") {
            console.log("✅ Strategy not in portfolio - can add fresh");
        } else if (!info.isActive) {
            console.log("⚠️  Strategy exists but inactive - need to activate");
        } else {
            console.log("✅ Strategy already active with proper allocation");
            return;
        }
    } catch (_error) {
        console.log("✅ Strategy not found - can add fresh");
    }

    console.log("\n2️⃣  Adding AaveStrategy...");
    
    try {
        const tx = await portfolioManager.addStrategy(
            AAVE_STRATEGY_ADDRESS,
            1500, // 15% allocation
            "AaveStrategy" // Strategy name
        );
        
        console.log("Transaction hash:", tx.hash);
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed!");
        console.log("Gas used:", receipt.gasUsed.toString());
        
        // Verify the addition
        const newStrategies = await portfolioManager.getActiveStrategies();
        console.log("New strategy count:", newStrategies.length);
        
        const newInfo = await portfolioManager.getStrategyInfo(AAVE_STRATEGY_ADDRESS);
        console.log("New AaveStrategy info:", {
            allocation: Number(newInfo.targetAllocationBPS)/100 + "%",
            isActive: newInfo.isActive,
            balance: ethers.formatUnits(newInfo.currentBalance, 6) + " USDC"
        });
        
        console.log("🎉 SUCCESS: AaveStrategy successfully added to portfolio!");
        
    } catch (error) {
        console.error("❌ Failed to add strategy:", error.message);
        
        if (error.message.includes("revert")) {
            console.log("This might be a contract revert. Common causes:");
            console.log("- Not owner of portfolio");
            console.log("- Strategy already exists");
            console.log("- Invalid allocation (too high)");
            console.log("- Strategy contract issues");
        }
        
        throw error;
    }

    console.log("\n3️⃣  Final Portfolio State:");
    const finalStrategies = await portfolioManager.getActiveStrategies();
    let totalAllocation = 0;
    
    for (let i = 0; i < finalStrategies.length; i++) {
        try {
            const info = await portfolioManager.getStrategyInfo(finalStrategies[i]);
            const strategy = await ethers.getContractAt("IStrategyV2", finalStrategies[i]);
            const [name] = await strategy.getStrategyInfo();
            
            console.log(`${i + 1}. ${name}: ${Number(info.targetAllocationBPS)/100}%`);
            totalAllocation += Number(info.targetAllocationBPS);
        } catch (_error) {
            console.log(`${i + 1}. ${finalStrategies[i]}: Unable to get info`);
        }
    }
    
    console.log(`\nTotal allocation: ${totalAllocation/100}%`);
    console.log(`Buffer: ${100 - totalAllocation/100}%`);
    
    if (finalStrategies.length === 4) {
        console.log("🎊 MILESTONE ACHIEVED: Four-strategy portfolio operational!");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Process failed:", error);
        process.exit(1);
    });
