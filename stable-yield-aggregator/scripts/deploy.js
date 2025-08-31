const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts...");
  
  // Deploy mock USDC first for testing (on testnets)
  const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
  const mockUSDC = await ERC20Mock.deploy("Mock USDC", "mUSDC");
  await mockUSDC.waitForDeployment();
  console.log(`Mock USDC deployed to: ${await mockUSDC.getAddress()}`);

  // For mainnet, use real USDC: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
  const usdcAddress = await mockUSDC.getAddress();
  
  // Deploy strategy
  const DummyStrategy = await hre.ethers.getContractFactory("DummyStrategy");
  const dummyStrategy = await DummyStrategy.deploy(usdcAddress);
  await dummyStrategy.waitForDeployment();
  console.log(`DummyStrategy deployed to: ${await dummyStrategy.getAddress()}`);

  // Deploy vault
  const StableVault = await hre.ethers.getContractFactory("StableVault");
  const vault = await StableVault.deploy(usdcAddress, await dummyStrategy.getAddress());
  await vault.waitForDeployment();
  console.log(`StableVault deployed to: ${await vault.getAddress()}`);

  // Mint some test tokens to deployer for testing
  const [deployer] = await hre.ethers.getSigners();
  await mockUSDC.mint(deployer.address, hre.ethers.parseEther("10000"));
  console.log(`Minted 10,000 mUSDC to deployer: ${deployer.address}`);

  console.log("\n=== Deployment Summary ===");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Mock USDC: ${await mockUSDC.getAddress()}`);
  console.log(`Strategy: ${await dummyStrategy.getAddress()}`);
  console.log(`Vault: ${await vault.getAddress()}`);
  console.log(`Deployer: ${deployer.address}`);
}

// Best practice: Error handling.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
