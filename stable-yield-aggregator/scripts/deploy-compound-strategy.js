const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Phase 4.1: CompoundStrategy Deployment");
    console.log("=========================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying from account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    // Sepolia testnet addresses
    const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Sepolia USDC
    const CUSDC_ADDRESS = "0x70e36f6BF80a52b3B46b3aF8e106CC0ed743E8e4"; // Compound V2 cUSDC on Sepolia
    const COMPTROLLER_ADDRESS = "0x627EA49279FD0dE89186A58b8758aD02B6Be2867"; // Compound V2 Comptroller on Sepolia
    
    console.log("\n📋 Contract Addresses:");
    console.log("USDC:", USDC_ADDRESS);
    console.log("cUSDC:", CUSDC_ADDRESS);
    console.log("Comptroller:", COMPTROLLER_ADDRESS);
    
    try {
        // Deploy CompoundStrategy
        console.log("\n🔨 Deploying CompoundStrategy...");
        const CompoundStrategy = await ethers.getContractFactory("CompoundStrategy");
        const compoundStrategy = await CompoundStrategy.deploy(
            USDC_ADDRESS,
            CUSDC_ADDRESS,
            COMPTROLLER_ADDRESS
        );
        
        await compoundStrategy.waitForDeployment();
        const compoundStrategyAddress = await compoundStrategy.getAddress();
        
        console.log("✅ CompoundStrategy deployed to:", compoundStrategyAddress);
        
        // Verify deployment
        console.log("\n🔍 Verifying deployment...");
        const asset = await compoundStrategy.asset();
        const strategyInfo = await compoundStrategy.strategyInfo();
        const apy = await compoundStrategy.getAPY();
        
        console.log("Asset (USDC):", asset);
        console.log("Strategy Name:", strategyInfo[0]);
        console.log("Protocol Name:", strategyInfo[1]);
        console.log("Current APY:", apy.toString(), "basis points");
        
        // Gas usage estimation
        const deploymentTx = compoundStrategy.deploymentTransaction();
        if (deploymentTx) {
            console.log("\n⛽ Gas Metrics:");
            console.log("Deployment gas used:", deploymentTx.gasLimit?.toString());
            console.log("Gas price:", ethers.formatUnits(deploymentTx.gasPrice || 0, "gwei"), "gwei");
        }
        
        console.log("\n📊 Next Steps:");
        console.log("1. Add CompoundStrategy to PortfolioManager");
        console.log("2. Set allocation percentage (recommended: 20%)");
        console.log("3. Test deposit/withdraw functionality");
        console.log("4. Monitor yield generation");
        
        // Save deployment info
        const deploymentInfo = {
            network: "sepolia",
            timestamp: new Date().toISOString(),
            deployer: deployer.address,
            contracts: {
                CompoundStrategy: compoundStrategyAddress,
                USDC: USDC_ADDRESS,
                cUSDC: CUSDC_ADDRESS,
                Comptroller: COMPTROLLER_ADDRESS
            },
            gasUsed: deploymentTx?.gasLimit?.toString(),
            transactionHash: deploymentTx?.hash
        };
        
        console.log("\n💾 Deployment Summary:");
        console.log(JSON.stringify(deploymentInfo, null, 2));
        
        console.log("\n🎉 Phase 4.1 CompoundStrategy Deployment Complete!");
        console.log("Ready for PortfolioManager integration.");
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
