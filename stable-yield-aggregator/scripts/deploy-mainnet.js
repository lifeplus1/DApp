const { ethers, network } = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("🚀 Starting Mainnet Deployment - Phase 6 Day 5 Production Launch");
    console.log("================================================");
    console.log(`Network: ${network.name}`);
    console.log(`Date: ${new Date().toISOString()}`);
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);
    
    // Check balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log(`Account balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther("0.1")) {
        throw new Error("Insufficient balance for mainnet deployment. Need at least 0.1 ETH");
    }
    
    // Deployment addresses will be stored here
    const deploymentAddresses = {
        network: network.name,
        deploymentDate: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {}
    };
    
    console.log("\n📋 Phase 6 Production Deployment Plan:");
    console.log("1. Deploy FeeController");
    console.log("2. Deploy DistributionSplitter");
    console.log("3. Deploy PortfolioManagerV2");
    console.log("4. Deploy IntelligentAutomationEngine");
    console.log("5. Deploy All Strategy Contracts");
    console.log("6. Configure System Integration");
    console.log("7. Verify Contracts on Etherscan");
    
    try {
        // 1. Deploy FeeController
        console.log("\n🔧 Deploying FeeController...");
        const FeeController = await ethers.getContractFactory("FeeController");
        const feeController = await FeeController.deploy();
        await feeController.waitForDeployment();
        deploymentAddresses.contracts.FeeController = await feeController.getAddress();
        console.log(`✅ FeeController deployed: ${deploymentAddresses.contracts.FeeController}`);
        
        // 2. Deploy DistributionSplitter
        console.log("\n💰 Deploying DistributionSplitter...");
        const DistributionSplitter = await ethers.getContractFactory("DistributionSplitter");
        const distributionSplitter = await DistributionSplitter.deploy();
        await distributionSplitter.waitForDeployment();
        deploymentAddresses.contracts.DistributionSplitter = await distributionSplitter.getAddress();
        console.log(`✅ DistributionSplitter deployed: ${deploymentAddresses.contracts.DistributionSplitter}`);
        
        // 3. Deploy PortfolioManagerV2
        console.log("\n📊 Deploying PortfolioManagerV2...");
        const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
        const portfolioManager = await PortfolioManager.deploy();
        await portfolioManager.waitForDeployment();
        deploymentAddresses.contracts.PortfolioManagerV2 = await portfolioManager.getAddress();
        console.log(`✅ PortfolioManagerV2 deployed: ${deploymentAddresses.contracts.PortfolioManagerV2}`);
        
        // 4. Deploy IntelligentAutomationEngine
        console.log("\n🤖 Deploying IntelligentAutomationEngine...");
        const IntelligentAutomationEngine = await ethers.getContractFactory("IntelligentAutomationEngine");
        const automationEngine = await IntelligentAutomationEngine.deploy(
            deploymentAddresses.contracts.PortfolioManagerV2
        );
        await automationEngine.waitForDeployment();
        deploymentAddresses.contracts.IntelligentAutomationEngine = await automationEngine.getAddress();
        console.log(`✅ IntelligentAutomationEngine deployed: ${deploymentAddresses.contracts.IntelligentAutomationEngine}`);
        
        // 5. Deploy Strategy Contracts
        console.log("\n🎯 Deploying Strategy Ecosystem...");
        
        // Deploy AaveV3Strategy
        const USDC_MAINNET = "0xA0b86a33E6441c8C5B07Ac8c3b3F1b6De9F95cF2"; // Mainnet USDC
        const AAVE_POOL_MAINNET = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"; // Aave V3 Pool
        
        const AaveStrategy = await ethers.getContractFactory("AaveStrategy");
        const aaveStrategy = await AaveStrategy.deploy(
            USDC_MAINNET,
            AAVE_POOL_MAINNET,
            deploymentAddresses.contracts.FeeController
        );
        await aaveStrategy.waitForDeployment();
        deploymentAddresses.contracts.AaveV3Strategy = await aaveStrategy.getAddress();
        console.log(`✅ AaveV3Strategy deployed: ${deploymentAddresses.contracts.AaveV3Strategy}`);
        
        // Deploy CurveStableStrategy
        const CurveStrategy = await ethers.getContractFactory("CurveStableStrategy");
        const curveStrategy = await CurveStrategy.deploy(USDC_MAINNET);
        await curveStrategy.waitForDeployment();
        deploymentAddresses.contracts.CurveStableStrategy = await curveStrategy.getAddress();
        console.log(`✅ CurveStableStrategy deployed: ${deploymentAddresses.contracts.CurveStableStrategy}`);
        
        // Deploy CompoundStrategy
        const CompoundStrategy = await ethers.getContractFactory("CompoundStrategy");
        const compoundStrategy = await CompoundStrategy.deploy(USDC_MAINNET);
        await compoundStrategy.waitForDeployment();
        deploymentAddresses.contracts.CompoundStrategy = await compoundStrategy.getAddress();
        console.log(`✅ CompoundStrategy deployed: ${deploymentAddresses.contracts.CompoundStrategy}`);
        
        // Deploy LiveUniswapV3Strategy
        const UniswapStrategy = await ethers.getContractFactory("LiveUniswapV3Strategy");
        const uniswapStrategy = await UniswapStrategy.deploy(USDC_MAINNET);
        await uniswapStrategy.waitForDeployment();
        deploymentAddresses.contracts.LiveUniswapV3Strategy = await uniswapStrategy.getAddress();
        console.log(`✅ LiveUniswapV3Strategy deployed: ${deploymentAddresses.contracts.LiveUniswapV3Strategy}`);
        
        // 6. System Integration
        console.log("\n🔗 Configuring System Integration...");
        
        // Register strategies in PortfolioManager
        console.log("Registering strategies in PortfolioManager...");
        await portfolioManager.addStrategy(
            deploymentAddresses.contracts.AaveV3Strategy,
            2500, // 25% allocation
            "Aave V3 Lending Strategy"
        );
        
        await portfolioManager.addStrategy(
            deploymentAddresses.contracts.CurveStableStrategy,
            2500, // 25% allocation
            "Curve Stable Strategy"
        );
        
        await portfolioManager.addStrategy(
            deploymentAddresses.contracts.CompoundStrategy,
            2500, // 25% allocation
            "Compound Lending Strategy"
        );
        
        await portfolioManager.addStrategy(
            deploymentAddresses.contracts.LiveUniswapV3Strategy,
            2500, // 25% allocation
            "Uniswap V3 Liquidity Strategy"
        );
        
        console.log("✅ All strategies registered in PortfolioManager");
        
        // Configure fee controller
        console.log("Configuring FeeController...");
        await feeController.registerStrategy(deploymentAddresses.contracts.AaveV3Strategy);
        await feeController.registerStrategy(deploymentAddresses.contracts.CurveStableStrategy);
        await feeController.registerStrategy(deploymentAddresses.contracts.CompoundStrategy);
        await feeController.registerStrategy(deploymentAddresses.contracts.LiveUniswapV3Strategy);
        console.log("✅ FeeController configured");
        
        // Save deployment addresses
        const fs = require('fs');
        const deploymentPath = './deployments-mainnet.json';
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentAddresses, null, 2));
        
        console.log("\n🎉 MAINNET DEPLOYMENT COMPLETE!");
        console.log("================================================");
        console.log("📋 Deployment Summary:");
        console.log(`Network: ${network.name}`);
        console.log(`Deployer: ${deployer.address}`);
        console.log(`Deployment file: ${deploymentPath}`);
        console.log("\n📊 Deployed Contracts:");
        Object.entries(deploymentAddresses.contracts).forEach(([name, address]) => {
            console.log(`${name}: ${address}`);
        });
        
        console.log("\n🔍 Next Steps:");
        console.log("1. Verify contracts on Etherscan");
        console.log("2. Update frontend configuration");
        console.log("3. Run production smoke tests");
        console.log("4. Announce mainnet launch");
        
        console.log("\n✅ Phase 6 Day 5 Production Deployment: SUCCESS!");
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
