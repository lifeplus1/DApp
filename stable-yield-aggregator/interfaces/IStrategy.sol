// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.26;

// Enhanced strategy interface for advanced yield optimization
interface IStrategy {
    function deposit(uint256 amount) external returns (uint256 shares);
    function withdraw(uint256 amount) external returns (uint256);
    function harvest() external returns (uint256); // Collect yields.
    function totalAssets() external view returns (uint256);
    function getAPY() external view returns (uint256);
    function getTVL() external view returns (uint256);
    function isActive() external view returns (bool);
    function name() external view returns (string memory);
}
