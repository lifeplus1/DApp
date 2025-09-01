const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompoundStrategy", function () {
    let compoundStrategy;
    let mockUSDC;
    let mockCUSDC;
    let mockComptroller;
    let mockCompToken;
    let owner;
    let user1;
    let user2;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy mock USDC token
        const MockToken = await ethers.getContractFactory("MockToken");
        mockUSDC = await MockToken.deploy("USD Coin", "USDC", 6);
        await mockUSDC.waitForDeployment();

        // Deploy mock COMP token
        mockCompToken = await MockToken.deploy("Compound", "COMP", 18);
        await mockCompToken.waitForDeployment();

        // Deploy mock cUSDC
        const MockCToken = await ethers.getContractFactory("MockCToken");
        mockCUSDC = await MockCToken.deploy(await mockUSDC.getAddress());
        await mockCUSDC.waitForDeployment();

        // Deploy mock Comptroller
        const MockComptroller = await ethers.getContractFactory("MockComptroller");
        mockComptroller = await MockComptroller.deploy(await mockCompToken.getAddress());
        await mockComptroller.waitForDeployment();

        // Deploy CompoundStrategy
        const CompoundStrategy = await ethers.getContractFactory("CompoundStrategy");
        compoundStrategy = await CompoundStrategy.deploy(
            await mockUSDC.getAddress(),
            await mockCUSDC.getAddress(),
            await mockComptroller.getAddress()
        );
        await compoundStrategy.waitForDeployment();

        // Mint USDC to users for testing
        await mockUSDC.mint(user1.address, ethers.parseUnits("10000", 6));
        await mockUSDC.mint(user2.address, ethers.parseUnits("5000", 6));
        
        // Mint some USDC to the mock cToken for liquidity
        await mockUSDC.mint(await mockCUSDC.getAddress(), ethers.parseUnits("100000", 6));
    });

    describe("Deployment", function () {
        it("Should set the correct asset address", async function () {
            expect(await compoundStrategy.asset()).to.equal(await mockUSDC.getAddress());
        });

        it("Should set the correct strategy info", async function () {
            const [name, version, description] = await compoundStrategy.getStrategyInfo();
            expect(name).to.equal("CompoundStrategy");
            expect(version).to.equal("1.0.0");
            expect(description).to.equal("Compound Finance USDC lending strategy with COMP rewards");
        });

        it("Should initialize with zero total assets", async function () {
            expect(await compoundStrategy.totalAssets()).to.equal(0);
        });

        it("Should be active by default", async function () {
            expect(await compoundStrategy.active()).to.be.true;
            expect(await compoundStrategy.emergencyMode()).to.be.false;
        });
    });

    describe("Deposits", function () {
        beforeEach(async function () {
            // Approve strategy to spend USDC
            await mockUSDC.connect(user1).approve(await compoundStrategy.getAddress(), ethers.parseUnits("1000", 6));
        });

        it("Should accept valid deposits", async function () {
            const depositAmount = ethers.parseUnits("100", 6);
            
            await expect(compoundStrategy.connect(user1).deposit(depositAmount, user1.address))
                .to.emit(compoundStrategy, "Deposit");

            expect(await compoundStrategy.shares(user1.address)).to.be.gt(0);
            expect(await compoundStrategy.totalAssets()).to.be.gt(0);
        });

        it("Should reject deposits when inactive", async function () {
            await compoundStrategy.toggleActive();
            
            const depositAmount = ethers.parseUnits("100", 6);
            
            await expect(
                compoundStrategy.connect(user1).deposit(depositAmount, user1.address)
            ).to.be.revertedWith("Strategy not active");
        });

        it("Should reject zero deposits", async function () {
            await expect(
                compoundStrategy.connect(user1).deposit(0, user1.address)
            ).to.be.revertedWith("Amount must be > 0");
        });

        it("Should handle multiple deposits correctly", async function () {
            const depositAmount1 = ethers.parseUnits("100", 6);
            const depositAmount2 = ethers.parseUnits("200", 6);
            
            await compoundStrategy.connect(user1).deposit(depositAmount1, user1.address);
            const sharesAfterFirst = await compoundStrategy.shares(user1.address);
            
            await compoundStrategy.connect(user1).deposit(depositAmount2, user1.address);
            const sharesAfterSecond = await compoundStrategy.shares(user1.address);
            
            expect(sharesAfterSecond).to.be.gt(sharesAfterFirst);
        });
    });

    describe("Withdrawals", function () {
        beforeEach(async function () {
            // Setup initial deposit
            const depositAmount = ethers.parseUnits("200", 6);
            await mockUSDC.connect(user1).approve(await compoundStrategy.getAddress(), depositAmount);
            await compoundStrategy.connect(user1).deposit(depositAmount, user1.address);
        });

        it("Should allow valid withdrawals", async function () {
            const userShares = await compoundStrategy.shares(user1.address);
            const halfShares = userShares / 2n;
            
            const balanceBefore = await mockUSDC.balanceOf(user1.address);
            
            await expect(
                compoundStrategy.connect(user1).withdraw(halfShares, user1.address, user1.address)
            ).to.emit(compoundStrategy, "Withdraw");
            
            const balanceAfter = await mockUSDC.balanceOf(user1.address);
            expect(balanceAfter).to.be.gt(balanceBefore);
        });

        it("Should reject withdrawal of more shares than owned", async function () {
            const userShares = await compoundStrategy.shares(user1.address);
            const excessShares = userShares + 1n;
            
            await expect(
                compoundStrategy.connect(user1).withdraw(excessShares, user1.address, user1.address)
            ).to.be.revertedWith("Insufficient shares");
        });

        it("Should reject zero share withdrawals", async function () {
            await expect(
                compoundStrategy.connect(user1).withdraw(0, user1.address, user1.address)
            ).to.be.revertedWith("Shares must be > 0");
        });
    });

    describe("Harvesting", function () {
        beforeEach(async function () {
            // Setup initial deposit
            const depositAmount = ethers.parseUnits("1000", 6);
            await mockUSDC.connect(user1).approve(await compoundStrategy.getAddress(), depositAmount);
            await compoundStrategy.connect(user1).deposit(depositAmount, user1.address);
            
            // Mint some COMP rewards to comptroller for claiming
            await mockCompToken.mint(await mockComptroller.getAddress(), ethers.parseEther("10"));
        });

        it("Should harvest COMP rewards", async function () {
            // Fast forward time to pass harvest cooldown
            await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
            await ethers.provider.send("evm_mine");
            
            const totalAssetsBefore = await compoundStrategy.totalAssets();
            
            await expect(compoundStrategy.harvest())
                .to.emit(compoundStrategy, "Harvest");
            
            const totalAssetsAfter = await compoundStrategy.totalAssets();
            expect(totalAssetsAfter).to.be.gte(totalAssetsBefore);
        });

        it("Should respect harvest cooldown", async function () {
            await expect(compoundStrategy.harvest())
                .to.be.revertedWith("Harvest too frequent");
        });
    });

    describe("Emergency Functions", function () {
        beforeEach(async function () {
            // Setup initial deposit
            const depositAmount = ethers.parseUnits("500", 6);
            await mockUSDC.connect(user1).approve(await compoundStrategy.getAddress(), depositAmount);
            await compoundStrategy.connect(user1).deposit(depositAmount, user1.address);
        });

        it("Should allow owner to emergency withdraw", async function () {
            const ownerBalanceBefore = await mockUSDC.balanceOf(owner.address);
            
            await expect(compoundStrategy.emergencyWithdraw())
                .to.emit(compoundStrategy, "EmergencyWithdraw");
            
            const ownerBalanceAfter = await mockUSDC.balanceOf(owner.address);
            expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
            expect(await compoundStrategy.emergencyMode()).to.be.true;
        });

        it("Should reject emergency withdraw from non-owner", async function () {
            await expect(compoundStrategy.connect(user1).emergencyWithdraw())
                .to.be.revertedWithCustomError(compoundStrategy, "OwnableUnauthorizedAccount")
                .withArgs(user1.address);
        });
    });

    describe("Administration", function () {
        it("Should allow owner to update performance fee", async function () {
            const newFee = 300; // 3%
            
            await expect(compoundStrategy.updatePerformanceFee(newFee))
                .to.emit(compoundStrategy, "ParameterUpdated")
                .withArgs("performanceFee", 200, newFee);
            
            expect(await compoundStrategy.performanceFee()).to.equal(newFee);
        });

        it("Should reject excessive performance fees", async function () {
            await expect(compoundStrategy.updatePerformanceFee(1500)) // 15%
                .to.be.revertedWith("Fee too high");
        });

        it("Should allow owner to toggle active status", async function () {
            expect(await compoundStrategy.active()).to.be.true;
            
            await compoundStrategy.toggleActive();
            expect(await compoundStrategy.active()).to.be.false;
            
            await compoundStrategy.toggleActive();
            expect(await compoundStrategy.active()).to.be.true;
        });

        it("Should allow owner to exit emergency mode", async function () {
            // Enter emergency mode first
            await compoundStrategy.emergencyWithdraw();
            expect(await compoundStrategy.emergencyMode()).to.be.true;
            
            // Exit emergency mode
            await compoundStrategy.exitEmergencyMode();
            expect(await compoundStrategy.emergencyMode()).to.be.false;
        });
    });

    describe("Performance Metrics", function () {
        it("Should track performance metrics accurately", async function () {
            const depositAmount = ethers.parseUnits("300", 6);
            await mockUSDC.connect(user1).approve(await compoundStrategy.getAddress(), depositAmount);
            await compoundStrategy.connect(user1).deposit(depositAmount, user1.address);
            
            const metrics = await compoundStrategy.getPerformanceMetrics();
            expect(metrics._totalDeposited).to.equal(depositAmount);
            expect(metrics._totalShares).to.be.gt(0);
            expect(metrics._totalAssets).to.be.gt(0);
        });

        it("Should report current APY from Compound", async function () {
            const apy = await compoundStrategy.getAPY();
            expect(apy).to.be.gte(0);
        });
    });

    describe("IStrategyV2 Compliance", function () {
        it("Should implement all required interface functions", async function () {
            const depositAmount = ethers.parseUnits("100", 6);
            await mockUSDC.connect(user1).approve(await compoundStrategy.getAddress(), depositAmount);
            
            // Test deposit
            const shares = await compoundStrategy.connect(user1).deposit.staticCall(depositAmount, user1.address);
            expect(shares).to.be.gt(0);
            
            await compoundStrategy.connect(user1).deposit(depositAmount, user1.address);
            
            // Test withdraw
            const assets = await compoundStrategy.connect(user1).withdraw.staticCall(shares, user1.address, user1.address);
            expect(assets).to.be.gt(0);
            
            // Test totalAssets
            const totalAssets = await compoundStrategy.totalAssets();
            expect(totalAssets).to.be.gt(0);
            
            // Test getAPY
            const apy = await compoundStrategy.getAPY();
            expect(apy).to.be.gte(0);
            
            // Test getStrategyInfo
            const [name, version, description] = await compoundStrategy.getStrategyInfo();
            expect(name).to.not.be.empty;
            expect(version).to.not.be.empty;
            expect(description).to.not.be.empty;
        });
    });
});
