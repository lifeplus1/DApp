// SPDX-License-Identifier: MIT
/**
 * @title Production Monitoring & Alerting System
 * @notice Comprehensive monitoring for stable yield aggregator platform
 * @dev Phase 5.1 Week 3 - Production infrastructure monitoring
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');

// Monitoring configuration
const MONITORING_CONFIG = {
    // Contract addresses (will be loaded from deployment)
    contracts: {
        portfolioManager: process.env.PORTFOLIO_MANAGER_ADDRESS,
        stableVault: process.env.STABLE_VAULT_ADDRESS,
        strategies: [
            process.env.STRATEGY_1_ADDRESS,
            process.env.STRATEGY_2_ADDRESS,
            process.env.STRATEGY_3_ADDRESS
        ]
    },
    
    // Alert thresholds
    thresholds: {
        gasPrice: ethers.parseUnits("100", "gwei"), // 100 gwei alert threshold
        tvlChange: 10, // 10% TVL change alert
        errorRate: 1,  // 1% error rate alert
        responseTime: 5000, // 5 second response time alert
        blockDelay: 10 // 10 blocks behind alert
    },
    
    // Monitoring intervals
    intervals: {
        health: 60000,      // 1 minute
        performance: 300000, // 5 minutes
        tvl: 600000,        // 10 minutes
        gas: 120000         // 2 minutes
    }
};

/**
 * @dev Production monitoring system
 */
class ProductionMonitor {
    constructor() {
        this.isRunning = false;
        this.metrics = {
            health: {},
            performance: {},
            alerts: []
        };
        this.intervals = [];
    }
    
    /**
     * @dev Start monitoring system
     */
    async start() {
        console.log("🔍 Starting Production Monitoring System...");
        
        if (this.isRunning) {
            console.log("⚠️ Monitor already running");
            return;
        }
        
        this.isRunning = true;
        
        // Initialize contracts
        await this.initializeContracts();
        
        // Start monitoring intervals
        this.startHealthMonitoring();
        this.startPerformanceMonitoring();
        this.startTVLMonitoring();
        this.startGasMonitoring();
        
        console.log("✅ Production monitoring started");
    }
    
    /**
     * @dev Stop monitoring system
     */
    stop() {
        console.log("⏹️ Stopping Production Monitoring System...");
        
        this.isRunning = false;
        
        // Clear all intervals
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        
        console.log("✅ Production monitoring stopped");
    }
    
    /**
     * @dev Initialize contract connections
     */
    async initializeContracts() {
        console.log("📡 Initializing contract connections...");
        
        try {
            // Connect to PortfolioManager
            if (MONITORING_CONFIG.contracts.portfolioManager) {
                const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
                this.portfolioManager = PortfolioManager.attach(
                    MONITORING_CONFIG.contracts.portfolioManager
                );
                console.log(`✅ PortfolioManager connected: ${MONITORING_CONFIG.contracts.portfolioManager}`);
            }
            
            // Connect to StableVault
            if (MONITORING_CONFIG.contracts.stableVault) {
                const StableVault = await ethers.getContractFactory("StableVault");
                this.stableVault = StableVault.attach(
                    MONITORING_CONFIG.contracts.stableVault
                );
                console.log(`✅ StableVault connected: ${MONITORING_CONFIG.contracts.stableVault}`);
            }
            
            console.log("✅ Contract initialization complete");
        } catch (error) {
            console.error("❌ Contract initialization failed:", error.message);
            this.sendAlert("CRITICAL", "Contract initialization failed", error.message);
        }
    }
    
    /**
     * @dev Start health monitoring
     */
    startHealthMonitoring() {
        const interval = setInterval(async () => {
            if (!this.isRunning) return;
            
            try {
                await this.checkSystemHealth();
            } catch (error) {
                console.error("Health monitoring error:", error);
                this.sendAlert("HIGH", "Health monitoring error", error.message);
            }
        }, MONITORING_CONFIG.intervals.health);
        
        this.intervals.push(interval);
        console.log("✅ Health monitoring started");
    }
    
    /**
     * @dev Check system health
     */
    async checkSystemHealth() {
        const health = {
            timestamp: new Date().toISOString(),
            blockNumber: await ethers.provider.getBlockNumber(),
            network: hre.network.name
        };
        
        // Check contract responsiveness
        if (this.portfolioManager) {
            try {
                const activeStrategies = await this.portfolioManager.getActiveStrategies();
                health.activeStrategies = activeStrategies.length;
                health.portfolioManagerResponsive = true;
            } catch (error) {
                health.portfolioManagerResponsive = false;
                this.sendAlert("HIGH", "PortfolioManager unresponsive", error.message);
            }
        }
        
        if (this.stableVault) {
            try {
                const totalAssets = await this.stableVault.totalAssets();
                health.totalAssets = ethers.formatUnits(totalAssets, 6);
                health.stableVaultResponsive = true;
            } catch (error) {
                health.stableVaultResponsive = false;
                this.sendAlert("HIGH", "StableVault unresponsive", error.message);
            }
        }
        
        // Check network conditions
        try {
            const feeData = await ethers.provider.getFeeData();
            health.gasPrice = ethers.formatUnits(feeData.gasPrice, "gwei");
            
            if (feeData.gasPrice > MONITORING_CONFIG.thresholds.gasPrice) {
                this.sendAlert("MEDIUM", "High gas price detected", 
                    `Gas price: ${health.gasPrice} gwei`);
            }
        } catch (error) {
            health.networkResponsive = false;
            this.sendAlert("HIGH", "Network connection issue", error.message);
        }
        
        this.metrics.health = health;
        
        // Log health status
        console.log(`💓 Health Check: Block ${health.blockNumber}, Gas: ${health.gasPrice} gwei`);
    }
    
    /**
     * @dev Start performance monitoring
     */
    startPerformanceMonitoring() {
        const interval = setInterval(async () => {
            if (!this.isRunning) return;
            
            try {
                await this.checkPerformanceMetrics();
            } catch (error) {
                console.error("Performance monitoring error:", error);
                this.sendAlert("MEDIUM", "Performance monitoring error", error.message);
            }
        }, MONITORING_CONFIG.intervals.performance);
        
        this.intervals.push(interval);
        console.log("✅ Performance monitoring started");
    }
    
    /**
     * @dev Check performance metrics
     */
    async checkPerformanceMetrics() {
        const performance = {
            timestamp: new Date().toISOString()
        };
        
        if (this.stableVault) {
            try {
                // Measure response time
                const startTime = Date.now();
                const totalAssets = await this.stableVault.totalAssets();
                const totalSupply = await this.stableVault.totalSupply();
                const responseTime = Date.now() - startTime;
                
                performance.responseTime = responseTime;
                performance.totalAssets = ethers.formatUnits(totalAssets, 6);
                performance.totalSupply = ethers.formatUnits(totalSupply, 18);
                
                // Calculate share price
                if (totalSupply > 0n) {
                    performance.sharePrice = Number(totalAssets) / Number(totalSupply);
                }
                
                if (responseTime > MONITORING_CONFIG.thresholds.responseTime) {
                    this.sendAlert("MEDIUM", "Slow response time", 
                        `Response time: ${responseTime}ms`);
                }
            } catch (error) {
                performance.error = error.message;
                this.sendAlert("MEDIUM", "Performance check failed", error.message);
            }
        }
        
        this.metrics.performance = performance;
        console.log(`📊 Performance: Response ${performance.responseTime}ms, TVL: $${performance.totalAssets}`);
    }
    
    /**
     * @dev Start TVL monitoring
     */
    startTVLMonitoring() {
        const interval = setInterval(async () => {
            if (!this.isRunning) return;
            
            try {
                await this.monitorTVLChanges();
            } catch (error) {
                console.error("TVL monitoring error:", error);
            }
        }, MONITORING_CONFIG.intervals.tvl);
        
        this.intervals.push(interval);
        console.log("✅ TVL monitoring started");
    }
    
    /**
     * @dev Monitor TVL changes
     */
    async monitorTVLChanges() {
        if (!this.stableVault) return;
        
        try {
            const currentTVL = await this.stableVault.totalAssets();
            const currentTVLFormatted = Number(ethers.formatUnits(currentTVL, 6));
            
            if (this.lastTVL) {
                const changePercent = Math.abs((currentTVLFormatted - this.lastTVL) / this.lastTVL) * 100;
                
                if (changePercent > MONITORING_CONFIG.thresholds.tvlChange) {
                    const direction = currentTVLFormatted > this.lastTVL ? "increased" : "decreased";
                    this.sendAlert("MEDIUM", "Significant TVL change", 
                        `TVL ${direction} by ${changePercent.toFixed(2)}%: $${currentTVLFormatted.toLocaleString()}`);
                }
            }
            
            this.lastTVL = currentTVLFormatted;
            console.log(`💰 TVL Update: $${currentTVLFormatted.toLocaleString()}`);
        } catch (error) {
            this.sendAlert("LOW", "TVL monitoring failed", error.message);
        }
    }
    
    /**
     * @dev Start gas monitoring
     */
    startGasMonitoring() {
        const interval = setInterval(async () => {
            if (!this.isRunning) return;
            
            try {
                await this.monitorGasConditions();
            } catch (error) {
                console.error("Gas monitoring error:", error);
            }
        }, MONITORING_CONFIG.intervals.gas);
        
        this.intervals.push(interval);
        console.log("✅ Gas monitoring started");
    }
    
    /**
     * @dev Monitor gas conditions
     */
    async monitorGasConditions() {
        try {
            const feeData = await ethers.provider.getFeeData();
            const gasPrice = Number(ethers.formatUnits(feeData.gasPrice, "gwei"));
            
            // Track gas price trends
            if (!this.gasHistory) this.gasHistory = [];
            this.gasHistory.push({ timestamp: Date.now(), gasPrice });
            
            // Keep only last 30 readings
            if (this.gasHistory.length > 30) {
                this.gasHistory = this.gasHistory.slice(-30);
            }
            
            // Calculate average
            const avgGasPrice = this.gasHistory.reduce((sum, reading) => sum + reading.gasPrice, 0) / this.gasHistory.length;
            
            console.log(`⛽ Gas: ${gasPrice} gwei (avg: ${avgGasPrice.toFixed(1)} gwei)`);
        } catch (error) {
            console.error("Gas monitoring failed:", error);
        }
    }
    
    /**
     * @dev Send alert
     */
    sendAlert(severity, title, message) {
        const alert = {
            timestamp: new Date().toISOString(),
            severity,
            title,
            message,
            network: hre.network.name
        };
        
        this.metrics.alerts.push(alert);
        
        // Keep only last 100 alerts
        if (this.metrics.alerts.length > 100) {
            this.metrics.alerts = this.metrics.alerts.slice(-100);
        }
        
        // Console output
        const severityIcon = {
            'CRITICAL': '🚨',
            'HIGH': '⚠️',
            'MEDIUM': '⚡',
            'LOW': 'ℹ️'
        }[severity] || '📢';
        
        console.log(`${severityIcon} ALERT [${severity}]: ${title} - ${message}`);
        
        // Here you would integrate with external alerting systems
        // Slack, Discord, email, etc.
        this.sendExternalAlert(alert);
    }
    
    /**
     * @dev Send external alert
     */
    sendExternalAlert(alert) {
        // Integration with external services would go here
        // For now, save to file
        const alertsFile = `alerts-${new Date().toISOString().split('T')[0]}.json`;
        let alerts = [];
        
        try {
            if (fs.existsSync(alertsFile)) {
                alerts = JSON.parse(fs.readFileSync(alertsFile, 'utf8'));
            }
        } catch (_error) {
            // File doesn't exist or is corrupted, start fresh
        }
        
        alerts.push(alert);
        fs.writeFileSync(alertsFile, JSON.stringify(alerts, null, 2));
    }
    
    /**
     * @dev Generate monitoring report
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            system: {
                isRunning: this.isRunning,
                network: hre.network.name,
                uptime: Date.now() - (this.startTime || Date.now())
            },
            metrics: this.metrics,
            configuration: MONITORING_CONFIG
        };
        
        const reportFile = `monitoring-report-${Date.now()}.json`;
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        console.log(`📊 Monitoring report generated: ${reportFile}`);
        return report;
    }
}

/**
 * @dev Main execution
 */
async function runProductionMonitoring() {
    console.log("🚀 Production Monitoring System");
    console.log("================================");
    
    const monitor = new ProductionMonitor();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log("\n⏹️ Shutting down monitoring system...");
        monitor.stop();
        monitor.generateReport();
        process.exit(0);
    });
    
    // Start monitoring
    monitor.startTime = Date.now();
    await monitor.start();
    
    // Keep process alive
    console.log("✅ Monitoring system running... Press Ctrl+C to stop");
    
    // Generate periodic reports
    setInterval(() => {
        monitor.generateReport();
    }, 3600000); // Every hour
}

// Export for use as module
module.exports = { ProductionMonitor, MONITORING_CONFIG };

// Run if called directly
if (require.main === module) {
    runProductionMonitoring().catch(console.error);
}
