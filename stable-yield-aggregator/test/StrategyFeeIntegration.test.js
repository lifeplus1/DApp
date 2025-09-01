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
  let aToken, aavePool, aaveStrategy;

  beforeEach(async () => {
  [owner] = await ethers.getSigners();

    // Deploy mock underlying
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  underlying = await ERC20Mock.deploy("MockUSD", "mUSD");
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

    // Deploy AaveV3Strategy (using mock addresses; debtToken, oracle left as zero for simplicity)
    const AaveV3Strategy = await ethers.getContractFactory("AaveV3Strategy");
    aaveStrategy = await AaveV3Strategy.deploy(
      underlying.target,
      aavePool.target,
      aToken.target,
      ethers.ZeroAddress, // debt token not used in simplified test path
      ethers.ZeroAddress, // oracle not used for fee logic
      owner.address
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
    // Simulate yield by minting extra aTokens to strategy via mock owner (owner of aToken)
    await aToken.connect(owner).mint(aaveStrategy.target, ethers.parseUnits("50", 18));

    const balBefore = await underlying.balanceOf(feeController.target);
    // Harvest (needs manager role); manager isn't set explicitly so owner (admin) calls
    await aaveStrategy.connect(owner).harvest();
    const balAfter = await underlying.balanceOf(feeController.target);

    expect(balAfter).to.be.gt(balBefore);
  });
});
