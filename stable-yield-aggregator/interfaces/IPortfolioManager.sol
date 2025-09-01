// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IPortfolioManager
 * @notice Interface for PortfolioManager contract
 */
interface IPortfolioManager {
    function rebalancePortfolio() external returns (uint256);
    function emergencyPauseStrategy(address strategy) external;
    function getTotalPortfolioValue() external view returns (uint256);
    function getActiveStrategies() external view returns (address[] memory);
}
