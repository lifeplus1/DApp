const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🏗️  Deploying AaveStrategy...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Load mock contract addresses
    const mockDeploymentPath = `./deployments/aave-mock-${hre.network.name}.json`;
    if (!fs.existsSync(mockDeploymentPath)) {
        console.error("❌ Mock contracts not deployed. Run deploy-aave-mock.js first.");
        process.exit(1);
    }

    const mockDeployment = JSON.parse(fs.readFileSync(mockDeploymentPath, 'utf8'));
    console.log("📋 Using Mock Contracts:");
    console.log("- Mock USDC:", mockDeployment.contracts.mockUSDC);
    console.log("- Mock aUSDC:", mockDeployment.contracts.mockAUSDC);
    console.log("- Mock Aave Pool:", mockDeployment.contracts.mockAavePool);
    console.log("- Mock Aave Rewards:", mockDeployment.contracts.mockAaveRewards);
    console.log();

    // Get PortfolioManager address (should be deployed)
    const portfolioDeploymentPath = `./deployments/sepolia-deployment.json`;
    let portfolioManagerAddress;
    
    if (fs.existsSync(portfolioDeploymentPath)) {
        const portfolioDeployment = JSON.parse(fs.readFileSync(portfolioDeploymentPath, 'utf8'));
        portfolioManagerAddress = portfolioDeployment.contracts.strategyManager; // Using existing StrategyManager
        console.log("📋 Using PortfolioManager at:", portfolioManagerAddress);
    } else {
        console.log("⚠️  No existing PortfolioManager found, using deployer as manager");
        portfolioManagerAddress = deployer.address;
    }

    // Deploy AaveStrategy
    console.log("1️⃣  Deploying AaveStrategy...");
    const AaveStrategy = await ethers.getContractFactory("AaveStrategy");
    
    const aaveStrategy = await AaveStrategy.deploy(
        mockDeployment.contracts.mockUSDC,        // asset (USDC)
        mockDeployment.contracts.mockAavePool,    // aavePool
        mockDeployment.contracts.mockAUSDC,       // aToken (aUSDC)
        mockDeployment.contracts.mockAaveRewards, // aaveRewards
        deployer.address,                         // admin
        portfolioManagerAddress                   // portfolioManager
    );

    await aaveStrategy.waitForDeployment();
    const strategyAddress = await aaveStrategy.getAddress();
    console.log("✅ AaveStrategy deployed to:", strategyAddress);

    // Get strategy info
    console.log("\n2️⃣  Verifying AaveStrategy deployment...");
    try {
        const [name, version, description] = await aaveStrategy.getStrategyInfo();
        console.log("✅ Strategy Name:", name);
        console.log("✅ Strategy Version:", version);
        console.log("✅ Strategy Description:", description);
        
        const totalAssets = await aaveStrategy.totalAssets();
        console.log("✅ Total Assets:", ethers.formatEther(totalAssets), "USDC");
        
        const apy = await aaveStrategy.getAPY();
        console.log("✅ Current APY:", (Number(apy) / 100).toFixed(2) + "%");
        
        const active = await aaveStrategy.active();
        const emergencyMode = await aaveStrategy.emergencyMode();
        console.log("✅ Strategy Status: Active =", active, "| Emergency =", emergencyMode);
        
    } catch (error) {
        console.log("⚠️  Could not verify strategy:", error.message);
    }

    // Contract verification (optional)
    if (hre.network.name === 'sepolia') {
        console.log("\n3️⃣  Verifying contract on Etherscan...");
        try {
            await hre.run("verify:verify", {
                address: strategyAddress,
                constructorArguments: [
                    mockDeployment.contracts.mockUSDC,
                    mockDeployment.contracts.mockAavePool,
                    mockDeployment.contracts.mockAUSDC,
                    mockDeployment.contracts.mockAaveRewards,
                    deployer.address,
                    portfolioManagerAddress
                ]
            });
            console.log("✅ Contract verified on Etherscan");
        } catch (error) {
            console.log("⚠️  Contract verification failed:", error.message);
        }
    }

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            aaveStrategy: strategyAddress,
            portfolioManager: portfolioManagerAddress
        },
        mockContracts: mockDeployment.contracts,
        strategyInfo: {
            performanceFee: "1000", // 10%
            allocation: "15%" // Target allocation
        }
    };

    console.log("\n📋 Deployment Summary:");
    console.log("=====================================");
    console.log("Network:", hre.network.name);
    console.log("AaveStrategy:", strategyAddress);
    console.log("PortfolioManager:", portfolioManagerAddress);
    console.log("Target Allocation: 15%");
    console.log("Performance Fee: 10%");
    
    // Write deployment info
    const deploymentsPath = './deployments';
    if (!fs.existsSync(deploymentsPath)) {
        fs.mkdirSync(deploymentsPath);
    }
    
    fs.writeFileSync(
        `${deploymentsPath}/aave-strategy-${hre.network.name}.json`,
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n✅ AaveStrategy deployment complete!");
    console.log("📄 Deployment info saved to:", `deployments/aave-strategy-${hre.network.name}.json`);
    console.log("\n🚀 Next Steps:");
    console.log("1. Add strategy to PortfolioManager");
    console.log("2. Rebalance portfolio to allocate 15% to Aave");
    console.log("3. Run comprehensive tests");
    
    return deploymentInfo;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
