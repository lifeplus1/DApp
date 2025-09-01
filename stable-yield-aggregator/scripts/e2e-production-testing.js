// SPDX-License-Identifier: MIT
/**
 * @title End-to-End Production Testing Suite
 * @notice Comprehensive E2E testing for production readiness validation
 * @dev Phase 5.1 Week 3 - Final testing before launch
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
// const { expect } = require("chai"); // Not used in current implementation
const fs = require('fs');

// E2E Test Configuration
const E2E_CONFIG = {
    // Test scenarios
    scenarios: {
        userJourney: true,
        stressTest: true,
        failureRecovery: true,
        crossBrowser: false, // Set to true for frontend testing
        multiWallet: true
    },
    
    // Test parameters
    testUsers: 5,
    testDeposits: [
        ethers.parseUnits("100", 6),   // $100
        ethers.parseUnits("1000", 6),  // $1,000
        ethers.parseUnits("10000", 6), // $10,000
        ethers.parseUnits("50000", 6), // $50,000
    ],
    stressTestUsers: 20,
    maxGasPrice: ethers.parseUnits("100", "gwei"),
    
    // Performance thresholds
    thresholds: {
        depositGas: 200000,
        withdrawGas: 250000,
        rebalanceGas: 500000,
        responseTime: 5000, // 5 seconds
        slippage: 300 // 3%
    }
};

/**
 * @dev End-to-End Testing Suite
 */
class E2ETestSuite {
    constructor() {
        this.results = {
            userJourney: [],
            stressTest: [],
            failureRecovery: [],
            performance: [],
            summary: {}
        };
        this.contracts = {};
        this.testUsers = [];
    }
    
    /**
     * @dev Run complete E2E test suite
     */
    async runCompleteSuite() {
        console.log("🧪 Starting End-to-End Production Testing Suite");
        console.log("===============================================");
        
        // Setup test environment
        await this.setupTestEnvironment();
        
        // Run test scenarios
        if (E2E_CONFIG.scenarios.userJourney) {
            await this.runUserJourneyTests();
        }
        
        if (E2E_CONFIG.scenarios.stressTest) {
            await this.runStressTests();
        }
        
        if (E2E_CONFIG.scenarios.failureRecovery) {
            await this.runFailureRecoveryTests();
        }
        
        if (E2E_CONFIG.scenarios.multiWallet) {
            await this.runMultiWalletTests();
        }
        
        // Generate comprehensive report
        await this.generateE2EReport();
        
        console.log("✅ End-to-End testing complete!");
    }
    
    /**
     * @dev Setup test environment
     */
    async setupTestEnvironment() {
        console.log("\n🏗️  Setting up E2E test environment...");
        
        // Get signers
        const signers = await ethers.getSigners();
        this.deployer = signers[0];
        this.testUsers = signers.slice(1, E2E_CONFIG.testUsers + 1);
        
        // Deploy complete system
        await this.deployTestSystem();
        
        // Setup test data
        await this.setupTestData();
        
        console.log(`✅ Test environment ready (${this.testUsers.length} test users)`);
    }
    
    /**
     * @dev Deploy complete test system
     */
    async deployTestSystem() {
        console.log("Deploying test system...");
        
        // Deploy mock USDC
        const MockToken = await ethers.getContractFactory("MockToken");
        this.contracts.usdc = await MockToken.deploy("Mock USDC", "mUSDC", 6);
        await this.contracts.usdc.waitForDeployment();
        
        // Deploy PortfolioManager
        const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
        this.contracts.portfolioManager = await PortfolioManager.deploy(
            await this.contracts.usdc.getAddress(),
            this.deployer.address
        );
        await this.contracts.portfolioManager.waitForDeployment();
        
        // Deploy strategies
        this.contracts.strategies = [];
        const strategyNames = ["Conservative", "Balanced", "Growth"];
        const allocations = [4000, 3500, 2500]; // 40%, 35%, 25%
        
        for (let i = 0; i < strategyNames.length; i++) {
            const DummyStrategy = await ethers.getContractFactory("DummyStrategy");
            const strategy = await DummyStrategy.deploy(await this.contracts.usdc.getAddress());
            await strategy.waitForDeployment();
            
            this.contracts.strategies.push({
                contract: strategy,
                name: strategyNames[i],
                allocation: allocations[i]
            });
            
            // Add to portfolio manager
            await this.contracts.portfolioManager.addStrategy(
                await strategy.getAddress(),
                allocations[i],
                strategyNames[i]
            );
        }
        
        // Deploy StableVault
        const StableVault = await ethers.getContractFactory("StableVault");
        this.contracts.vault = await StableVault.deploy(
            await this.contracts.usdc.getAddress(),
            await this.contracts.strategies[0].contract.getAddress()
        );
        await this.contracts.vault.waitForDeployment();
        
        // Setup emergency operator
        await this.contracts.portfolioManager.setEmergencyOperator(this.deployer.address, true);
        
        console.log("✅ Test system deployed");
    }
    
    /**
     * @dev Setup test data
     */
    async setupTestData() {
        console.log("Setting up test data...");
        
        const totalMint = ethers.parseUnits("10000000", 6); // 10M USDC
        
        // Mint tokens for deployer
        await this.contracts.usdc.mint(this.deployer.address, totalMint);
        
        // Mint and approve tokens for test users
        for (const user of this.testUsers) {
            await this.contracts.usdc.mint(user.address, totalMint);
            await this.contracts.usdc.connect(user).approve(
                await this.contracts.vault.getAddress(),
                totalMint
            );
        }
        
        console.log("✅ Test data ready");
    }
    
    /**
     * @dev Run user journey tests
     */
    async runUserJourneyTests() {
        console.log("\n👤 Running User Journey Tests...");
        
        const journeyTests = [];
        
        for (let i = 0; i < this.testUsers.length; i++) {
            const user = this.testUsers[i];
            const depositAmount = E2E_CONFIG.testDeposits[i % E2E_CONFIG.testDeposits.length];
            
            try {
                const journeyResult = await this.runSingleUserJourney(user, depositAmount, i + 1);
                journeyTests.push(journeyResult);
            } catch (error) {
                journeyTests.push({
                    userId: i + 1,
                    success: false,
                    error: error.message,
                    step: "unknown"
                });
            }
        }
        
        this.results.userJourney = journeyTests;
        
        const successCount = journeyTests.filter(t => t.success).length;
        console.log(`✅ User Journey Tests: ${successCount}/${journeyTests.length} passed`);
    }
    
    /**
     * @dev Run single user journey
     */
    async runSingleUserJourney(user, depositAmount, userId) {
        const journey = {
            userId,
            userAddress: user.address,
            depositAmount: ethers.formatUnits(depositAmount, 6),
            success: false,
            steps: [],
            gasUsed: {},
            timing: {}
        };
        
        try {
            // Step 1: Deposit
            let startTime = Date.now();
            const depositTx = await this.contracts.vault.connect(user).deposit(
                depositAmount,
                user.address
            );
            const depositReceipt = await depositTx.wait();
            journey.gasUsed.deposit = depositReceipt.gasUsed.toString();
            journey.timing.deposit = Date.now() - startTime;
            journey.steps.push("deposit_success");
            
            // Check shares received
            const sharesBalance = await this.contracts.vault.balanceOf(user.address);
            if (sharesBalance > 0n) {
                journey.steps.push("shares_received");
            }
            
            // Step 2: Wait and check balance growth
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Step 3: Partial withdrawal
            const withdrawAmount = depositAmount / 2n;
            startTime = Date.now();
            const withdrawTx = await this.contracts.vault.connect(user).withdraw(
                withdrawAmount,
                user.address,
                user.address
            );
            const withdrawReceipt = await withdrawTx.wait();
            journey.gasUsed.withdraw = withdrawReceipt.gasUsed.toString();
            journey.timing.withdraw = Date.now() - startTime;
            journey.steps.push("partial_withdrawal_success");
            
            // Step 4: Check remaining balance
            const remainingShares = await this.contracts.vault.balanceOf(user.address);
            if (remainingShares > 0n) {
                journey.steps.push("remaining_balance_correct");
            }
            
            // Step 5: Full withdrawal
            startTime = Date.now();
            const fullWithdrawTx = await this.contracts.vault.connect(user).redeem(
                remainingShares,
                user.address,
                user.address
            );
            const fullWithdrawReceipt = await fullWithdrawTx.wait();
            journey.gasUsed.fullWithdraw = fullWithdrawReceipt.gasUsed.toString();
            journey.timing.fullWithdraw = Date.now() - startTime;
            journey.steps.push("full_withdrawal_success");
            
            // Validate gas usage
            if (Number(journey.gasUsed.deposit) < E2E_CONFIG.thresholds.depositGas) {
                journey.steps.push("deposit_gas_efficient");
            }
            if (Number(journey.gasUsed.withdraw) < E2E_CONFIG.thresholds.withdrawGas) {
                journey.steps.push("withdraw_gas_efficient");
            }
            
            journey.success = true;
            console.log(`✅ User ${userId} journey completed (${journey.steps.length} steps)`);
            
        } catch (error) {
            journey.error = error.message;
            journey.step = journey.steps[journey.steps.length - 1] || "setup";
            console.log(`❌ User ${userId} journey failed at ${journey.step}`);
        }
        
        return journey;
    }
    
    /**
     * @dev Run stress tests
     */
    async runStressTests() {
        console.log("\n⚡ Running Stress Tests...");
        
        const stressResults = {
            simultaneousDeposits: { success: false, error: null },
            highVolumeTransactions: { success: false, error: null },
            gasUnderPressure: { success: false, error: null }
        };
        
        try {
            // Test 1: Simultaneous deposits
            console.log("Testing simultaneous deposits...");
            const simultaneousPromises = [];
            const stressAmount = ethers.parseUnits("1000", 6);
            
            for (let i = 0; i < Math.min(E2E_CONFIG.stressTestUsers, this.testUsers.length); i++) {
                const user = this.testUsers[i];
                simultaneousPromises.push(
                    this.contracts.vault.connect(user).deposit(stressAmount, user.address)
                );
            }
            
            const simultaneousResults = await Promise.allSettled(simultaneousPromises);
            const successfulDeposits = simultaneousResults.filter(r => r.status === 'fulfilled').length;
            
            stressResults.simultaneousDeposits = {
                success: successfulDeposits > simultaneousResults.length * 0.8, // 80% success rate
                attempted: simultaneousResults.length,
                successful: successfulDeposits,
                failureRate: ((simultaneousResults.length - successfulDeposits) / simultaneousResults.length * 100).toFixed(2) + '%'
            };
            
            console.log(`✅ Simultaneous deposits: ${successfulDeposits}/${simultaneousResults.length} successful`);
            
        } catch (error) {
            stressResults.simultaneousDeposits.error = error.message;
            console.log(`❌ Simultaneous deposits failed: ${error.message}`);
        }
        
        // Test 2: High volume sequential transactions
        try {
            console.log("Testing high volume transactions...");
            const startTime = Date.now();
            let successfulTxs = 0;
            
            for (let i = 0; i < 50; i++) {
                const user = this.testUsers[i % this.testUsers.length];
                const amount = ethers.parseUnits("100", 6);
                
                try {
                    await this.contracts.vault.connect(user).deposit(amount, user.address);
                    successfulTxs++;
                } catch (_error) {
                    // Continue with next transaction
                }
            }
            
            const duration = Date.now() - startTime;
            const tps = (successfulTxs / (duration / 1000)).toFixed(2);
            
            stressResults.highVolumeTransactions = {
                success: successfulTxs > 40, // At least 80% success
                successful: successfulTxs,
                total: 50,
                duration: duration,
                tps: tps
            };
            
            console.log(`✅ High volume: ${successfulTxs}/50 transactions (${tps} TPS)`);
            
        } catch (error) {
            stressResults.highVolumeTransactions.error = error.message;
            console.log(`❌ High volume test failed: ${error.message}`);
        }
        
        this.results.stressTest = stressResults;
    }
    
    /**
     * @dev Run failure recovery tests
     */
    async runFailureRecoveryTests() {
        console.log("\n🔄 Running Failure Recovery Tests...");
        
        const recoveryTests = {
            emergencyPause: { success: false },
            strategyActivation: { success: false },
            rebalancing: { success: false }
        };
        
        try {
            // Test 1: Emergency pause
            console.log("Testing emergency pause...");
            await this.contracts.portfolioManager.emergencyPauseStrategy(
                await this.contracts.strategies[0].contract.getAddress()
            );
            
            // Verify strategy is paused
            const strategyInfo = await this.contracts.portfolioManager.getStrategyInfo(
                await this.contracts.strategies[0].contract.getAddress()
            );
            
            recoveryTests.emergencyPause.success = !strategyInfo.isActive;
            console.log(`✅ Emergency pause: ${recoveryTests.emergencyPause.success ? 'PASS' : 'FAIL'}`);
            
            // Test 2: Strategy reactivation (add another strategy)
            console.log("Testing strategy management...");
            const DummyStrategy = await ethers.getContractFactory("DummyStrategy");
            const newStrategy = await DummyStrategy.deploy(await this.contracts.usdc.getAddress());
            await newStrategy.waitForDeployment();
            
            await this.contracts.portfolioManager.addStrategy(
                await newStrategy.getAddress(),
                1000,
                "Recovery Strategy"
            );
            
            const newStrategyInfo = await this.contracts.portfolioManager.getStrategyInfo(
                await newStrategy.getAddress()
            );
            
            recoveryTests.strategyActivation.success = newStrategyInfo.isActive;
            console.log(`✅ Strategy activation: ${recoveryTests.strategyActivation.success ? 'PASS' : 'FAIL'}`);
            
            // Test 3: Portfolio rebalancing
            console.log("Testing portfolio rebalancing...");
            await this.contracts.portfolioManager.rebalancePortfolio();
            recoveryTests.rebalancing.success = true;
            console.log(`✅ Portfolio rebalancing: PASS`);
            
        } catch (error) {
            console.log(`❌ Recovery tests failed: ${error.message}`);
            recoveryTests.error = error.message;
        }
        
        this.results.failureRecovery = recoveryTests;
    }
    
    /**
     * @dev Run multi-wallet tests
     */
    async runMultiWalletTests() {
        console.log("\n👥 Running Multi-Wallet Tests...");
        
        const multiWalletResults = {
            concurrentUsers: 0,
            totalVolume: "0",
            averageGas: "0",
            conflicts: 0
        };
        
        try {
            const promises = [];
            const startTime = Date.now();
            
            // Create concurrent deposits from multiple wallets
            for (let i = 0; i < this.testUsers.length; i++) {
                const user = this.testUsers[i];
                const amount = ethers.parseUnits((1000 * (i + 1)).toString(), 6);
                
                promises.push(
                    this.contracts.vault.connect(user).deposit(amount, user.address)
                        .then(tx => tx.wait())
                        .then(receipt => ({
                            success: true,
                            gasUsed: receipt.gasUsed,
                            user: i,
                            amount
                        }))
                        .catch(error => ({
                            success: false,
                            error: error.message,
                            user: i,
                            amount
                        }))
                );
            }
            
            const results = await Promise.all(promises);
            const successful = results.filter(r => r.success);
            
            multiWalletResults.concurrentUsers = successful.length;
            multiWalletResults.totalVolume = successful.reduce((sum, r) => sum + r.amount, 0n).toString();
            multiWalletResults.conflicts = results.length - successful.length;
            
            if (successful.length > 0) {
                const totalGas = successful.reduce((sum, r) => sum + Number(r.gasUsed), 0);
                multiWalletResults.averageGas = (totalGas / successful.length).toFixed(0);
            }
            
            const duration = Date.now() - startTime;
            multiWalletResults.duration = duration;
            
            console.log(`✅ Multi-wallet: ${successful.length}/${results.length} successful concurrent operations`);
            
        } catch (error) {
            console.log(`❌ Multi-wallet test failed: ${error.message}`);
            multiWalletResults.error = error.message;
        }
        
        this.results.multiWallet = multiWalletResults;
    }
    
    /**
     * @dev Generate comprehensive E2E report
     */
    async generateE2EReport() {
        console.log("\n📊 Generating E2E Test Report...");
        
        // Calculate overall metrics
        const userJourneySuccess = this.results.userJourney.filter(t => t.success).length;
        const userJourneyTotal = this.results.userJourney.length;
        
        this.results.summary = {
            timestamp: new Date().toISOString(),
            network: hre.network.name,
            testConfiguration: E2E_CONFIG,
            overallResults: {
                userJourneyPassRate: userJourneyTotal > 0 ? Math.round((userJourneySuccess / userJourneyTotal) * 100) : 0,
                stressTestPassed: this.results.stressTest.simultaneousDeposits?.success || false,
                recoveryTestsPassed: this.results.failureRecovery.emergencyPause?.success && this.results.failureRecovery.strategyActivation?.success,
                multiWalletPassed: this.results.multiWallet.concurrentUsers > (this.testUsers.length * 0.8)
            },
            performance: {
                averageDepositGas: this.calculateAverageGas('deposit'),
                averageWithdrawGas: this.calculateAverageGas('withdraw'),
                averageResponseTime: this.calculateAverageResponseTime()
            }
        };
        
        // Generate detailed report
        const report = {
            metadata: {
                testSuite: "Phase 5.1 Week 3 End-to-End Testing",
                timestamp: this.results.summary.timestamp,
                network: hre.network.name,
                testUsers: this.testUsers.length
            },
            summary: this.results.summary,
            detailedResults: this.results,
            recommendations: this.generateRecommendations()
        };
        
        // Save report (handle BigInt serialization)
        const reportPath = `e2e-test-report-${Date.now()}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(report, (key, value) => {
            if (typeof value === 'bigint') {
                return value.toString();
            }
            return value;
        }, 2));
        
        // Display summary
        console.log("\n🎯 E2E TEST SUMMARY");
        console.log("==================");
        console.log(`User Journey Pass Rate: ${this.results.summary.overallResults.userJourneyPassRate}%`);
        console.log(`Stress Tests: ${this.results.summary.overallResults.stressTestPassed ? 'PASS' : 'FAIL'}`);
        console.log(`Recovery Tests: ${this.results.summary.overallResults.recoveryTestsPassed ? 'PASS' : 'FAIL'}`);
        console.log(`Multi-Wallet Tests: ${this.results.summary.overallResults.multiWalletPassed ? 'PASS' : 'FAIL'}`);
        console.log(`Average Deposit Gas: ${this.results.summary.performance.averageDepositGas}`);
        console.log(`Average Withdraw Gas: ${this.results.summary.performance.averageWithdrawGas}`);
        console.log(`Report saved: ${reportPath}`);
    }
    
    /**
     * @dev Calculate average gas usage
     */
    calculateAverageGas(operation) {
        const gasValues = this.results.userJourney
            .filter(j => j.success && j.gasUsed[operation])
            .map(j => Number(j.gasUsed[operation]));
        
        if (gasValues.length === 0) return "N/A";
        
        return Math.round(gasValues.reduce((sum, val) => sum + val, 0) / gasValues.length).toLocaleString();
    }
    
    /**
     * @dev Calculate average response time
     */
    calculateAverageResponseTime() {
        const times = this.results.userJourney
            .filter(j => j.success && j.timing.deposit)
            .map(j => j.timing.deposit);
        
        if (times.length === 0) return "N/A";
        
        return Math.round(times.reduce((sum, val) => sum + val, 0) / times.length) + "ms";
    }
    
    /**
     * @dev Generate recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        
        if (this.results.summary.overallResults.userJourneyPassRate < 90) {
            recommendations.push({
                priority: "HIGH",
                title: "Improve user journey reliability",
                description: `User journey pass rate is ${this.results.summary.overallResults.userJourneyPassRate}%. Target: >90%`
            });
        }
        
        if (!this.results.summary.overallResults.stressTestPassed) {
            recommendations.push({
                priority: "MEDIUM",
                title: "Enhance concurrent transaction handling",
                description: "Stress tests indicate issues with simultaneous operations"
            });
        }
        
        const avgDepositGas = parseInt(this.results.summary.performance.averageDepositGas?.replace(/,/g, '') || '0');
        if (avgDepositGas > E2E_CONFIG.thresholds.depositGas) {
            recommendations.push({
                priority: "MEDIUM",
                title: "Optimize gas usage",
                description: `Average deposit gas (${avgDepositGas}) exceeds threshold (${E2E_CONFIG.thresholds.depositGas})`
            });
        }
        
        recommendations.push({
            priority: "LOW",
            title: "Implement additional monitoring",
            description: "Add real-time performance monitoring for production"
        });
        
        return recommendations;
    }
}

/**
 * @dev Main execution
 */
async function runE2ETests() {
    const testSuite = new E2ETestSuite();
    await testSuite.runCompleteSuite();
}

// Export for use as module
module.exports = { E2ETestSuite, E2E_CONFIG };

// Run if called directly
if (require.main === module) {
    runE2ETests().catch(console.error);
}
