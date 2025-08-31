// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IStrategy.sol";

/**
 * @title Advanced Yield Optimizer
 * @notice Intelligent yield optimization and automated rebalancing
 * @dev Core component for long-term competitive advantage
 */
contract YieldOptimizer is Ownable, ReentrancyGuard {
    struct StrategyMetrics {
        address strategy;
        uint256 apy;
        uint256 tvl;
        uint256 reliability; // Historical performance score (0-10000)
        uint256 lastUpdate;
        uint256 gasEfficiency; // Gas cost per $1000 moved
        bool isVerified; // Strategy has been audited
    }
    
    struct OptimizationConfig {
        uint256 minRebalanceThreshold; // Minimum APY difference to trigger rebalance (basis points)
        uint256 maxSingleStrategyAllocation; // Maximum allocation to single strategy (basis points)
        uint256 rebalanceFrequency; // Minimum time between rebalances
        uint256 gasThreshold; // Maximum gas cost for rebalancing
    }
    
    mapping(address => StrategyMetrics) public strategyMetrics;
    address[] public strategies;
    OptimizationConfig public config;
    
    // Performance tracking
    mapping(address => uint256[]) public apyHistory; // Historical APY data
    mapping(address => uint256) public lastRebalanceTime;
    
    event StrategyAdded(address indexed strategy, string name);
    event StrategyUpdated(address indexed strategy, uint256 apy, uint256 tvl);
    event RebalanceRecommended(address indexed from, address indexed to, uint256 amount);
    event ConfigUpdated(OptimizationConfig newConfig);
    
    constructor(address initialOwner) Ownable(initialOwner) {
        config = OptimizationConfig({
            minRebalanceThreshold: 100, // 1% APY difference
            maxSingleStrategyAllocation: 7000, // 70% max allocation
            rebalanceFrequency: 4 hours,
            gasThreshold: 50000 // 0.05 ETH at 20 gwei
        });
    }
    
    /**
     * @notice Add a new strategy to the optimizer
     * @param strategy Address of the strategy contract
     */
    function addStrategy(address strategy) external onlyOwner {
        require(strategy != address(0), "Invalid strategy address");
        require(strategyMetrics[strategy].strategy == address(0), "Strategy already exists");
        
        IStrategy strategyContract = IStrategy(strategy);
        require(strategyContract.isActive(), "Strategy must be active");
        
        strategies.push(strategy);
        strategyMetrics[strategy] = StrategyMetrics({
            strategy: strategy,
            apy: strategyContract.getAPY(),
            tvl: strategyContract.getTVL(),
            reliability: 5000, // Start with medium reliability
            lastUpdate: block.timestamp,
            gasEfficiency: 25000, // Default gas efficiency
            isVerified: false
        });
        
        emit StrategyAdded(strategy, strategyContract.name());
    }
    
    /**
     * @notice Update strategy metrics (called by vault or keeper)
     * @param strategy Address of strategy to update
     */
    function updateStrategyMetrics(address strategy) external {
        require(strategyMetrics[strategy].strategy != address(0), "Strategy not found");
        
        IStrategy strategyContract = IStrategy(strategy);
        uint256 currentAPY = strategyContract.getAPY();
        uint256 currentTVL = strategyContract.getTVL();
        
        // Update metrics
        strategyMetrics[strategy].apy = currentAPY;
        strategyMetrics[strategy].tvl = currentTVL;
        strategyMetrics[strategy].lastUpdate = block.timestamp;
        
        // Store historical data
        apyHistory[strategy].push(currentAPY);
        
        // Update reliability score based on consistency
        _updateReliabilityScore(strategy, currentAPY);
        
        emit StrategyUpdated(strategy, currentAPY, currentTVL);
    }
    
    /**
     * @notice Get optimal strategy allocation recommendations
     * @param totalAmount Total amount to allocate
     * @return strategyList Array of recommended strategy addresses
     * @return allocations Array of recommended allocations per strategy
     */
    function getOptimalAllocation(uint256 totalAmount) 
        external 
        view 
        returns (address[] memory strategyList, uint256[] memory allocations) 
    {
        uint256 activeStrategies = 0;
        
        // Count active strategies
        for (uint256 i = 0; i < strategies.length; i++) {
            if (strategyMetrics[strategies[i]].apy > 0 && 
                IStrategy(strategies[i]).isActive()) {
                activeStrategies++;
            }
        }
        
        strategyList = new address[](activeStrategies);
        allocations = new uint256[](activeStrategies);
        
        if (activeStrategies == 0) return (strategyList, allocations);
        
        // Get strategies with risk-adjusted returns
        uint256[] memory scores = new uint256[](activeStrategies);
        uint256 totalScore = 0;
        uint256 index = 0;
        
        for (uint256 i = 0; i < strategies.length; i++) {
            address strategy = strategies[i];
            StrategyMetrics memory metrics = strategyMetrics[strategy];
            
            if (metrics.apy > 0 && IStrategy(strategy).isActive()) {
                strategyList[index] = strategy;
                
                // Calculate risk-adjusted score
                // APY weighted by reliability and verification status
                uint256 score = metrics.apy * metrics.reliability / 10000;
                if (metrics.isVerified) score = score * 110 / 100; // 10% bonus for verified strategies
                
                scores[index] = score;
                totalScore += score;
                index++;
            }
        }
        
        // Calculate proportional allocations with caps
        for (uint256 i = 0; i < activeStrategies; i++) {
            uint256 proportionalAllocation = (totalAmount * scores[i]) / totalScore;
            
            // Apply maximum allocation cap
            uint256 maxAllocation = (totalAmount * config.maxSingleStrategyAllocation) / 10000;
            if (proportionalAllocation > maxAllocation) {
                allocations[i] = maxAllocation;
            } else {
                allocations[i] = proportionalAllocation;
            }
        }
        
        return (strategyList, allocations);
    }
    
    /**
     * @notice Check if rebalancing is recommended
     * @param currentAllocations Current allocation per strategy
     * @return needsRebalance True if rebalancing is recommended
     * @return recommendedAllocations Recommended new allocations
     */
    function shouldRebalance(
        address[] calldata strategyList,
        uint256[] calldata currentAllocations
    ) external view returns (bool needsRebalance, uint256[] memory recommendedAllocations) {
        require(strategyList.length == currentAllocations.length, "Array length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < currentAllocations.length; i++) {
            totalAmount += currentAllocations[i];
        }
        
        if (totalAmount == 0) return (false, new uint256[](0));
        
        // Get optimal allocations
        (address[] memory optimalStrategies, uint256[] memory optimalAllocations) = 
            this.getOptimalAllocation(totalAmount);
        
        // Check if rebalancing threshold is met
        uint256 maxDeviation = 0;
        
        for (uint256 i = 0; i < strategyList.length; i++) {
            // Find corresponding optimal allocation
            uint256 optimalAmount = 0;
            for (uint256 j = 0; j < optimalStrategies.length; j++) {
                if (optimalStrategies[j] == strategyList[i]) {
                    optimalAmount = optimalAllocations[j];
                    break;
                }
            }
            
            // Calculate deviation percentage
            uint256 currentAmount = currentAllocations[i];
            uint256 deviation = currentAmount > optimalAmount ? 
                currentAmount - optimalAmount : 
                optimalAmount - currentAmount;
            
            uint256 deviationBps = (deviation * 10000) / totalAmount;
            if (deviationBps > maxDeviation) {
                maxDeviation = deviationBps;
            }
        }
        
        needsRebalance = maxDeviation >= config.minRebalanceThreshold;
        recommendedAllocations = optimalAllocations;
        
        return (needsRebalance, recommendedAllocations);
    }
    
    /**
     * @notice Get best performing strategy
     * @return strategy Address of best strategy
     * @return apy Current APY of best strategy
     */
    function getBestStrategy() external view returns (address strategy, uint256 apy) {
        uint256 bestScore = 0;
        address bestStrategy = address(0);
        
        for (uint256 i = 0; i < strategies.length; i++) {
            address currentStrategy = strategies[i];
            StrategyMetrics memory metrics = strategyMetrics[currentStrategy];
            
            if (IStrategy(currentStrategy).isActive()) {
                // Calculate risk-adjusted score
                uint256 score = metrics.apy * metrics.reliability / 10000;
                if (metrics.isVerified) score = score * 110 / 100;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestStrategy = currentStrategy;
                }
            }
        }
        
        return (bestStrategy, bestScore);
    }
    
    /**
     * @notice Mark strategy as verified after audit
     */
    function verifyStrategy(address strategy) external onlyOwner {
        require(strategyMetrics[strategy].strategy != address(0), "Strategy not found");
        strategyMetrics[strategy].isVerified = true;
    }
    
    /**
     * @notice Update optimization configuration
     */
    function updateConfig(OptimizationConfig calldata newConfig) external onlyOwner {
        require(newConfig.minRebalanceThreshold <= 1000, "Threshold too high"); // Max 10%
        require(newConfig.maxSingleStrategyAllocation <= 10000, "Allocation too high"); // Max 100%
        
        config = newConfig;
        emit ConfigUpdated(newConfig);
    }
    
    /**
     * @notice Get strategy count
     */
    function getStrategyCount() external view returns (uint256) {
        return strategies.length;
    }
    
    /**
     * @notice Get all strategies
     */
    function getAllStrategies() external view returns (address[] memory) {
        return strategies;
    }
    
    // Internal function to update reliability score
    function _updateReliabilityScore(address strategy, uint256 currentAPY) internal {
        uint256[] storage history = apyHistory[strategy];
        
        if (history.length < 2) return;
        
        // Calculate variance in APY
        uint256 sum = 0;
        for (uint256 i = 0; i < history.length; i++) {
            sum += history[i];
        }
        uint256 mean = sum / history.length;
        
        uint256 variance = 0;
        for (uint256 i = 0; i < history.length; i++) {
            uint256 diff = history[i] > mean ? history[i] - mean : mean - history[i];
            variance += diff * diff;
        }
        variance = variance / history.length;
        
        // Lower variance = higher reliability
        uint256 newReliability = variance < 100 ? 9000 : // Very stable
                                 variance < 500 ? 7000 : // Moderately stable  
                                 variance < 1000 ? 5000 : // Average stability
                                 3000; // Volatile
        
        strategyMetrics[strategy].reliability = newReliability;
    }
}
