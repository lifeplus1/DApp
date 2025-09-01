const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Phase 4.1: CompoundStrategy Mock Deployment for Testing");
    console.log("========================================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying from account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    try {
        // First deploy mock contracts for testing
        console.log("\n🔨 Deploying Mock Contracts...");
        
        // Deploy mock USDC
        const MockToken = await ethers.getContractFactory("MockToken");
        const mockUSDC = await MockToken.deploy("USD Coin", "USDC", 6);
        await mockUSDC.waitForDeployment();
        const usdcAddress = await mockUSDC.getAddress();
        
        // Deploy mock COMP token
        const mockCOMP = await MockToken.deploy("Compound", "COMP", 18);
        await mockCOMP.waitForDeployment();
        const compAddress = await mockCOMP.getAddress();
        
        // Deploy mock Comptroller
        const MockComptroller = await ethers.getContractFactory("MockComptroller");
        const mockComptroller = await MockComptroller.deploy(compAddress);
        await mockComptroller.waitForDeployment();
        const comptrollerAddress = await mockComptroller.getAddress();
        
        // Deploy mock cUSDC
        const MockCToken = await ethers.getContractFactory("MockCToken");
        const mockCUSDC = await MockCToken.deploy(usdcAddress);
        await mockCUSDC.waitForDeployment();
        const cUSDCAddress = await mockCUSDC.getAddress();
        
        console.log("✅ Mock USDC deployed to:", usdcAddress);
        console.log("✅ Mock COMP deployed to:", compAddress);
        console.log("✅ Mock Comptroller deployed to:", comptrollerAddress);
        console.log("✅ Mock cUSDC deployed to:", cUSDCAddress);
        
        // Deploy CompoundStrategy with mock contracts
        console.log("\n🔨 Deploying CompoundStrategy...");
        const CompoundStrategy = await ethers.getContractFactory("CompoundStrategy");
        const compoundStrategy = await CompoundStrategy.deploy(
            usdcAddress,
            cUSDCAddress,
            comptrollerAddress
        );
        
        await compoundStrategy.waitForDeployment();
        const compoundStrategyAddress = await compoundStrategy.getAddress();
        
        console.log("✅ CompoundStrategy deployed to:", compoundStrategyAddress);
        
        // Verify deployment
        console.log("\n🔍 Verifying deployment...");
        const asset = await compoundStrategy.asset();
        const [strategyName, version, description] = await compoundStrategy.getStrategyInfo();
        const apy = await compoundStrategy.getAPY();
        
        console.log("Asset (USDC):", asset);
        console.log("Strategy Name:", strategyName);
        console.log("Version:", version);
        console.log("Description:", description);
        console.log("Current APY:", apy.toString(), "basis points");
        
        // Test basic functionality with mock tokens
        console.log("\n🧪 Testing Basic Functionality...");
        
        // Mint USDC to deployer for testing
        await mockUSDC.mint(deployer.address, ethers.parseUnits("1000", 6));
        console.log("✅ Minted 1000 USDC to deployer for testing");
        
        // Test deposit
        await mockUSDC.approve(compoundStrategyAddress, ethers.parseUnits("100", 6));
        await compoundStrategy.deposit(ethers.parseUnits("100", 6), deployer.address);
        console.log("✅ Test deposit successful");
        
        const totalAssets = await compoundStrategy.totalAssets();
        console.log("Total assets after deposit:", ethers.formatUnits(totalAssets, 6), "USDC");
        
        // Gas usage estimation
        const deploymentTx = compoundStrategy.deploymentTransaction();
        if (deploymentTx) {
            console.log("\n⛽ Gas Metrics:");
            console.log("Gas price:", ethers.formatUnits(deploymentTx.gasPrice || 0, "gwei"), "gwei");
        }
        
        console.log("\n📊 Next Steps:");
        console.log("1. Add CompoundStrategy to PortfolioManager with mock addresses");
        console.log("2. Test multi-strategy portfolio operations");
        console.log("3. Verify rebalancing with 3 strategies");
        console.log("4. For mainnet: replace with real Compound addresses");
        
        // Save deployment info
        const deploymentInfo = {
            network: "sepolia",
            timestamp: new Date().toISOString(),
            deployer: deployer.address,
            contracts: {
                CompoundStrategy: compoundStrategyAddress,
                USDC: usdcAddress,
                cUSDC: cUSDCAddress,
                Comptroller: comptrollerAddress,
                COMP: compAddress
            },
            transactionHash: deploymentTx?.hash,
            note: "Mock deployment for testing Phase 4.1 integration"
        };
        
        console.log("\n💾 Deployment Summary:");
        console.log(JSON.stringify(deploymentInfo, null, 2));
        
        console.log("\n🎉 Phase 4.1 CompoundStrategy Mock Deployment Complete!");
        console.log("Ready for PortfolioManager integration testing.");
        
        return {
            compoundStrategy: compoundStrategyAddress,
            usdc: usdcAddress,
            cusdc: cUSDCAddress,
            comptroller: comptrollerAddress,
            comp: compAddress
        };
        
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
