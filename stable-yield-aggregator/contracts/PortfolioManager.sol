// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IStrategyV2.sol";

/**
 * @title PortfolioManagerV1
 * @notice Phase 3: Multi-Strategy Portfolio Management System
 * @dev Manages allocation across multiple yield strategies with automated rebalancing
 */
contract PortfolioManagerV1 is Ownable, ReentrancyGuard {
    // Portfolio Strategy Configuration
    struct StrategyInfo {
        address strategyAddress;
        uint256 targetAllocationBPS; // Basis points (10000 = 100%)
        uint256 currentBalance;
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
    event RebalanceConfigUpdated(uint256 thresholdBPS, uint256 maxSlippage);
    event YieldHarvested(uint256 totalYield, uint256 timestamp);

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

    constructor(address _asset, address initialOwner) Ownable(initialOwner) {
        asset = IERC20(_asset);

        // Initialize rebalance configuration
        rebalanceConfig = RebalanceConfig({
            rebalanceThresholdBPS: 500, // 5% deviation threshold
            maxSlippageBPS: 100, // 1% max slippage
            minRebalanceInterval: 1 hours, // Minimum 1 hour between rebalances
            maxGasPerRebalance: 1000000, // 1M gas limit
            autoRebalanceEnabled: true // Enable auto-rebalancing
        });

        // Initialize portfolio metrics
        portfolioMetrics.lastRebalanceTime = block.timestamp;
    }

    /**
     * @notice Add a new strategy to the portfolio
     * @param strategy Address of the strategy contract
     * @param targetAllocationBPS Target allocation in basis points
     * @param strategyName Human-readable strategy name
     */
    function addStrategy(
        address strategy,
        uint256 targetAllocationBPS,
        string calldata strategyName
    ) external onlyOwner {
        require(strategy != address(0), "Invalid strategy address");
        require(
            strategies[strategy].strategyAddress == address(0),
            "Strategy already exists"
        );
        require(
            targetAllocationBPS > 0 && targetAllocationBPS <= 10000,
            "Invalid allocation"
        );
        require(bytes(strategyName).length > 0, "Strategy name required");

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
            targetAllocationBPS: targetAllocationBPS,
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
    }

    /**
     * @notice Update strategy target allocation
     * @param strategy Strategy address to update
     * @param newTargetAllocationBPS New target allocation in basis points
     */
    function updateStrategyAllocation(
        address strategy,
        uint256 newTargetAllocationBPS
    ) external onlyOwner strategyExists(strategy) {
        require(
            newTargetAllocationBPS > 0 && newTargetAllocationBPS <= 10000,
            "Invalid allocation"
        );

        uint256 oldAllocation = strategies[strategy].targetAllocationBPS;
        strategies[strategy].targetAllocationBPS = newTargetAllocationBPS;

        // Validate total allocation
        uint256 totalAllocation = _calculateTotalTargetAllocation();
        require(totalAllocation <= 10000, "Total allocation exceeds 100%");

        emit StrategyUpdated(strategy, newTargetAllocationBPS);

        // Trigger rebalance if significant change
        uint256 allocationDifference;
        if (newTargetAllocationBPS > oldAllocation) {
            allocationDifference = newTargetAllocationBPS - oldAllocation;
        } else {
            allocationDifference = oldAllocation - newTargetAllocationBPS;
        }

        if (allocationDifference > rebalanceConfig.rebalanceThresholdBPS) {
            _triggerRebalanceIfNeeded();
        }
    }

    /**
     * @notice Remove strategy from portfolio (emergency only)
     * @param strategy Strategy address to remove
     */
    function removeStrategy(
        address strategy
    ) external onlyOwner strategyExists(strategy) {
        // Withdraw all funds from strategy first
        IStrategyV2 strategyContract = IStrategyV2(strategy);
        uint256 balance = strategyContract.balanceOf(address(this));

        if (balance > 0) {
            strategyContract.withdraw(balance, address(this), address(this));
        }

        // Remove from active strategies array
        for (uint256 i = 0; i < activeStrategies.length; i++) {
            if (activeStrategies[i] == strategy) {
                activeStrategies[i] = activeStrategies[
                    activeStrategies.length - 1
                ];
                activeStrategies.pop();
                break;
            }
        }

        delete strategies[strategy];
        activeStrategyCount--;

        emit StrategyRemoved(strategy);
    }

    /**
     * @notice Rebalance portfolio to target allocations
     * @return gasUsed Amount of gas consumed by rebalance
     */
    function rebalancePortfolio()
        external
        onlyRebalancer
        nonReentrant
        returns (uint256 gasUsed)
    {
        uint256 gasStart = gasleft();

        require(
            block.timestamp >=
                portfolioMetrics.lastRebalanceTime +
                    rebalanceConfig.minRebalanceInterval,
            "Rebalance too frequent"
        );

        uint256 totalPortfolioValue = getTotalPortfolioValue();
        require(totalPortfolioValue > 0, "No portfolio value to rebalance");

        // Calculate target allocations
        uint256[] memory targetBalances = new uint256[](
            activeStrategies.length
        );
        uint256[] memory currentBalances = new uint256[](
            activeStrategies.length
        );

        for (uint256 i = 0; i < activeStrategies.length; i++) {
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
        }

        // Execute rebalancing
        _executeRebalance(targetBalances, currentBalances);

        // Update portfolio metrics
        portfolioMetrics.lastRebalanceTime = block.timestamp;
        portfolioMetrics.rebalanceCount++;
        portfolioMetrics.totalValue = totalPortfolioValue;
        portfolioMetrics.weightedAPY = calculateWeightedAPY();

        gasUsed = gasStart - gasleft();

        emit PortfolioRebalanced(totalPortfolioValue, gasUsed, block.timestamp);

        return gasUsed;
    }

    /**
     * @notice Calculate optimal portfolio allocation using yield-weighted approach
     * @return optimalAllocations Array of optimal allocations in basis points
     */
    function calculateOptimalAllocation()
        external
        view
        returns (uint256[] memory optimalAllocations)
    {
        optimalAllocations = new uint256[](activeStrategies.length);

        uint256[] memory strategyAPYs = new uint256[](activeStrategies.length);
        uint256 totalAPYWeight = 0;

        // Get current APYs for all active strategies
        for (uint256 i = 0; i < activeStrategies.length; i++) {
            address strategy = activeStrategies[i];
            if (
                strategies[strategy].isActive &&
                !strategies[strategy].isEmergencyPaused
            ) {
                strategyAPYs[i] = IStrategyV2(strategy).getAPY();
                totalAPYWeight += strategyAPYs[i];
            }
        }

        // Calculate yield-weighted allocations
        if (totalAPYWeight > 0) {
            for (uint256 i = 0; i < activeStrategies.length; i++) {
                if (strategyAPYs[i] > 0) {
                    optimalAllocations[i] =
                        (strategyAPYs[i] * 10000) /
                        totalAPYWeight;
                }
            }
        }

        return optimalAllocations;
    }

    /**
     * @notice Get current portfolio weighted APY
     * @return weightedAPY Portfolio-weighted APY in basis points
     */
    function calculateWeightedAPY() public view returns (uint256 weightedAPY) {
        uint256 totalValue = getTotalPortfolioValue();
        if (totalValue == 0) return 0;

        uint256 totalWeightedAPY = 0;

        for (uint256 i = 0; i < activeStrategies.length; i++) {
            address strategy = activeStrategies[i];
            if (
                strategies[strategy].isActive &&
                !strategies[strategy].isEmergencyPaused
            ) {
                uint256 strategyBalance = IStrategyV2(strategy).balanceOf(
                    address(this)
                );
                if (strategyBalance > 0) {
                    uint256 strategyAPY = IStrategyV2(strategy).getAPY();
                    uint256 weight = (strategyBalance * 10000) / totalValue;
                    totalWeightedAPY += (strategyAPY * weight) / 10000;
                }
            }
        }

        return totalWeightedAPY;
    }

    /**
     * @notice Get total portfolio value across all strategies
     * @return totalValue Total value in base asset
     */
    function getTotalPortfolioValue() public view returns (uint256 totalValue) {
        for (uint256 i = 0; i < activeStrategies.length; i++) {
            address strategy = activeStrategies[i];
            if (strategies[strategy].isActive) {
                totalValue += IStrategyV2(strategy).totalAssets();
            }
        }

        // Add any unallocated balance
        totalValue += asset.balanceOf(address(this));

        return totalValue;
    }

    /**
     * @notice Harvest yield from all strategies
     * @return totalYield Total yield harvested
     */
    function harvestAllStrategies()
        external
        onlyRebalancer
        returns (uint256 totalYield)
    {
        for (uint256 i = 0; i < activeStrategies.length; i++) {
            address strategy = activeStrategies[i];
            if (
                strategies[strategy].isActive &&
                !strategies[strategy].isEmergencyPaused
            ) {
                try IStrategyV2(strategy).harvest() returns (uint256 yield) {
                    totalYield += yield;
                } catch {
                    // Continue if individual strategy harvest fails
                }
            }
        }

        portfolioMetrics.totalYieldGenerated += totalYield;
        emit YieldHarvested(totalYield, block.timestamp);

        return totalYield;
    }

    /**
     * @notice Add or remove emergency operator
     * @param operator Address to update
     * @param authorized Whether to authorize or deauthorize
     */
    function setEmergencyOperator(
        address operator,
        bool authorized
    ) external onlyOwner {
        require(operator != address(0), "Invalid operator address");
        emergencyOperators[operator] = authorized;
    }

    /**
     * @notice Emergency pause a specific strategy
     * @param strategy Strategy to pause
     */
    function emergencyPauseStrategy(
        address strategy
    ) external onlyEmergencyOperator strategyExists(strategy) {
        strategies[strategy].isEmergencyPaused = true;
        emit EmergencyPause(strategy, msg.sender);
    }

    /**
     * @notice Update rebalance configuration
     * @param newThresholdBPS New rebalance threshold
     * @param newMaxSlippageBPS New maximum slippage
     */
    function updateRebalanceConfig(
        uint256 newThresholdBPS,
        uint256 newMaxSlippageBPS
    ) external onlyOwner {
        require(newThresholdBPS <= 2000, "Threshold too high"); // Max 20%
        require(newMaxSlippageBPS <= 500, "Slippage too high"); // Max 5%

        rebalanceConfig.rebalanceThresholdBPS = newThresholdBPS;
        rebalanceConfig.maxSlippageBPS = newMaxSlippageBPS;

        emit RebalanceConfigUpdated(newThresholdBPS, newMaxSlippageBPS);
    }

    /**
     * @notice Authorize address for rebalancing operations
     * @param rebalancer Address to authorize
     */
    function addRebalancer(address rebalancer) external onlyOwner {
        authorizedRebalancers[rebalancer] = true;
    }

    /**
     * @notice Get strategy information
     * @param strategy Strategy address
     * @return info Strategy information struct
     */
    function getStrategyInfo(
        address strategy
    ) external view returns (StrategyInfo memory info) {
        return strategies[strategy];
    }

    /**
     * @notice Get all active strategies
     * @return strategiesList Array of active strategy addresses
     */
    function getActiveStrategies()
        external
        view
        returns (address[] memory strategiesList)
    {
        return activeStrategies;
    }

    /**
     * @notice Check if portfolio needs rebalancing
     * @return needsRebalance True if rebalancing is recommended
     */
    function needsRebalancing() external view returns (bool needsRebalance) {
        uint256 totalValue = getTotalPortfolioValue();
        if (totalValue == 0) return false;

        for (uint256 i = 0; i < activeStrategies.length; i++) {
            address strategy = activeStrategies[i];
            if (
                strategies[strategy].isActive &&
                !strategies[strategy].isEmergencyPaused
            ) {
                uint256 currentBalance = IStrategyV2(strategy).balanceOf(
                    address(this)
                );
                uint256 targetBalance = (totalValue *
                    strategies[strategy].targetAllocationBPS) / 10000;

                uint256 deviation = currentBalance > targetBalance
                    ? currentBalance - targetBalance
                    : targetBalance - currentBalance;

                uint256 deviationBPS = totalValue > 0
                    ? (deviation * 10000) / totalValue
                    : 0;

                if (deviationBPS > rebalanceConfig.rebalanceThresholdBPS) {
                    return true;
                }
            }
        }

        return false;
    }

    // Internal Functions

    function _calculateTotalTargetAllocation()
        internal
        view
        returns (uint256 total)
    {
        for (uint256 i = 0; i < activeStrategies.length; i++) {
            total += strategies[activeStrategies[i]].targetAllocationBPS;
        }
        return total;
    }

    function _executeRebalance(
        uint256[] memory targetBalances,
        uint256[] memory currentBalances
    ) internal {
        for (uint256 i = 0; i < activeStrategies.length; i++) {
            address strategy = activeStrategies[i];
            if (
                !strategies[strategy].isActive ||
                strategies[strategy].isEmergencyPaused
            ) continue;

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

            strategies[strategy].currentBalance = IStrategyV2(strategy)
                .balanceOf(address(this));
            strategies[strategy].lastRebalanceTime = block.timestamp;
        }
    }

    function _triggerRebalanceIfNeeded() internal view {
        if (rebalanceConfig.autoRebalanceEnabled && this.needsRebalancing()) {
            // Could implement automatic rebalancing trigger here
            // For now, just emit an event for external monitoring
        }
    }
}
