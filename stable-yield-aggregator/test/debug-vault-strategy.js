const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Debug Vault-Strategy Integration", function () {
  let usdc, vault, strategy, owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock USDC
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    usdc = await ERC20Mock.deploy("USDC", "USDC");
    await usdc.waitForDeployment();
    
    // Deploy strategy first
    const LiveUniswapV3Strategy = await ethers.getContractFactory("LiveUniswapV3Strategy");
    strategy = await LiveUniswapV3Strategy.deploy(usdc.target);
    await strategy.waitForDeployment();
    
    // Deploy Vault with strategy
    const StableVault = await ethers.getContractFactory("StableVault");
    vault = await StableVault.deploy(usdc.target, strategy.target);
    await vault.waitForDeployment();

    // Mint USDC to user
    await usdc.mint(user.address, ethers.parseUnits("1000", 18));
    await usdc.connect(user).approve(vault.target, ethers.parseUnits("1000", 18));
  });

  it("Should debug vault-strategy deposit and withdrawal flow", async function () {
    const depositAmount = ethers.parseUnits("100", 18);

    console.log("=== BEFORE DEPOSIT ===");
    console.log("User USDC balance:", ethers.formatUnits(await usdc.balanceOf(user.address), 18));
    console.log("Vault USDC balance:", ethers.formatUnits(await usdc.balanceOf(vault.target), 18));
    console.log("Strategy USDC balance:", ethers.formatUnits(await usdc.balanceOf(strategy.target), 18));
    console.log("Vault shares for user:", ethers.formatUnits(await vault.balanceOf(user.address), 18));
    console.log("Strategy balance (value) for vault:", ethers.formatUnits(await strategy.balanceOf(vault.target), 18));

    // Deposit through vault
    await vault.connect(user).deposit(depositAmount, user.address);

    console.log("\n=== AFTER DEPOSIT ===");
    console.log("User USDC balance:", ethers.formatUnits(await usdc.balanceOf(user.address), 18));
    console.log("Vault USDC balance:", ethers.formatUnits(await usdc.balanceOf(vault.target), 18));
    console.log("Strategy USDC balance:", ethers.formatUnits(await usdc.balanceOf(strategy.target), 18));
    console.log("Vault shares for user:", ethers.formatUnits(await vault.balanceOf(user.address), 18));
    console.log("Strategy balance (value) for vault:", ethers.formatUnits(await strategy.balanceOf(vault.target), 18));
    console.log("Strategy total shares:", ethers.formatUnits(await strategy.totalShares(), 18));
    
    // Get actual user shares from strategy
    const vaultShares = await strategy.userShares(vault.target);
    console.log("Actual vault shares in strategy:", ethers.formatUnits(vaultShares, 18));

    const userShares = await vault.balanceOf(user.address);

    console.log("\n=== ATTEMPTING WITHDRAWAL ===");
    console.log("User shares in vault:", ethers.formatUnits(userShares, 18));
    console.log("Attempting to redeem:", ethers.formatUnits(userShares, 18), "shares");
    console.log("Vault address:", vault.target);
    
    // Check what the vault will try to withdraw from strategy
    const totalAssetsBeforeWithdraw = await vault.totalAssets();
    const vaultTotalShares = await vault.totalSupply();
    console.log("Vault total assets:", ethers.formatUnits(totalAssetsBeforeWithdraw, 18));
    console.log("Vault total supply:", ethers.formatUnits(vaultTotalShares, 18));
    
    // This shows how much assets the vault will try to withdraw from strategy
    const assetsToWithdraw = await vault.convertToAssets(userShares);
    console.log("Assets vault will try to withdraw from strategy:", ethers.formatUnits(assetsToWithdraw, 18));
    
    // Let's also check strategy calculations using the NEW vault logic
    const strategyTotalAssets = await strategy.totalAssets();
    const vaultTotalSharesDebug = await vault.totalSupply();
    const sharesToWithdraw = (strategyTotalAssets * userShares) / vaultTotalSharesDebug;
    
    console.log("Strategy total assets:", ethers.formatUnits(strategyTotalAssets, 18));
    console.log("Vault total shares:", ethers.formatUnits(vaultTotalSharesDebug, 18));
    console.log("User shares:", ethers.formatUnits(userShares, 18));
    console.log("NEW calculation - shares to withdraw:", ethers.formatUnits(sharesToWithdraw, 18));
    console.log("Vault actually owns strategy shares:", ethers.formatUnits(vaultShares, 18));
    
    // Calculate what the CORRECT withdrawal should be
    const correctWithdrawal = (vaultShares * userShares) / vaultTotalSharesDebug;
    console.log("CORRECT calculation - should withdraw:", ethers.formatUnits(correctWithdrawal, 18), "strategy shares");

    try {
      await vault.connect(user).redeem(userShares, user.address, user.address);
      console.log("✅ Withdrawal successful");
    } catch (error) {
      console.log("❌ Withdrawal failed:", error.message);
    }

    console.log("\n=== AFTER WITHDRAWAL ATTEMPT ===");
    console.log("User USDC balance:", ethers.formatUnits(await usdc.balanceOf(user.address), 18));
    console.log("Vault USDC balance:", ethers.formatUnits(await usdc.balanceOf(vault.target), 18));
    console.log("Strategy USDC balance:", ethers.formatUnits(await usdc.balanceOf(strategy.target), 18));
  });
});
