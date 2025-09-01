const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Tests FeeController + DistributionSplitter basic flow:
 * 1. Deploy mock token, fee controller, splitter
 * 2. Register strategy, simulate fee notification
 * 3. Withdraw fees to splitter, perform distribution
 */

describe("FeeController + DistributionSplitter", function () {
  let owner, strategy, treasury, incentives, dev, reserve;
  let token, feeController, splitter;

  beforeEach(async () => {
  [owner, strategy, treasury, incentives, dev, reserve] = await ethers.getSigners();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Mock.deploy("MockUSD", "mUSD");
    await token.mint(strategy.address, ethers.parseUnits("1000", 18));

    const FeeController = await ethers.getContractFactory("FeeController");
    feeController = await FeeController.deploy(owner.address, owner.address);

    const DistributionSplitter = await ethers.getContractFactory("DistributionSplitter");
    splitter = await DistributionSplitter.deploy(owner.address);

    // Point fee controller recipient to splitter
    await feeController.connect(owner).setFeeRecipient(splitter.target);

    // Configure splitter recipients (40/40/15/5)
    await splitter.connect(owner).updateRecipients(
      [treasury.address, incentives.address, dev.address, reserve.address],
      [4000, 4000, 1500, 500]
    );

    // Register strategy
    await feeController.connect(owner).registerStrategy(strategy.address, true);
  });

  it("accrues fees and distributes correctly", async () => {
    // Strategy sends fees
    const feeAmount = ethers.parseUnits("100", 18);
    await token.connect(strategy).transfer(feeController.target, feeAmount);
    await feeController.connect(strategy).notifyFee(token.target, feeAmount);

    // Withdraw (forward) fees to splitter
    const balBefore = await token.balanceOf(splitter.target);
    expect(balBefore).to.equal(0n);

    await feeController.connect(owner).withdrawFees(token.target);
    const balAfter = await token.balanceOf(splitter.target);
    expect(balAfter).to.equal(feeAmount);

    // Distribute
    await splitter.distribute(token.target);

    const tBal = await token.balanceOf(treasury.address);
    const iBal = await token.balanceOf(incentives.address);
    const dBal = await token.balanceOf(dev.address);
    const rBal = await token.balanceOf(reserve.address);

    expect(tBal).to.equal(feeAmount * 4000n / 10000n);
    expect(iBal).to.equal(feeAmount * 4000n / 10000n);
    expect(dBal).to.equal(feeAmount * 1500n / 10000n);
    expect(rBal).to.equal(feeAmount * 500n / 10000n);
  });

  it("prevents distribution when not configured properly", async () => {
    // Deploy fresh splitter with no recipients
    const DistributionSplitter = await ethers.getContractFactory("DistributionSplitter");
    const emptySplitter = await DistributionSplitter.deploy(owner.address);
    await expect(emptySplitter.distribute(token.target)).to.be.revertedWith("NO_FUNDS");
  });
});
