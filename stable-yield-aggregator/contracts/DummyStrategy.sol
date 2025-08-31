// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IStrategy.sol";

/**
 * @title DummyStrategy
 * @dev Mock strategy for stablecoin LP. In real, integrate with DEX router to add/remove liquidity in USDC/USDT pool.
 * Best practices: View functions for transparency, no state bloat.
 */
contract DummyStrategy is IStrategy {
    IERC20 public asset;
    uint256 public deposited;
    uint256 public yieldAccumulated; // Track accumulated yield

    constructor(IERC20 _asset) {
        asset = _asset;
    }

    function deposit(uint256 amount) external override returns (uint256 shares) {
        asset.transferFrom(msg.sender, address(this), amount);
        deposited += amount;
        return amount; // 1:1 shares for simplicity
    }

    function withdraw(uint256 amount) external override returns (uint256) {
        require(amount <= deposited + yieldAccumulated, "Insufficient balance");
        
        if (amount <= yieldAccumulated) {
            yieldAccumulated -= amount;
        } else {
            uint256 fromDeposit = amount - yieldAccumulated;
            deposited -= fromDeposit;
            yieldAccumulated = 0;
        }
        
        asset.transfer(msg.sender, amount);
        return amount;
    }

    function harvest() external override returns (uint256) {
        uint256 newYield = deposited / 100; // Simulate 1% yield.
        yieldAccumulated += newYield;
        return newYield;
    }

    function totalAssets() external view override returns (uint256) {
        return deposited + yieldAccumulated;
    }

    function getAPY() external view override returns (uint256) {
        return 500; // 5% APY in basis points
    }

    function getTVL() external view override returns (uint256) {
        return deposited + yieldAccumulated;
    }

    function isActive() external pure override returns (bool) {
        return true;
    }

    function name() external pure override returns (string memory) {
        return "Dummy Strategy";
    }

    // Function to simulate yield by minting tokens (for testing)
    function simulateYield() external {
        // This would be called in tests to mint yield tokens to the strategy
        yieldAccumulated += deposited / 100;
    }
}
