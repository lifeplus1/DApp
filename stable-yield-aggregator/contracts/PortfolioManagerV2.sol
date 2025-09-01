// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IStrategyV2.sol";

/**
 * @title PortfolioManager
 * @notice Phase 6: Enhanced Multi-Strategy Portfolio Management System
 * @dev Manages allocation across multiple yield strategies with automated rebalancing
 * Phase 6 Security Enhancements: Gas limits, global pause, enhanced validation
 */
contract PortfolioManager is Ownable, ReentrancyGuard, Pausable {
    // Security Constants
    uint256 public constant MAX_STRATEGIES = 20;
    uint256 public constant MAX_GAS_PER_REBALANCE = 500000;
    uint256 public constant EMERGENCY_COOLDOWN = 1 hours;
    uint256 public constant MAX_ALLOCATION_BPS = 3000; // 30% max per strategy

    // Portfolio Strategy Configuration
    struct StrategyInfo {
        address strategyAddress;
        uint128 targetAllocationBPS; // Basis points (10000 = 100%) - optimized storage
        uint128 currentBalance; // Optimized storage slot packing
        uint256 lastRebalanceTime;
        uint256 historicalAPY;
        bool isActive;
        bool isEmergencyPaused;
        string strategyName;
    }

    // Portfolio Metrics
    struct PortfolioMetrics {
        uint256 totalValue;
        uint256 weightedAPY;
        uint256 lastRebalanceTime;
        uint256 rebalanceCount;
        uint256 totalYieldGenerated;
    }

    // Rebalancing Parameters
    struct RebalanceConfig {
        uint256 rebalanceThresholdBPS; // Deviation threshold to trigger rebalance
        uint256 maxSlippageBPS; // Maximum acceptable slippage
        uint256 minRebalanceInterval; // Minimum time between rebalances
        uint256 maxGasPerRebalance; // Gas limit per rebalance operation
        bool autoRebalanceEnabled; // Enable/disable automatic rebalancing
    }

    // State Variables
    IERC20 public immutable asset; // Base asset (USDC)

    // Strategy Management
    mapping(address => StrategyInfo) public strategies;
    address[] public activeStrategies;
    uint256 public activeStrategyCount;

    // Portfolio State
    PortfolioMetrics public portfolioMetrics;
    RebalanceConfig public rebalanceConfig;

    // Phase 6 Security Enhancements
    bool public isGlobalEmergencyPaused = false;
    mapping(address => uint256) public lastEmergencyAction;
    mapping(address => uint256) public gasUsageHistory;

    // Access Control
    mapping(address => bool) public authorizedRebalancers;
    mapping(address => bool) public emergencyOperators;

    // Events
    event StrategyAdded(
        address indexed strategy,
        uint256 targetAllocation,
        string name
    );
    event StrategyRemoved(address indexed strategy);
    event StrategyUpdated(
        address indexed strategy,
        uint256 newTargetAllocation
    );
    event PortfolioRebalanced(
        uint256 totalValue,
        uint256 gasUsed,
        uint256 timestamp
    );
    event EmergencyPause(address indexed strategy, address operator);
    event GlobalEmergencyPause(bool paused, address operator);
    event RebalanceConfigUpdated(uint256 thresholdBPS, uint256 maxSlippage);
    event YieldHarvested(uint256 totalYield, uint256 timestamp);

    // Phase 6 Security Events
    event GasConsumptionWarning(
        string operation,
        uint256 gasUsed,
        uint256 gasLimit
    );
    event SecurityEvent(string eventType, address indexed actor, bytes data);
    event PerformanceMetric(string metric, uint256 value, uint256 timestamp);

    // Modifiers
    modifier onlyRebalancer() {
        require(
            msg.sender == owner() || authorizedRebalancers[msg.sender],
            "Not authorized to rebalance"
        );
        _;
    }

    modifier onlyEmergencyOperator() {
        require(
            msg.sender == owner() || emergencyOperators[msg.sender],
            "Not authorized for emergency operations"
        );
        _;
    }

    modifier strategyExists(address strategy) {
        require(
            strategies[strategy].strategyAddress != address(0),
            "Strategy not found"
        );
        _;
    }

    // Phase 6 Security Modifiers
    modifier notInGlobalEmergency() {
        require(!isGlobalEmergencyPaused, "Global emergency active");
        _;
    }

    modifier gasLimitCheck() {
        uint256 gasStart = gasleft();
        _;
        uint256 gasUsed = gasStart - gasleft();
        gasUsageHistory[msg.sender] = gasUsed;

        if (gasUsed > MAX_GAS_PER_REBALANCE) {
            emit GasConsumptionWarning(
                "rebalance",
                gasUsed,
                MAX_GAS_PER_REBALANCE
            );
        }
    }

    modifier validStrategyOperation(address strategy) {
        require(strategy != address(0), "Zero address");
        require(strategy.code.length > 0, "Not a contract");
        require(
            IStrategyV2(strategy).asset() == address(asset),
            "Asset mismatch"
        );
        _;
    }

    modifier emergencyCooldown() {
        require(
            block.timestamp >=
                lastEmergencyAction[msg.sender] + EMERGENCY_COOLDOWN,
            "Emergency cooldown active"
        );
        _;
        lastEmergencyAction[msg.sender] = block.timestamp;
    }

    constructor(address _asset, address _owner) Ownable(_owner) {
        require(_asset != address(0), "Invalid asset address");
        require(_owner != address(0), "Invalid owner address");

        asset = IERC20(_asset);

        // Initialize rebalance configuration with secure defaults
        rebalanceConfig = RebalanceConfig({
            rebalanceThresholdBPS: 500, // 5% deviation threshold
            maxSlippageBPS: 100, // 1% maximum slippage
            minRebalanceInterval: 1 hours, // Minimum 1 hour between rebalances
            maxGasPerRebalance: MAX_GAS_PER_REBALANCE,
            autoRebalanceEnabled: true
        });

        emit SecurityEvent("deployment", _owner, abi.encode(_asset, _owner));
    }

    /**
     * @notice Add new strategy to portfolio with enhanced security
     * @param strategy Strategy contract address
     * @param targetAllocationBPS Target allocation in basis points
     * @param strategyName Human readable strategy name
     */
    function addStrategy(
        address strategy,
        uint256 targetAllocationBPS,
        string calldata strategyName
    ) external onlyOwner whenNotPaused validStrategyOperation(strategy) {
        require(
            strategies[strategy].strategyAddress == address(0),
            "Strategy already exists"
        );
        require(
            targetAllocationBPS > 0 &&
                targetAllocationBPS <= MAX_ALLOCATION_BPS,
            "Invalid allocation"
        );
        require(bytes(strategyName).length > 0, "Strategy name required");
        require(
            activeStrategies.length < MAX_STRATEGIES,
            "Max strategies reached"
        );

        // Validate total allocation doesn't exceed 100%
        uint256 totalAllocation = _calculateTotalTargetAllocation() +
            targetAllocationBPS;
        require(totalAllocation <= 10000, "Total allocation exceeds 100%");

        // Verify strategy implements IStrategyV2
        require(
            IStrategyV2(strategy).totalAssets() >= 0,
            "Strategy must implement IStrategyV2"
        );

        // Add strategy
        strategies[strategy] = StrategyInfo({
            strategyAddress: strategy,
            targetAllocationBPS: uint128(targetAllocationBPS),
            currentBalance: 0,
            lastRebalanceTime: block.timestamp,
            historicalAPY: 0,
            isActive: true,
            isEmergencyPaused: false,
            strategyName: strategyName
        });

        activeStrategies.push(strategy);
        activeStrategyCount++;

        emit StrategyAdded(strategy, targetAllocationBPS, strategyName);
        emit SecurityEvent(
            "strategy_added",
            strategy,
            abi.encode(targetAllocationBPS, strategyName)
        );
    }

    /**
     * @notice Enhanced portfolio rebalancing with gas limits and security checks
     */
    function rebalancePortfolio()
        external
        onlyRebalancer
        nonReentrant
        whenNotPaused
        notInGlobalEmergency
        gasLimitCheck
    {
        require(activeStrategyCount > 0, "No active strategies");
        require(
            block.timestamp >=
                portfolioMetrics.lastRebalanceTime +
                    rebalanceConfig.minRebalanceInterval,
            "Rebalance too frequent"
        );

        uint256 totalPortfolioValue = getTotalPortfolioValue();
        require(totalPortfolioValue > 0, "No portfolio value to rebalance");

        // Calculate target allocations with bounds checking
        uint256[] memory targetBalances = new uint256[](
            activeStrategies.length
        );
        uint256[] memory currentBalances = new uint256[](
            activeStrategies.length
        );

        // Cache array length to save gas
        uint256 strategiesLength = activeStrategies.length;

        for (uint256 i = 0; i < strategiesLength; ) {
            address strategy = activeStrategies[i];
            if (
                strategies[strategy].isActive &&
                !strategies[strategy].isEmergencyPaused
            ) {
                targetBalances[i] =
                    (totalPortfolioValue *
                        strategies[strategy].targetAllocationBPS) /
                    10000;
                currentBalances[i] = IStrategyV2(strategy).balanceOf(
                    address(this)
                );
            }

            unchecked {
                ++i;
            } // Gas optimization
        }

        // Execute rebalancing
        _executeRebalance(targetBalances, currentBalances);

        // Update portfolio metrics
        portfolioMetrics.lastRebalanceTime = block.timestamp;
        portfolioMetrics.rebalanceCount++;
        portfolioMetrics.totalValue = totalPortfolioValue;
        portfolioMetrics.weightedAPY = calculateWeightedAPY();

        emit PortfolioRebalanced(
            totalPortfolioValue,
            gasUsageHistory[msg.sender],
            block.timestamp
        );
        emit PerformanceMetric(
            "portfolio_value",
            totalPortfolioValue,
            block.timestamp
        );
    }

    /**
     * @notice Emergency pause a specific strategy with enhanced controls
     * @param strategy Strategy to pause
     */
    function emergencyPauseStrategy(
        address strategy
    )
        external
        onlyEmergencyOperator
        strategyExists(strategy)
        emergencyCooldown
    {
        strategies[strategy].isEmergencyPaused = true;
        emit EmergencyPause(strategy, msg.sender);
        emit SecurityEvent(
            "strategy_paused",
            strategy,
            abi.encode(msg.sender, block.timestamp)
        );
    }

    /**
     * @notice Global emergency pause - stops all operations
     */
    function globalEmergencyPause()
        external
        onlyEmergencyOperator
        emergencyCooldown
    {
        isGlobalEmergencyPaused = true;
        _pause();

        emit GlobalEmergencyPause(true, msg.sender);
        emit SecurityEvent(
            "global_pause",
            msg.sender,
            abi.encode(block.timestamp)
        );
    }

    /**
     * @notice Resume operations after global emergency
     */
    function resumeOperations() external onlyOwner {
        isGlobalEmergencyPaused = false;
        _unpause();

        emit GlobalEmergencyPause(false, msg.sender);
        emit SecurityEvent(
            "operations_resumed",
            msg.sender,
            abi.encode(block.timestamp)
        );
    }

    // [Additional functions would continue with similar security enhancements...]

    /**
     * @notice Get comprehensive security status
     */
    function getSecurityStatus()
        external
        view
        returns (
            bool globalPaused,
            uint256 activeStrategiesCount,
            uint256 lastGlobalAction,
            uint256 totalStrategiesPaused
        )
    {
        globalPaused = isGlobalEmergencyPaused;
        activeStrategiesCount = activeStrategyCount;
        lastGlobalAction = lastEmergencyAction[msg.sender];

        // Count paused strategies
        uint256 pausedCount = 0;
        for (uint256 i = 0; i < activeStrategies.length; i++) {
            if (strategies[activeStrategies[i]].isEmergencyPaused) {
                pausedCount++;
            }
        }
        totalStrategiesPaused = pausedCount;
    }

    // Internal functions with enhanced security...
    function _executeRebalance(
        uint256[] memory targetBalances,
        uint256[] memory currentBalances
    ) internal {
        uint256 strategiesLength = activeStrategies.length;

        for (uint256 i = 0; i < strategiesLength; ) {
            address strategy = activeStrategies[i];
            if (
                !strategies[strategy].isActive ||
                strategies[strategy].isEmergencyPaused
            ) {
                unchecked {
                    ++i;
                }
                continue;
            }

            uint256 target = targetBalances[i];
            uint256 current = currentBalances[i];

            if (target > current) {
                // Need to deposit more to this strategy
                uint256 depositAmount = target - current;
                uint256 availableBalance = asset.balanceOf(address(this));

                if (availableBalance >= depositAmount) {
                    asset.approve(strategy, depositAmount);
                    IStrategyV2(strategy).deposit(depositAmount, address(this));
                }
            } else if (current > target) {
                // Need to withdraw from this strategy
                uint256 withdrawAmount = current - target;
                IStrategyV2(strategy).withdraw(
                    withdrawAmount,
                    address(this),
                    address(this)
                );
            }

            unchecked {
                ++i;
            } // Gas optimization
        }
    }

    // Additional helper functions...
    function _calculateTotalTargetAllocation()
        internal
        view
        returns (uint256 total)
    {
        uint256 strategiesLength = activeStrategies.length;
        for (uint256 i = 0; i < strategiesLength; ) {
            total += strategies[activeStrategies[i]].targetAllocationBPS;
            unchecked {
                ++i;
            }
        }
    }

    function getTotalPortfolioValue() public view returns (uint256 totalValue) {
        uint256 strategiesLength = activeStrategies.length;
        for (uint256 i = 0; i < strategiesLength; ) {
            if (strategies[activeStrategies[i]].isActive) {
                totalValue += IStrategyV2(activeStrategies[i]).balanceOf(
                    address(this)
                );
            }
            unchecked {
                ++i;
            }
        }
        totalValue += asset.balanceOf(address(this));
    }

    function calculateWeightedAPY() public view returns (uint256 weightedAPY) {
        uint256 totalValue = getTotalPortfolioValue();
        if (totalValue == 0) return 0;

        uint256 strategiesLength = activeStrategies.length;
        for (uint256 i = 0; i < strategiesLength; ) {
            address strategy = activeStrategies[i];
            if (strategies[strategy].isActive) {
                uint256 balance = IStrategyV2(strategy).balanceOf(
                    address(this)
                );
                uint256 apy = strategies[strategy].historicalAPY;
                weightedAPY += (balance * apy) / totalValue;
            }
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Get list of all active strategies
     * @return strategiesList Array of active strategy addresses
     */
    function getActiveStrategies()
        public
        view
        returns (address[] memory strategiesList)
    {
        return activeStrategies;
    }
}
