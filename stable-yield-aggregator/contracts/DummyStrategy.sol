// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IStrategyV2.sol";

/**
 * @title DummyStrategy
 * @dev Mock strategy for stablecoin LP. In real, integrate with DEX router to add/remove liquidity in USDC/USDT pool.
 * Best practices: View functions for transparency, no state bloat.
 */
contract DummyStrategy is IStrategyV2 {
    IERC20 public _asset;
    uint256 public deposited;
    uint256 public yieldAccumulated; // Track accumulated yield

    // Track user balances
    mapping(address => uint256) private userShares;
    uint256 public totalShares;

    constructor(IERC20 __asset) {
        _asset = __asset;
    }

    function deposit(
        uint256 amount,
        address user
    ) external override returns (uint256 shares) {
        _asset.transferFrom(msg.sender, address(this), amount);
        deposited += amount;
        shares = amount; // 1:1 shares for simplicity
        userShares[user] += shares;
        totalShares += shares;
        return shares;
    }

    function withdraw(
        uint256 shares,
        address receiver,
        address owner
    ) external override returns (uint256) {
        require(userShares[owner] >= shares, "Insufficient shares");
        require(shares <= deposited + yieldAccumulated, "Insufficient balance");

        uint256 amount = shares; // 1:1 for simplicity

        userShares[owner] -= shares;
        totalShares -= shares;

        if (amount <= yieldAccumulated) {
            yieldAccumulated -= amount;
        } else {
            uint256 fromDeposit = amount - yieldAccumulated;
            deposited -= fromDeposit;
            yieldAccumulated = 0;
        }

        _asset.transfer(receiver, amount);
        return amount;
    }

    function harvest() external override returns (uint256) {
        // Check if there are extra tokens beyond our deposited amount (external yield)
        uint256 currentBalance = _asset.balanceOf(address(this));
        uint256 expectedBalance = deposited + yieldAccumulated;

        uint256 newYield;
        if (currentBalance > expectedBalance) {
            // There's external yield - use the actual extra tokens
            newYield = currentBalance - expectedBalance;
            yieldAccumulated += newYield;
        } else {
            // Simulate internal yield generation only if we have enough deposited
            if (deposited > 0) {
                newYield = deposited / 100; // Simulate 1% yield.
                yieldAccumulated += newYield;
            } else {
                return 0;
            }
        }

        // Transfer fee to the vault (caller)
        if (newYield > 0) {
            uint256 fee = (newYield * 100) / 10000; // 1% fee
            if (fee > 0 && _asset.balanceOf(address(this)) >= fee) {
                _asset.transfer(msg.sender, fee);
                yieldAccumulated -= fee; // Reduce accumulated yield by fee
            }
        }

        return newYield;
    }

    function totalAssets() external view override returns (uint256) {
        return deposited + yieldAccumulated;
    }

    function getAPY() external pure override returns (uint256) {
        return 500; // 5% APY in basis points
    }

    function getTVL() external view returns (uint256) {
        return deposited + yieldAccumulated;
    }

    function isActive() external pure returns (bool) {
        return true;
    }

    function name() external pure returns (string memory) {
        return "Dummy Strategy";
    }

    function balanceOf(address user) external view override returns (uint256) {
        return userShares[user];
    }

    /**
     * @notice Get the underlying asset address
     * @return Address of the underlying asset
     */
    function asset() external view override returns (address) {
        return address(_asset);
    }

    function getStrategyInfo()
        external
        pure
        override
        returns (
            string memory strategyName,
            string memory version,
            string memory description
        )
    {
        return (
            "Dummy Strategy",
            "1.0.0",
            "A simple mock strategy for testing"
        );
    }

    // Function to simulate yield by minting tokens (for testing)
    function simulateYield() external {
        // This would be called in tests to mint yield tokens to the strategy
        yieldAccumulated += deposited / 100;
    }
}
