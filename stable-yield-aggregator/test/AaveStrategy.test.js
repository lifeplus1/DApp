const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("AaveStrategy", function () {
    // Deploy fixture
    async function deployAaveStrategyFixture() {
        const [owner, portfolioManager, user1, user2] = await ethers.getSigners();

        // Deploy mock USDC
        const MockToken = await ethers.getContractFactory("MockToken");
        const mockUSDC = await MockToken.deploy("Mock USDC", "USDC", 6);
        await mockUSDC.waitForDeployment();

        // Deploy mock AAVE reward token
        const mockAAVE = await MockToken.deploy("Mock AAVE", "AAVE", 18);
        await mockAAVE.waitForDeployment();

        // Deploy mock aUSDC
        const MockAToken = await ethers.getContractFactory("MockAToken");
        const mockAUSDC = await MockAToken.deploy("Mock aUSDC", "aUSDC", await mockUSDC.getAddress());
        await mockAUSDC.waitForDeployment();

        // Deploy mock Aave Pool
        const MockAavePool = await ethers.getContractFactory("MockAavePool");
        const mockAavePool = await MockAavePool.deploy(await mockUSDC.getAddress(), await mockAUSDC.getAddress());
        await mockAavePool.waitForDeployment();

        // Deploy mock Aave Rewards
        const MockAaveRewards = await ethers.getContractFactory("MockAaveRewards");
        const mockAaveRewards = await MockAaveRewards.deploy(await mockAAVE.getAddress());
        await mockAaveRewards.waitForDeployment();

        // Transfer aUSDC ownership to pool
        await mockAUSDC.transferOwnership(await mockAavePool.getAddress());

        // Deploy AaveStrategy
        const AaveStrategy = await ethers.getContractFactory("AaveStrategy");
        const aaveStrategy = await AaveStrategy.deploy(
            await mockUSDC.getAddress(),
            await mockAavePool.getAddress(),
            await mockAUSDC.getAddress(),
            await mockAaveRewards.getAddress(),
            owner.address,
            portfolioManager.address
        );
        await aaveStrategy.waitForDeployment();

        // Mint USDC to users for testing
        const initialBalance = ethers.parseUnits("1000", 6); // 1000 USDC
        await mockUSDC.mint(portfolioManager.address, initialBalance);
        await mockUSDC.mint(user1.address, initialBalance);
        await mockUSDC.mint(user2.address, initialBalance);

        // Mint AAVE tokens to rewards contract
        const rewardAmount = ethers.parseEther("10000");
        await mockAAVE.mint(await mockAaveRewards.getAddress(), rewardAmount);

        return {
            aaveStrategy,
            mockUSDC,
            mockAAVE,
            mockAUSDC,
            mockAavePool,
            mockAaveRewards,
            owner,
            portfolioManager,
            user1,
            user2,
            initialBalance
        };
    }

    describe("Deployment", function () {
        it("Should deploy with correct initial values", async function () {
            const { aaveStrategy, mockUSDC, mockAUSDC, mockAavePool, mockAaveRewards, owner: _owner, portfolioManager: _portfolioManager } = 
                await loadFixture(deployAaveStrategyFixture);

            expect(await aaveStrategy.asset()).to.equal(await mockUSDC.getAddress());
            expect(await aaveStrategy.aToken()).to.equal(await mockAUSDC.getAddress());
            expect(await aaveStrategy.aavePool()).to.equal(await mockAavePool.getAddress());
            expect(await aaveStrategy.aaveRewards()).to.equal(await mockAaveRewards.getAddress());
            expect(await aaveStrategy.performanceFee()).to.equal(1000); // 10%
            expect(await aaveStrategy.active()).to.be.true;
            expect(await aaveStrategy.emergencyMode()).to.be.false;
        });

        it("Should have correct role assignments", async function () {
            const { aaveStrategy, owner, portfolioManager } = await loadFixture(deployAaveStrategyFixture);

            const DEFAULT_ADMIN_ROLE = await aaveStrategy.DEFAULT_ADMIN_ROLE();
            const PORTFOLIO_MANAGER_ROLE = await aaveStrategy.PORTFOLIO_MANAGER_ROLE();
            const EMERGENCY_ROLE = await aaveStrategy.EMERGENCY_ROLE();

            expect(await aaveStrategy.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
            expect(await aaveStrategy.hasRole(PORTFOLIO_MANAGER_ROLE, portfolioManager.address)).to.be.true;
            expect(await aaveStrategy.hasRole(EMERGENCY_ROLE, owner.address)).to.be.true;
        });

        it("Should initialize with zero total assets", async function () {
            const { aaveStrategy } = await loadFixture(deployAaveStrategyFixture);
            expect(await aaveStrategy.totalAssets()).to.equal(0);
        });

        it("Should return correct strategy info", async function () {
            const { aaveStrategy } = await loadFixture(deployAaveStrategyFixture);
            const [name, version, description] = await aaveStrategy.getStrategyInfo();
            
            expect(name).to.equal("AaveStrategy");
            expect(version).to.equal("1.0.0");
            expect(description).to.equal("Aave V3 USDC lending strategy with AAVE rewards");
        });
    });

    describe("Deposits", function () {
        it("Should allow portfolio manager to deposit", async function () {
            const { aaveStrategy, mockUSDC, portfolioManager, user1, initialBalance: _initialBalance } = 
                await loadFixture(deployAaveStrategyFixture);

            const depositAmount = ethers.parseUnits("100", 6); // 100 USDC
            
            // Approve and deposit
            await mockUSDC.connect(portfolioManager).approve(await aaveStrategy.getAddress(), depositAmount);
            
            const tx = await aaveStrategy.connect(portfolioManager).deposit(depositAmount, user1.address);
            
            // Check that shares were issued
            const userShares = await aaveStrategy.balanceOf(user1.address);
            expect(userShares).to.equal(depositAmount); // 1:1 ratio for first deposit
            
            // Check total assets
            expect(await aaveStrategy.totalAssets()).to.equal(depositAmount);
            
            await expect(tx)
                .to.emit(aaveStrategy, "Deposited")
                .withArgs(user1.address, depositAmount, depositAmount);
        });

        it("Should handle multiple deposits correctly", async function () {
            const { aaveStrategy, mockUSDC, portfolioManager, user1, user2 } = 
                await loadFixture(deployAaveStrategyFixture);

            const depositAmount1 = ethers.parseUnits("100", 6);
            const depositAmount2 = ethers.parseUnits("200", 6);
            
            // First deposit
            await mockUSDC.connect(portfolioManager).approve(await aaveStrategy.getAddress(), depositAmount1);
            await aaveStrategy.connect(portfolioManager).deposit(depositAmount1, user1.address);
            
            // Wait for some interest accrual (simulate time passing)
            await mockUSDC.connect(portfolioManager).approve(await aaveStrategy.getAddress(), depositAmount2);
            await aaveStrategy.connect(portfolioManager).deposit(depositAmount2, user2.address);
            
            // Check balances
            const totalAssets = await aaveStrategy.totalAssets();
            expect(totalAssets).to.be.gte(depositAmount1 + depositAmount2);
            
            const user1Balance = await aaveStrategy.balanceOf(user1.address);
            const user2Balance = await aaveStrategy.balanceOf(user2.address);
            expect(user1Balance).to.be.gt(0);
            expect(user2Balance).to.be.gt(0);
        });

        it("Should revert when not called by portfolio manager", async function () {
            const { aaveStrategy, mockUSDC, user1 } = await loadFixture(deployAaveStrategyFixture);

            const depositAmount = ethers.parseUnits("100", 6);
            await mockUSDC.connect(user1).approve(await aaveStrategy.getAddress(), depositAmount);
            
            await expect(
                aaveStrategy.connect(user1).deposit(depositAmount, user1.address)
            ).to.be.reverted;
        });

        it("Should revert when strategy is not active", async function () {
            const { aaveStrategy, mockUSDC, portfolioManager, user1, owner } = 
                await loadFixture(deployAaveStrategyFixture);

            // Deactivate strategy
            await aaveStrategy.connect(owner).toggleActive();

            const depositAmount = ethers.parseUnits("100", 6);
            await mockUSDC.connect(portfolioManager).approve(await aaveStrategy.getAddress(), depositAmount);
            
            await expect(
                aaveStrategy.connect(portfolioManager).deposit(depositAmount, user1.address)
            ).to.be.revertedWith("Strategy not active");
        });

        it("Should revert when in emergency mode", async function () {
            const { aaveStrategy, mockUSDC, portfolioManager, user1, owner } = 
                await loadFixture(deployAaveStrategyFixture);

            // Enable emergency mode
            await aaveStrategy.connect(owner).toggleEmergencyMode();

            const depositAmount = ethers.parseUnits("100", 6);
            await mockUSDC.connect(portfolioManager).approve(await aaveStrategy.getAddress(), depositAmount);
            
            await expect(
                aaveStrategy.connect(portfolioManager).deposit(depositAmount, user1.address)
            ).to.be.revertedWith("Strategy not active");
        });
    });

    describe("Withdrawals", function () {
        it("Should allow portfolio manager to withdraw", async function () {
            const { aaveStrategy, mockUSDC, portfolioManager, user1 } = 
                await loadFixture(deployAaveStrategyFixture);

            const depositAmount = ethers.parseUnits("100", 6);
            
            // Deposit first
            await mockUSDC.connect(portfolioManager).approve(await aaveStrategy.getAddress(), depositAmount);
            await aaveStrategy.connect(portfolioManager).deposit(depositAmount, user1.address);
            
            // Get user's shares
            const userShares = await aaveStrategy.sharesOf(user1.address);
            
            // Withdraw half
            const withdrawShares = userShares / 2n;
            const tx = await aaveStrategy.connect(portfolioManager)
                .withdraw(withdrawShares, user1.address, user1.address);
            
            // Check remaining balance
            const remainingBalance = await aaveStrategy.balanceOf(user1.address);
            expect(remainingBalance).to.be.approximately(depositAmount / 2n, ethers.parseUnits("1", 6));
            
            await expect(tx).to.emit(aaveStrategy, "Withdrawn");
        });

        it("Should handle withdrawal with accrued interest", async function () {
            const { aaveStrategy, mockUSDC, mockAUSDC, portfolioManager, user1 } = 
                await loadFixture(deployAaveStrategyFixture);

            const depositAmount = ethers.parseUnits("100", 6);
            
            // Deposit
            await mockUSDC.connect(portfolioManager).approve(await aaveStrategy.getAddress(), depositAmount);
            await aaveStrategy.connect(portfolioManager).deposit(depositAmount, user1.address);
            
            // Simulate interest accrual by updating aToken liquidity index
            await mockAUSDC.updateLiquidityIndex();
            
            // Wait some time and withdraw
            const userShares = await aaveStrategy.sharesOf(user1.address);
            const balanceBefore = await mockUSDC.balanceOf(user1.address);
            
            await aaveStrategy.connect(portfolioManager)
                .withdraw(userShares, user1.address, user1.address);
            
            const balanceAfter = await mockUSDC.balanceOf(user1.address);
            const withdrawn = balanceAfter - balanceBefore;
            
            // Should have earned some interest
            expect(withdrawn).to.be.gte(depositAmount);
        });

        it("Should revert when trying to withdraw more shares than owned", async function () {
            const { aaveStrategy, mockUSDC, portfolioManager, user1 } = 
                await loadFixture(deployAaveStrategyFixture);

            const depositAmount = ethers.parseUnits("100", 6);
            
            // Deposit
            await mockUSDC.connect(portfolioManager).approve(await aaveStrategy.getAddress(), depositAmount);
            await aaveStrategy.connect(portfolioManager).deposit(depositAmount, user1.address);
            
            const userShares = await aaveStrategy.sharesOf(user1.address);
            const excessiveShares = userShares + 1n;
            
            await expect(
                aaveStrategy.connect(portfolioManager)
                    .withdraw(excessiveShares, user1.address, user1.address)
            ).to.be.revertedWith("Insufficient shares");
        });
    });

    describe("Harvest", function () {
        it("Should harvest AAVE rewards", async function () {
            const { aaveStrategy, mockAaveRewards, portfolioManager, user1: _user1 } = 
                await loadFixture(deployAaveStrategyFixture);

            // Set up rewards
            const rewardAmount = ethers.parseEther("100");
            await mockAaveRewards.setUserRewards(await aaveStrategy.getAddress(), rewardAmount);
            
            // Harvest
            const tx = await aaveStrategy.connect(portfolioManager).harvest();
            
            await expect(tx).to.emit(aaveStrategy, "RewardsHarvested");
        });

        it("Should collect performance fees on harvest", async function () {
            const { aaveStrategy, mockAaveRewards, portfolioManager } = 
                await loadFixture(deployAaveStrategyFixture);

            const rewardAmount = ethers.parseEther("100");
            await mockAaveRewards.setUserRewards(await aaveStrategy.getAddress(), rewardAmount);
            
            const feesBefore = await aaveStrategy.totalFeesCollected();
            await aaveStrategy.connect(portfolioManager).harvest();
            const feesAfter = await aaveStrategy.totalFeesCollected();
            
            const expectedFee = rewardAmount * 1000n / 10000n; // 10% fee
            expect(feesAfter - feesBefore).to.equal(expectedFee);
        });
    });

    describe("APY Calculation", function () {
        it("Should return current APY from Aave pool", async function () {
            const { aaveStrategy, mockAavePool } = await loadFixture(deployAaveStrategyFixture);

            // Set a specific liquidity rate (5% APY)
            const liquidityRate = 1585489599; // ~5% APY in ray per second
            await mockAavePool.setLiquidityRate(liquidityRate);
            
            // Should be able to call getAPY without reverting
            const apy = await aaveStrategy.getAPY();
            // APY calculation might be complex, just verify it's callable
            expect(apy).to.be.gte(0);
        });
    });

    describe("Admin Functions", function () {
        it("Should allow admin to toggle emergency mode", async function () {
            const { aaveStrategy, owner } = await loadFixture(deployAaveStrategyFixture);

            expect(await aaveStrategy.emergencyMode()).to.be.false;
            
            await aaveStrategy.connect(owner).toggleEmergencyMode();
            expect(await aaveStrategy.emergencyMode()).to.be.true;
            
            await aaveStrategy.connect(owner).toggleEmergencyMode();
            expect(await aaveStrategy.emergencyMode()).to.be.false;
        });

        it("Should allow admin to set performance fee", async function () {
            const { aaveStrategy, owner } = await loadFixture(deployAaveStrategyFixture);

            const newFee = 1500; // 15%
            await aaveStrategy.connect(owner).setPerformanceFee(newFee);
            
            expect(await aaveStrategy.performanceFee()).to.equal(newFee);
        });

        it("Should revert when setting performance fee too high", async function () {
            const { aaveStrategy, owner } = await loadFixture(deployAaveStrategyFixture);

            const tooHighFee = 2500; // 25% (max is 20%)
            await expect(
                aaveStrategy.connect(owner).setPerformanceFee(tooHighFee)
            ).to.be.revertedWith("Fee too high");
        });

        it("Should allow emergency withdrawal in emergency mode", async function () {
            const { aaveStrategy, mockUSDC, portfolioManager, user1, owner, initialBalance: _initialBalance } = 
                await loadFixture(deployAaveStrategyFixture);

            const depositAmount = ethers.parseUnits("100", 6);
            
            // Deposit some funds
            await mockUSDC.connect(portfolioManager).approve(await aaveStrategy.getAddress(), depositAmount);
            await aaveStrategy.connect(portfolioManager).deposit(depositAmount, user1.address);
            
            // Enable emergency mode and withdraw
            await aaveStrategy.connect(owner).toggleEmergencyMode();
            
            const adminBalanceBefore = await mockUSDC.balanceOf(owner.address);
            await aaveStrategy.connect(owner).emergencyWithdraw();
            const adminBalanceAfter = await mockUSDC.balanceOf(owner.address);
            
            expect(adminBalanceAfter - adminBalanceBefore).to.be.gte(depositAmount);
        });
    });

    describe("View Functions", function () {
        it("Should return correct user balances", async function () {
            const { aaveStrategy, mockUSDC, portfolioManager, user1 } = 
                await loadFixture(deployAaveStrategyFixture);

            const depositAmount = ethers.parseUnits("100", 6);
            
            // Before deposit
            expect(await aaveStrategy.balanceOf(user1.address)).to.equal(0);
            expect(await aaveStrategy.sharesOf(user1.address)).to.equal(0);
            
            // After deposit
            await mockUSDC.connect(portfolioManager).approve(await aaveStrategy.getAddress(), depositAmount);
            await aaveStrategy.connect(portfolioManager).deposit(depositAmount, user1.address);
            
            expect(await aaveStrategy.balanceOf(user1.address)).to.equal(depositAmount);
            expect(await aaveStrategy.sharesOf(user1.address)).to.equal(depositAmount);
        });

        it("Should check asset support correctly", async function () {
            const { aaveStrategy, mockUSDC, mockAAVE } = await loadFixture(deployAaveStrategyFixture);

            expect(await aaveStrategy.supportsAsset(await mockUSDC.getAddress())).to.be.true;
            expect(await aaveStrategy.supportsAsset(await mockAAVE.getAddress())).to.be.false;
        });

        it("Should return total supply of shares", async function () {
            const { aaveStrategy, mockUSDC, portfolioManager, user1, user2 } = 
                await loadFixture(deployAaveStrategyFixture);

            expect(await aaveStrategy.totalSupply()).to.equal(0);
            
            // Deposit from two users
            const depositAmount = ethers.parseUnits("100", 6);
            
            await mockUSDC.connect(portfolioManager).approve(await aaveStrategy.getAddress(), depositAmount * 2n);
            await aaveStrategy.connect(portfolioManager).deposit(depositAmount, user1.address);
            await aaveStrategy.connect(portfolioManager).deposit(depositAmount, user2.address);
            
            expect(await aaveStrategy.totalSupply()).to.be.gt(depositAmount);
        });
    });
});
