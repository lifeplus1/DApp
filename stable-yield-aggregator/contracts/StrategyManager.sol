// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.26;

import "../interfaces/IStrategy.sol";

/**
 * @title StrategyManager
 * @dev Manages multiple strategies and determines optimal yield routing
 * This is the brain of the aggregator that compares yields across strategies
 */
contract StrategyManager {
    struct StrategyInfo {
        IStrategy strategy;
        uint256 currentAPR; // Basis points (100 = 1%)
        uint256 totalAssets;
        bool active;
        string name;
    }
    
    mapping(address => StrategyInfo) public strategies;
    address[] public strategyList;
    address public owner;
    
    event StrategyAdded(address strategy, string name);
    event StrategyRemoved(address strategy);
    event APRUpdated(address strategy, uint256 newAPR);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function addStrategy(address strategyAddress, string memory name, uint256 initialAPR) external onlyOwner {
        require(!strategies[strategyAddress].active, "Strategy already exists");
        
        strategies[strategyAddress] = StrategyInfo({
            strategy: IStrategy(strategyAddress),
            currentAPR: initialAPR,
            totalAssets: 0,
            active: true,
            name: name
        });
        
        strategyList.push(strategyAddress);
        emit StrategyAdded(strategyAddress, name);
    }
    
    function removeStrategy(address strategyAddress) external onlyOwner {
        require(strategies[strategyAddress].active, "Strategy not active");
        strategies[strategyAddress].active = false;
        emit StrategyRemoved(strategyAddress);
    }
    
    function updateAPR(address strategyAddress, uint256 newAPR) external onlyOwner {
        require(strategies[strategyAddress].active, "Strategy not active");
        strategies[strategyAddress].currentAPR = newAPR;
        emit APRUpdated(strategyAddress, newAPR);
    }
    
    function getBestStrategy() external view returns (address bestStrategy, uint256 bestAPR) {
        bestAPR = 0;
        bestStrategy = address(0);
        
        for (uint i = 0; i < strategyList.length; i++) {
            address strategyAddr = strategyList[i];
            StrategyInfo memory info = strategies[strategyAddr];
            
            if (info.active && info.currentAPR > bestAPR) {
                bestAPR = info.currentAPR;
                bestStrategy = strategyAddr;
            }
        }
    }
    
    function getAllStrategies() external view returns (address[] memory) {
        return strategyList;
    }
    
    function getStrategyInfo(address strategyAddress) external view returns (StrategyInfo memory) {
        return strategies[strategyAddress];
    }
}
