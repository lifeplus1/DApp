const { expect } = require("chai");
const { ethers } = require("hardhat");

/** Edge cases for FeeController & DistributionSplitter */

describe("FeeController + DistributionSplitter Edge Cases", function () {
  let owner, stratA, stratB, recipient1, recipient2, _recipient3;
  let token, feeController, splitter;

  beforeEach(async () => {
    [owner, stratA, stratB, recipient1, recipient2, _recipient3] = await ethers.getSigners();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Mock.deploy("MockUSD", "mUSD");
    await token.mint(stratA.address, ethers.parseUnits("500", 18));
    await token.mint(stratB.address, ethers.parseUnits("500", 18));

    const FeeController = await ethers.getContractFactory("FeeController");
    feeController = await FeeController.deploy(owner.address, owner.address);

    const DistributionSplitter = await ethers.getContractFactory("DistributionSplitter");
    splitter = await DistributionSplitter.deploy(owner.address);
  });

  it("reverts on length mismatch in recipients", async () => {
    await expect(
      splitter.connect(owner).updateRecipients(
        [recipient1.address, recipient2.address],
        [5000] // mismatch
      )
    ).to.be.revertedWith("LEN_MISMATCH");
  });

  it("reverts on bad total weight", async () => {
    await expect(
      splitter.connect(owner).updateRecipients(
        [recipient1.address, recipient2.address],
        [6000, 3000] // sums to 9000
      )
    ).to.be.revertedWith("BAD_TOTAL");
  });

  it("reverts notifyFee with zero amount", async () => {
    await feeController.connect(owner).registerStrategy(stratA.address, true);
    await expect(
      feeController.connect(stratA).notifyFee(token.target, 0)
    ).to.be.revertedWith("NO_AMOUNT");
  });

  it("reverts notifyFee from unauthorized address", async () => {
    await expect(
      feeController.connect(stratA).notifyFee(token.target, 1)
    ).to.be.revertedWith("NOT_STRATEGY");
  });

  it("reverts withdraw with no fees", async () => {
    await expect(
      feeController.withdrawFees(token.target)
    ).to.be.revertedWith("NO_FEES");
  });
});
