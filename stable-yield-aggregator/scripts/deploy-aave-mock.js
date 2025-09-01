const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🏗️  Deploying Aave Mock Contracts for AaveStrategy Testing...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // 1. Deploy Mock AAVE reward token
    console.log("1️⃣  Deploying Mock AAVE Token...");
    const MockToken = await ethers.getContractFactory("MockToken");
    const mockAAVE = await MockToken.deploy("Mock AAVE Token", "AAVE", 18);
    await mockAAVE.waitForDeployment();
    console.log("✅ Mock AAVE deployed to:", await mockAAVE.getAddress());
    
    // Mint some AAVE tokens to deployer
    const aaveAmount = ethers.parseEther("1000000");
    await mockAAVE.mint(deployer.address, aaveAmount);
    console.log("💰 Minted", ethers.formatEther(aaveAmount), "AAVE tokens to deployer");

    // 2. Get USDC token (from existing deployment)
    const USDC_ADDRESS = "0x3F2178618013EeFE109857aB3eC83049C90968bA"; // Mock USDC from Sepolia
    console.log("2️⃣  Using Mock USDC at:", USDC_ADDRESS);

    // 3. Deploy Mock aUSDC Token
    console.log("3️⃣  Deploying Mock aUSDC Token...");
    const MockAToken = await ethers.getContractFactory("MockAToken");
    const mockAUSDC = await MockAToken.deploy("Mock Aave USDC", "aUSDC", USDC_ADDRESS);
    await mockAUSDC.waitForDeployment();
    console.log("✅ Mock aUSDC deployed to:", await mockAUSDC.getAddress());

    // 4. Deploy Mock Aave Pool
    console.log("4️⃣  Deploying Mock Aave Pool...");
    const MockAavePool = await ethers.getContractFactory("MockAavePool");
    const mockAavePool = await MockAavePool.deploy(USDC_ADDRESS, await mockAUSDC.getAddress());
    await mockAavePool.waitForDeployment();
    console.log("✅ Mock Aave Pool deployed to:", await mockAavePool.getAddress());

    // 5. Deploy Mock Aave Rewards
    console.log("5️⃣  Deploying Mock Aave Rewards...");
    const MockAaveRewards = await ethers.getContractFactory("MockAaveRewards");
    const mockAaveRewards = await MockAaveRewards.deploy(await mockAAVE.getAddress());
    await mockAaveRewards.waitForDeployment();
    console.log("✅ Mock Aave Rewards deployed to:", await mockAaveRewards.getAddress());

    // 6. Set up mock contracts - grant pool permission to aToken
    console.log("\n6️⃣  Setting up contract permissions...");
    await mockAUSDC.transferOwnership(await mockAavePool.getAddress());
    console.log("✅ aUSDC ownership transferred to Pool");

    // 7. Fund rewards contract
    console.log("7️⃣  Funding rewards contract...");
    const rewardAmount = ethers.parseEther("10000"); // 10k AAVE tokens
    
    try {
        await mockAAVE.approve(await mockAaveRewards.getAddress(), rewardAmount);
        console.log("✅ Approved rewards contract to spend AAVE tokens");
        
        await mockAaveRewards.fundRewards(rewardAmount);
        console.log("✅ Rewards contract funded with", ethers.formatEther(rewardAmount), "AAVE tokens");
    } catch (error) {
        console.log("⚠️  Could not fund rewards contract:", error.message);
        console.log("📝 You can fund it manually later with fundRewards()");
    }

    // 8. Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            mockAAVE: await mockAAVE.getAddress(),
            mockUSDC: USDC_ADDRESS,
            mockAUSDC: await mockAUSDC.getAddress(),
            mockAavePool: await mockAavePool.getAddress(),
            mockAaveRewards: await mockAaveRewards.getAddress()
        }
    };

    console.log("\n📋 Deployment Summary:");
    console.log("=====================================");
    console.log("Network:", hre.network.name);
    console.log("Mock AAVE Token:", await mockAAVE.getAddress());
    console.log("Mock USDC Token:", USDC_ADDRESS);
    console.log("Mock aUSDC Token:", await mockAUSDC.getAddress());
    console.log("Mock Aave Pool:", await mockAavePool.getAddress());
    console.log("Mock Aave Rewards:", await mockAaveRewards.getAddress());
    
    // Write to deployments file
    const fs = require('fs');
    const deploymentsPath = './deployments';
    if (!fs.existsSync(deploymentsPath)) {
        fs.mkdirSync(deploymentsPath);
    }
    
    fs.writeFileSync(
        `${deploymentsPath}/aave-mock-${hre.network.name}.json`,
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n✅ Mock Aave contracts deployment complete!");
    console.log("📄 Deployment info saved to:", `deployments/aave-mock-${hre.network.name}.json`);
    
    return deploymentInfo;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
