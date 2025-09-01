const { expect } = require("chai");
const { ethers } = require("hardhat");

/** Multi-strategy fee accrual + withdrawal breakdown */

describe("FeeController Multi-Strategy Withdrawal", function () {
  let owner, stratA, stratB, recipient;
  let token, feeController;

  beforeEach(async () => {
    [owner, stratA, stratB, recipient] = await ethers.getSigners();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Mock.deploy("MockUSD", "mUSD");
    await token.mint(stratA.address, ethers.parseUnits("300", 18));
    await token.mint(stratB.address, ethers.parseUnits("700", 18));

    const FeeController = await ethers.getContractFactory("FeeController");
    feeController = await FeeController.deploy(owner.address, recipient.address);

    await feeController.registerStrategy(stratA.address, true);
    await feeController.registerStrategy(stratB.address, true);
  });

  it("tracks strategies and withdraws with per-strategy events", async () => {
    const amountA = ethers.parseUnits("100", 18);
    const amountB = ethers.parseUnits("200", 18);

    await token.connect(stratA).transfer(feeController.target, amountA);
    await feeController.connect(stratA).notifyFee(token.target, amountA);

    await token.connect(stratB).transfer(feeController.target, amountB);
    await feeController.connect(stratB).notifyFee(token.target, amountB);

    await expect(feeController.withdrawFees(token.target))
      .to.emit(feeController, "FeesWithdrawnPerStrategy")
      .withArgs(stratA.address, token.target, amountA)
      .and.to.emit(feeController, "FeesWithdrawnPerStrategy")
      .withArgs(stratB.address, token.target, amountB)
      .and.to.emit(feeController, "FeesWithdrawn")
      .withArgs(recipient.address, token.target, amountA + amountB);

    const recipientBal = await token.balanceOf(recipient.address);
    expect(recipientBal).to.equal(amountA + amountB);

    // accrued should be zeroed
    const storedA = await feeController.accrued(token.target, stratA.address);
    const storedB = await feeController.accrued(token.target, stratB.address);
    expect(storedA).to.equal(0n);
    expect(storedB).to.equal(0n);
  });

  it("removes strategy and ignores its accrued fees after removal", async () => {
    const amountA = ethers.parseUnits("50", 18);
    const amountB = ethers.parseUnits("75", 18);
    await token.connect(stratA).transfer(feeController.target, amountA);
    await feeController.connect(stratA).notifyFee(token.target, amountA);
    await token.connect(stratB).transfer(feeController.target, amountB);
    await feeController.connect(stratB).notifyFee(token.target, amountB);

    // Remove strategy B before withdrawal
    await feeController.removeStrategy(stratB.address);

    await expect(feeController.withdrawFees(token.target))
      .to.emit(feeController, "FeesWithdrawnPerStrategy")
      .withArgs(stratA.address, token.target, amountA)
      .and.to.emit(feeController, "FeesWithdrawn")
      .withArgs(recipient.address, token.target, amountA);
  });

  it("auto-forwards to distribution splitter if set as recipient", async () => {
    const DistributionSplitter = await ethers.getContractFactory("DistributionSplitter");
    const splitter = await DistributionSplitter.deploy(owner.address);
    await splitter.updateRecipients([recipient.address], [10000]);
    await feeController.setFeeRecipient(splitter.target);

    const amountA = ethers.parseUnits("40", 18);
    await token.connect(stratA).transfer(feeController.target, amountA);
    await feeController.connect(stratA).notifyFee(token.target, amountA);

    await feeController.withdrawFees(token.target); // should trigger distribute
    const bal = await token.balanceOf(recipient.address);
    expect(bal).to.equal(amountA);
  });
});
