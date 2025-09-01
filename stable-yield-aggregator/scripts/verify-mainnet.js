const { run } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔍 Starting Etherscan Contract Verification");
    console.log("==========================================");
    
    // Load deployment addresses
    const deploymentFile = './deployments-mainnet.json';
    if (!fs.existsSync(deploymentFile)) {
        throw new Error("Deployment file not found. Please run deploy-mainnet.js first.");
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    console.log(`Loaded deployment from: ${deployment.deploymentDate}`);
    console.log(`Network: ${deployment.network}`);
    
    const contracts = [
        {
            name: "FeeController",
            address: deployment.contracts.FeeController,
            constructorArguments: []
        },
        {
            name: "DistributionSplitter",
            address: deployment.contracts.DistributionSplitter,
            constructorArguments: []
        },
        {
            name: "PortfolioManager",
            address: deployment.contracts.PortfolioManagerV2,
            constructorArguments: []
        },
        {
            name: "IntelligentAutomationEngine",
            address: deployment.contracts.IntelligentAutomationEngine,
            constructorArguments: [deployment.contracts.PortfolioManagerV2]
        },
        {
            name: "AaveStrategy",
            address: deployment.contracts.AaveV3Strategy,
            constructorArguments: [
                "0xA0b86a33E6441c8C5B07Ac8c3b3F1b6De9F95cF2", // USDC
                "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2", // Aave V3 Pool
                deployment.contracts.FeeController
            ]
        },
        {
            name: "CurveStableStrategy",
            address: deployment.contracts.CurveStableStrategy,
            constructorArguments: ["0xA0b86a33E6441c8C5B07Ac8c3b3F1b6De9F95cF2"]
        },
        {
            name: "CompoundStrategy",
            address: deployment.contracts.CompoundStrategy,
            constructorArguments: ["0xA0b86a33E6441c8C5B07Ac8c3b3F1b6De9F95cF2"]
        },
        {
            name: "LiveUniswapV3Strategy",
            address: deployment.contracts.LiveUniswapV3Strategy,
            constructorArguments: ["0xA0b86a33E6441c8C5B07Ac8c3b3F1b6De9F95cF2"]
        }
    ];
    
    console.log(`\n📋 Verifying ${contracts.length} contracts on Etherscan...\n`);
    
    const verificationResults = [];
    
    for (const contract of contracts) {
        try {
            console.log(`🔍 Verifying ${contract.name} at ${contract.address}...`);
            
            await run("verify:verify", {
                address: contract.address,
                constructorArguments: contract.constructorArguments,
                force: true
            });
            
            console.log(`✅ ${contract.name} verified successfully`);
            verificationResults.push({
                name: contract.name,
                address: contract.address,
                status: "verified"
            });
            
            // Wait between verifications to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`❌ Failed to verify ${contract.name}:`, error.message);
            verificationResults.push({
                name: contract.name,
                address: contract.address,
                status: "failed",
                error: error.message
            });
        }
    }
    
    // Save verification results
    const verificationFile = './verification-results.json';
    const results = {
        verificationDate: new Date().toISOString(),
        network: deployment.network,
        results: verificationResults
    };
    
    fs.writeFileSync(verificationFile, JSON.stringify(results, null, 2));
    
    console.log("\n📋 Verification Summary:");
    console.log("========================");
    
    const successful = verificationResults.filter(r => r.status === "verified").length;
    const failed = verificationResults.filter(r => r.status === "failed").length;
    
    console.log(`✅ Successfully verified: ${successful}`);
    console.log(`❌ Failed to verify: ${failed}`);
    console.log(`📄 Results saved to: ${verificationFile}`);
    
    verificationResults.forEach(result => {
        const status = result.status === "verified" ? "✅" : "❌";
        console.log(`${status} ${result.name}: ${result.address}`);
    });
    
    if (failed === 0) {
        console.log("\n🎉 ALL CONTRACTS SUCCESSFULLY VERIFIED!");
        console.log("Ready for production launch! 🚀");
    } else {
        console.log(`\n⚠️  ${failed} contracts failed verification. Please check manually.`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Verification failed:", error);
        process.exit(1);
    });
