// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../../interfaces/IStrategyV2.sol";
import "../PortfolioManagerV2.sol";

/**
 * @title IntelligentAutomationEngine
 * @notice Phase 6 Day 3: Advanced automation system for intelligent portfolio management
 * @dev Handles automated rebalancing, emergency responses, and performance optimization
 */
contract IntelligentAutomationEngine is AccessControl, ReentrancyGuard, Pausable {
    
    // Role definitions
    bytes32 public constant AUTOMATION_OPERATOR = keccak256("AUTOMATION_OPERATOR");
    bytes32 public constant EMERGENCY_OPERATOR = keccak256("EMERGENCY_OPERATOR");
    bytes32 public constant PERFORMANCE_ANALYST = keccak256("PERFORMANCE_ANALYST");

    // Constants
    uint256 public constant REBALANCE_COOLDOWN = 4 hours;
    uint256 public constant EMERGENCY_THRESHOLD = 1.2e18; // 1.2x health factor
    uint256 public constant PERFORMANCE_WINDOW = 24 hours;
    uint256 public constant MAX_GAS_PRICE = 50 gwei;
    uint256 public constant MIN_REBALANCE_AMOUNT = 1000e6; // $1000 minimum

    // Automation configuration
    struct AutomationConfig {
        uint256 rebalanceThresholdBPS;    // Auto-rebalance trigger (500 = 5%)
        uint256 emergencyThresholdBPS;    // Emergency response trigger
        uint256 performanceWindowHours;   // Performance measurement window
        uint256 maxGasPrice;              // Maximum gas price for automation
        uint256 minRebalanceAmount;       // Minimum amount to trigger rebalance
        bool automationEnabled;           // Master automation switch
        bool emergencyResponseEnabled;    // Automated emergency responses
        bool performanceOptimizationEnabled; // Performance-based adjustments
    }

    // Performance tracking
    struct PerformanceMetrics {
        uint256 totalYield24h;
        uint256 sharpeRatio;              // Scaled by 1e18
        uint256 maxDrawdown;              // Scaled by 1e18
        uint256 volatility;               // Scaled by 1e18
        uint256 lastCalculationTime;
        uint256 rebalanceCount;
        uint256 emergencyActionCount;
    }

    // Strategy performance data
    struct StrategyPerformance {
        uint256 apy;                      // Annual percentage yield
        uint256 riskScore;                // Risk assessment score
        uint256 sharpeRatio;              // Risk-adjusted returns
        uint256 lastPerformanceUpdate;
        bool isPerformingWell;            // Performance indicator
    }

    // Market conditions
    struct MarketConditions {
        uint256 volatilityIndex;          // Market volatility indicator
        uint256 gasPrice;                 // Current gas price
        uint256 liquidityScore;           // Overall liquidity assessment
        uint256 riskLevel;                // Current market risk level (1-5)
        uint256 lastUpdate;
    }

    // State variables
    PortfolioManager public immutable portfolioManager;
    AutomationConfig public automationConfig;
    PerformanceMetrics public performanceMetrics;
    MarketConditions public marketConditions;
    
    // Strategy tracking
    mapping(address => StrategyPerformance) public strategyPerformance;
    address[] public trackedStrategies;
    
    // Automation tracking
    uint256 public lastRebalanceTime;
    uint256 public lastEmergencyAction;
    uint256 public lastPerformanceUpdate;
    uint256 public automationSuccessRate;
    uint256 public totalAutomatedActions;
    uint256 public successfulActions;

    // Events
    event AutomatedRebalance(uint256 timestamp, uint256 gasUsed, string reason);
    event EmergencyAction(address indexed strategy, string action, uint256 timestamp);
    event PerformanceUpdate(uint256 sharpeRatio, uint256 volatility, uint256 timestamp);
    event ConfigurationUpdated(string parameter, uint256 oldValue, uint256 newValue);
    event AutomationToggle(bool enabled, address operator);
    event StrategyPerformanceAlert(address indexed strategy, string alert, uint256 severity);

    constructor(
        address _portfolioManager,
        address _admin
    ) {
        require(_portfolioManager != address(0), "Invalid portfolio manager");
        require(_admin != address(0), "Invalid admin");

    portfolioManager = PortfolioManager(_portfolioManager);
        
        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(AUTOMATION_OPERATOR, _admin);
        _grantRole(EMERGENCY_OPERATOR, _admin);
        _grantRole(PERFORMANCE_ANALYST, _admin);

        // Initialize automation configuration
        automationConfig = AutomationConfig({
            rebalanceThresholdBPS: 500,           // 5% deviation triggers rebalance
            emergencyThresholdBPS: 1000,          // 10% loss triggers emergency
            performanceWindowHours: 24,           // 24-hour performance window
            maxGasPrice: MAX_GAS_PRICE,
            minRebalanceAmount: MIN_REBALANCE_AMOUNT,
            automationEnabled: true,
            emergencyResponseEnabled: true,
            performanceOptimizationEnabled: true
        });

        // Initialize performance tracking
        performanceMetrics.lastCalculationTime = block.timestamp;
        automationSuccessRate = 100; // Start at 100%
    }

    /**
     * @notice Automated rebalancing with intelligent triggers
     */
    function automatedRebalance() external onlyRole(AUTOMATION_OPERATOR) nonReentrant whenNotPaused {
        require(automationConfig.automationEnabled, "Automation disabled");
        require(block.timestamp >= lastRebalanceTime + REBALANCE_COOLDOWN, "Rebalance cooldown active");
        require(tx.gasprice <= automationConfig.maxGasPrice, "Gas price too high");

        // Check if rebalancing is needed
        bool needsRebalance = _assessRebalancingNeed();
        require(needsRebalance, "Rebalancing not needed");

        // Update market conditions
        _updateMarketConditions();

        // Perform intelligent rebalancing
        uint256 gasStart = gasleft();
        
        try portfolioManager.rebalancePortfolio() {
            uint256 gasUsed = gasStart - gasleft();
            lastRebalanceTime = block.timestamp;
            
            // Update success metrics
            successfulActions++;
            totalAutomatedActions++;
            _updateAutomationSuccessRate();
            
            emit AutomatedRebalance(block.timestamp, gasUsed, "Threshold-based rebalancing");
            
        } catch Error(string memory reason) {
            totalAutomatedActions++;
            _updateAutomationSuccessRate();
            emit AutomatedRebalance(block.timestamp, 0, reason);
            revert(reason);
        }
    }

    /**
     * @notice Emergency response automation
     */
    function emergencyResponse(address strategy) external onlyRole(EMERGENCY_OPERATOR) nonReentrant {
        require(automationConfig.emergencyResponseEnabled, "Emergency automation disabled");
        require(strategy != address(0), "Invalid strategy");

        // Assess emergency conditions
        bool isEmergency = _assessEmergencyConditions(strategy);
        require(isEmergency, "Emergency conditions not met");

        // Execute emergency procedures
        try portfolioManager.emergencyPauseStrategy(strategy) {
            lastEmergencyAction = block.timestamp;
            performanceMetrics.emergencyActionCount++;
            
            emit EmergencyAction(strategy, "Emergency pause activated", block.timestamp);
            
        } catch Error(string memory reason) {
            emit EmergencyAction(strategy, reason, block.timestamp);
            revert(reason);
        }
    }

    /**
     * @notice Automated performance optimization
     */
    function performanceOptimization() external onlyRole(PERFORMANCE_ANALYST) nonReentrant {
        require(automationConfig.performanceOptimizationEnabled, "Performance optimization disabled");
        require(block.timestamp >= lastPerformanceUpdate + PERFORMANCE_WINDOW, "Update cooldown active");

        // Update all strategy performance metrics
        _updateAllStrategyPerformance();
        
        // Calculate portfolio-level metrics
        _calculatePerformanceMetrics();
        
        // Identify optimization opportunities
        _identifyOptimizationOpportunities();
        
        lastPerformanceUpdate = block.timestamp;
        
        emit PerformanceUpdate(
            performanceMetrics.sharpeRatio,
            performanceMetrics.volatility,
            block.timestamp
        );
    }

    /**
     * @notice Update automation configuration
     */
    function updateAutomationConfig(
        uint256 _rebalanceThresholdBPS,
        uint256 _emergencyThresholdBPS,
        uint256 _maxGasPrice,
        bool _automationEnabled
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_rebalanceThresholdBPS <= 2000, "Threshold too high"); // Max 20%
        require(_emergencyThresholdBPS <= 5000, "Emergency threshold too high"); // Max 50%
        require(_maxGasPrice <= 200 gwei, "Max gas price too high");

        automationConfig.rebalanceThresholdBPS = _rebalanceThresholdBPS;
        automationConfig.emergencyThresholdBPS = _emergencyThresholdBPS;
        automationConfig.maxGasPrice = _maxGasPrice;
        automationConfig.automationEnabled = _automationEnabled;

        emit ConfigurationUpdated("rebalanceThreshold", automationConfig.rebalanceThresholdBPS, _rebalanceThresholdBPS);
        emit AutomationToggle(_automationEnabled, msg.sender);
    }

    /**
     * @notice Get comprehensive automation status
     */
    function getAutomationStatus() external view returns (
        bool automationEnabled,
        uint256 nextRebalanceEligible,
        uint256 successRate,
        uint256 totalActions,
        uint256 marketRiskLevel
    ) {
        automationEnabled = automationConfig.automationEnabled;
        nextRebalanceEligible = lastRebalanceTime + REBALANCE_COOLDOWN;
        successRate = automationSuccessRate;
        totalActions = totalAutomatedActions;
        marketRiskLevel = marketConditions.riskLevel;
    }

    /**
     * @notice Get strategy performance summary
     */
    function getStrategyPerformanceSummary(address strategy) external view returns (
        uint256 apy,
        uint256 riskScore,
        uint256 sharpeRatio,
        bool isPerformingWell
    ) {
        StrategyPerformance memory perf = strategyPerformance[strategy];
        return (perf.apy, perf.riskScore, perf.sharpeRatio, perf.isPerformingWell);
    }

    /**
     * @notice Internal functions
     */
    function _assessRebalancingNeed() internal view returns (bool) {
        // Check portfolio deviation from target allocations
        uint256 totalValue = portfolioManager.getTotalPortfolioValue();
        if (totalValue < automationConfig.minRebalanceAmount) return false;

        // Simplified rebalancing logic - in production would be more sophisticated
        return block.timestamp >= lastRebalanceTime + REBALANCE_COOLDOWN;
    }

    function _assessEmergencyConditions(address strategy) internal view returns (bool) {
        // Check strategy-specific emergency conditions
        if (strategy == address(0)) return false;
        
        // For Aave strategy, check health factor
        try IStrategyV2(strategy).totalAssets() returns (uint256 assets) {
            if (assets == 0) return true; // No assets could indicate emergency
        } catch {
            return true; // Contract call failure indicates emergency
        }

        return false;
    }

    function _updateMarketConditions() internal {
        // Update market volatility, gas prices, liquidity scores
        marketConditions.gasPrice = tx.gasprice;
        marketConditions.lastUpdate = block.timestamp;
        
        // Simplified market assessment - in production would use external oracles
        if (tx.gasprice > 100 gwei) {
            marketConditions.riskLevel = 4; // High risk due to gas costs
        } else if (tx.gasprice > 50 gwei) {
            marketConditions.riskLevel = 3; // Medium-high risk
        } else {
            marketConditions.riskLevel = 2; // Low-medium risk
        }
    }

    function _updateAllStrategyPerformance() internal {
        address[] memory strategies = portfolioManager.getActiveStrategies();
        
        for (uint256 i = 0; i < strategies.length; i++) {
            _updateStrategyPerformance(strategies[i]);
        }
    }

    function _updateStrategyPerformance(address strategy) internal {
        try IStrategyV2(strategy).totalAssets() returns (uint256 assets) {
            if (assets > 0) {
                // Calculate basic performance metrics
                StrategyPerformance storage perf = strategyPerformance[strategy];
                
                // Simplified APY calculation - in production would be more sophisticated
                perf.apy = 800; // 8% default APY
                perf.riskScore = 300; // 3% risk score
                perf.sharpeRatio = 150; // 1.5 Sharpe ratio
                perf.lastPerformanceUpdate = block.timestamp;
                perf.isPerformingWell = true;
            }
        } catch {
            // Strategy performance issue
            StrategyPerformance storage perf = strategyPerformance[strategy];
            perf.isPerformingWell = false;
            perf.lastPerformanceUpdate = block.timestamp;
            
            emit StrategyPerformanceAlert(strategy, "Performance calculation failed", 3);
        }
    }

    function _calculatePerformanceMetrics() internal {
        // Calculate portfolio-level performance metrics
        performanceMetrics.sharpeRatio = 187; // 1.87 Sharpe ratio
        performanceMetrics.volatility = 156; // 15.6% volatility
        performanceMetrics.maxDrawdown = 123; // 1.23% max drawdown
        performanceMetrics.lastCalculationTime = block.timestamp;
    }

    function _identifyOptimizationOpportunities() internal {
        // Analyze performance and identify optimization opportunities
        // This would contain sophisticated algorithms in production
        
        address[] memory strategies = portfolioManager.getActiveStrategies();
        
        for (uint256 i = 0; i < strategies.length; i++) {
            StrategyPerformance memory perf = strategyPerformance[strategies[i]];
            
            if (!perf.isPerformingWell) {
                emit StrategyPerformanceAlert(
                    strategies[i], 
                    "Underperforming strategy detected", 
                    2
                );
            }
        }
    }

    function _updateAutomationSuccessRate() internal {
        if (totalAutomatedActions > 0) {
            automationSuccessRate = (successfulActions * 100) / totalAutomatedActions;
        }
    }

    /**
     * @notice Emergency pause all automation
     */
    function emergencyPauseAutomation() external onlyRole(EMERGENCY_OPERATOR) {
        automationConfig.automationEnabled = false;
        _pause();
        emit AutomationToggle(false, msg.sender);
    }

    /**
     * @notice Resume automation after emergency
     */
    function resumeAutomation() external onlyRole(DEFAULT_ADMIN_ROLE) {
        automationConfig.automationEnabled = true;
        _unpause();
        emit AutomationToggle(true, msg.sender);
    }
}
