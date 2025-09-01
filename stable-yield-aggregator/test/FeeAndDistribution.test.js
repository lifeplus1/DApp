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

    // Verify fee controller has the tokens
    const feeControllerBalance = await token.balanceOf(feeController.target);
    expect(feeControllerBalance).to.equal(feeAmount);
    console.log("Fee controller balance before withdraw:", feeControllerBalance.toString());

    // Withdraw (forward) fees to splitter
    const balBefore = await token.balanceOf(splitter.target);
    expect(balBefore).to.equal(0n);

    console.log("Calling withdrawFees...");
    console.log("Strategy address:", strategy.address);
    console.log("Is strategy registered:", await feeController.isStrategy(strategy.address));
    console.log("Fee recipient:", await feeController.feeRecipient());
    console.log("Splitter address:", splitter.target);
    
    // Try to see accrued amount for this strategy
    const accruedAmount = await feeController.accrued(token.target, strategy.address);
    console.log("Accrued amount for strategy:", accruedAmount.toString());
    
    await feeController.connect(owner).withdrawFees(token.target);
    
    // FeeController auto-calls distribute(), so check final recipient balances
    const treasuryBal = await token.balanceOf(treasury.address);
    const incentivesBal = await token.balanceOf(incentives.address);
    const devBal = await token.balanceOf(dev.address);
    const reserveBal = await token.balanceOf(reserve.address);

    // Verify correct distribution percentages
    expect(treasuryBal).to.equal(feeAmount * 4000n / 10000n);
    expect(incentivesBal).to.equal(feeAmount * 4000n / 10000n);
    expect(devBal).to.equal(feeAmount * 1500n / 10000n);
    expect(reserveBal).to.equal(feeAmount * 500n / 10000n);

    // Verify fee controller and splitter are empty after distribution
    const feeControllerBalanceFinal = await token.balanceOf(feeController.target);
    const splitterBalanceFinal = await token.balanceOf(splitter.target);
    expect(feeControllerBalanceFinal).to.equal(0n);
    expect(splitterBalanceFinal).to.equal(0n);
  });

  it("prevents distribution when not configured properly", async () => {
    // Deploy fresh splitter with no recipients
    const DistributionSplitter = await ethers.getContractFactory("DistributionSplitter");
    const emptySplitter = await DistributionSplitter.deploy(owner.address);
    await expect(emptySplitter.distribute(token.target)).to.be.revertedWith("NO_FUNDS");
  });
});
