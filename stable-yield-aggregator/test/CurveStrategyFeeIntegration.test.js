const { expect } = require("chai");
const { ethers } = require("hardhat");

/** CurveStableStrategy -> FeeController integration using mocks */

describe("CurveStableStrategy Fee Integration", function () {
  let owner, vault;
  let usdc, dai, usdt, lp, crv, pool, gauge, feeController, curveStrategy;

  beforeEach(async () => {
    [owner, vault] = await ethers.getSigners();
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    usdc = await ERC20Mock.deploy("MockUSDC", "mUSDC");
    dai = await ERC20Mock.deploy("MockDAI", "mDAI");
    usdt = await ERC20Mock.deploy("MockUSDT", "mUSDT");

    const MockLPToken = await ethers.getContractFactory("MockLPToken");
    lp = await MockLPToken.deploy();
    const MockCRV = await ethers.getContractFactory("MockCRV");
    crv = await MockCRV.deploy();

    const MockCurvePool = await ethers.getContractFactory("MockCurvePool");
  pool = await MockCurvePool.deploy(dai.target, usdc.target, usdt.target, lp.target);
    const MockCurveGauge = await ethers.getContractFactory("MockCurveGauge");
  gauge = await MockCurveGauge.deploy(lp.target, crv.target);
  await crv.setMinter(gauge.target, true);

  // authorize pool & gauge as LP minters
  await lp.setMinter(pool.target, true);
  await lp.setMinter(gauge.target, true);

    // Mint USDC to vault and approve
    await usdc.mint(vault.address, ethers.parseUnits("1000", 18));
    await usdc.connect(vault).approve(pool.target, ethers.parseUnits("500", 18));
    await usdc.connect(vault).approve(gauge.target, ethers.parseUnits("500", 18));

    const FeeController = await ethers.getContractFactory("FeeController");
    feeController = await FeeController.deploy(owner.address, owner.address);

    const CurveStableStrategy = await ethers.getContractFactory("CurveStableStrategy");
    curveStrategy = await CurveStableStrategy.deploy(
      usdc.target,
      vault.address,
      pool.target,
      gauge.target,
      lp.target,
      crv.target,
      owner.address
    );

    // Wire fee controller
    await curveStrategy.setFeeController(feeController.target);
    await feeController.registerStrategy(curveStrategy.target, true);

    // Approvals for strategy deposit path (vault role)
    await usdc.connect(vault).approve(curveStrategy.target, ethers.parseUnits("500", 18));
  });

  it("harvest routes CRV fee portion to controller", async () => {
    // Deposit via vault (uses USDC index 1 path only)
    await curveStrategy.connect(vault).deposit(ethers.parseUnits("200", 18), vault.address);

    // Simulate rewards: gauge deposit already minted CRV pending; trigger claim via harvest
    const controllerCRVBefore = await crv.balanceOf(feeController.target);
    await curveStrategy.harvest();
    const controllerCRVAfter = await crv.balanceOf(feeController.target);
    expect(controllerCRVAfter).to.be.gt(controllerCRVBefore);
  });
});
