const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Integration tests: AaveV3Strategy & CurveStableStrategy harvest sends fees to FeeController.
 * Curve strategy portion uses CRV-like ERC20 as reward; Aave uses underlying growth (simulated via minting extra aTokens).
 * NOTE: Curve strategy interactions are simplified (we'll instantiate with mocks / placeholders if available).
 */

describe("Centralized FeeController Strategy Integration", function () {
  let owner;
  let underlying, feeController;
  let aToken, aavePool, aaveStrategy, aaveRewards;

  beforeEach(async () => {
  [owner] = await ethers.getSigners();

    // Mock underlying asset
    const ERC20Mock = await ethers.getContractFactory("MockERC20");
  underlying = await ERC20Mock.deploy("MockUSD", "mUSD", 18);
  await underlying.mint(owner.address, ethers.parseUnits("1000", 18));

    // Deploy FeeController
    const FeeController = await ethers.getContractFactory("FeeController");
    feeController = await FeeController.deploy(owner.address, owner.address);

    // Mock Aave components (reuse underlying for aToken backing)
    const MockAToken = await ethers.getContractFactory("MockAToken");
  aToken = await MockAToken.deploy("Mock aToken", "maUSD", underlying.target);
    const MockAavePool = await ethers.getContractFactory("MockAavePool");
  aavePool = await MockAavePool.deploy(underlying.target, aToken.target);
  await aToken.setPool(aavePool.target);
  
  // Deploy mock rewards contract
  const MockAaveRewards = await ethers.getContractFactory("MockAaveRewards");
  aaveRewards = await MockAaveRewards.deploy(underlying.target); // Use underlying as reward token for simplicity
  
  // Fund the rewards contract with tokens so it can pay out rewards
  await underlying.mint(aaveRewards.target, ethers.parseUnits("1000", 18));

    // Deploy AaveStrategy
    const AaveStrategy = await ethers.getContractFactory("AaveStrategy");
    aaveStrategy = await AaveStrategy.deploy(
      underlying.target,
      aavePool.target,
      aToken.target,
      aaveRewards.target, // Use proper mock rewards contract
      owner.address, // admin
      owner.address  // portfolio manager
    );

    // Grant manager role to manager signer (admin already owner)
    // DEFAULT_ADMIN_ROLE hashed value per AccessControl; easier to expose setFeeController via admin (owner)
    await aaveStrategy.connect(owner).setFeeController(feeController.target);

    // Register strategy in fee controller
    await feeController.registerStrategy(aaveStrategy.target, true);

    // User approves & deposits
  await underlying.connect(owner).approve(aavePool.target, ethers.parseUnits("500", 18));
  await underlying.connect(owner).approve(aaveStrategy.target, ethers.parseUnits("500", 18));

  // Owner performs deposit (owner is also admin, enabling simplified permissions)
  await aaveStrategy.connect(owner).deposit(ethers.parseUnits("500", 18), owner.address);
  });

  it("harvest collects fee and notifies controller", async () => {
    // Set up rewards for the strategy
    await aaveRewards.setUserRewards(aaveStrategy.target, ethers.parseUnits("10", 18));
    
    // Simulate yield by minting extra aTokens to strategy
    await aToken.connect(owner).mint(aaveStrategy.target, ethers.parseUnits("50", 18));

    const balBefore = await underlying.balanceOf(feeController.target);
    
    // Harvest
    await aaveStrategy.connect(owner).harvest();
    
    const balAfter = await underlying.balanceOf(feeController.target);

    expect(balAfter).to.be.gt(balBefore);
  });
});
