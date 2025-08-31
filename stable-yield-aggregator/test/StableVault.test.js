const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StableVault", function () {
  let asset, strategy, vault, owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Mock asset (USDC).
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    asset = await ERC20Mock.deploy("Mock USDC", "mUSDC");
    await asset.waitForDeployment();

    const DummyStrategy = await ethers.getContractFactory("DummyStrategy");
    strategy = await DummyStrategy.deploy(asset.target);
    await strategy.waitForDeployment();

    const StableVault = await ethers.getContractFactory("StableVault");
    vault = await StableVault.deploy(asset.target, strategy.target);
    await vault.waitForDeployment();

    // Mint mock tokens.
    await asset.mint(user.address, ethers.parseEther("1000"));
    await asset.connect(user).approve(vault.target, ethers.parseEther("1000"));
  });

  it("Should deposit and route to strategy", async function () {
    await vault.connect(user).deposit(ethers.parseEther("100"), user.address);
    expect(await vault.totalAssets()).to.equal(ethers.parseEther("100"));
  });

  it("Should harvest yield with fee", async function () {
    await vault.connect(user).deposit(ethers.parseEther("100"), user.address);
    
    // Mint yield tokens to strategy to simulate yield generation
    await asset.mint(strategy.target, ethers.parseEther("1")); // 1% yield
    
    const initialOwnerBalance = await asset.balanceOf(owner.address);
    await vault.harvest(); // Owner harvests.
    
    const finalOwnerBalance = await asset.balanceOf(owner.address);
    const fee = finalOwnerBalance - initialOwnerBalance;
    
    expect(fee).to.be.gt(0); // Should have received some fee
  });

  it("Should withdraw", async function () {
    await vault.connect(user).deposit(ethers.parseEther("100"), user.address);
    await vault.connect(user).withdraw(ethers.parseEther("100"), user.address, user.address);
    expect(await asset.balanceOf(user.address)).to.equal(ethers.parseEther("1000")); // Initial mint.
  });
});
