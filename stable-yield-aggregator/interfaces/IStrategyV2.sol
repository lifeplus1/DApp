// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.26;

/**
 * @title IStrategyV2
 * @notice Standardized interface for all yield strategies
 * @dev This interface ensures compatibility between strategies and vaults
 */
interface IStrategyV2 {
    /**
     * @notice Deposit tokens into the strategy
     * @param amount Amount of tokens to deposit
     * @param user Address of the user making the deposit
     * @return shares Number of strategy shares minted
     */
    function deposit(
        uint256 amount,
        address user
    ) external returns (uint256 shares);

    /**
     * @notice Withdraw tokens from the strategy
     * @param shares Number of shares to redeem
     * @param receiver Address to receive the withdrawn tokens
     * @param owner Address that owns the shares
     * @return amount Number of tokens withdrawn
     */
    function withdraw(
        uint256 shares,
        address receiver,
        address owner
    ) external returns (uint256 amount);

    /**
     * @notice Harvest yield from the strategy
     * @return yield Amount of yield collected
     */
    function harvest() external returns (uint256 yield);

    /**
     * @notice Get total assets managed by the strategy
     * @return Total amount of underlying tokens
     */
    function totalAssets() external view returns (uint256);

    /**
     * @notice Get user's balance in the strategy
     * @param user Address of the user
     * @return Balance of the user in underlying tokens
     */
    function balanceOf(address user) external view returns (uint256);

    /**
     * @notice Get the underlying asset address
     * @return Address of the underlying asset
     */
    function asset() external view returns (address);

    /**
     * @notice Get current Annual Percentage Yield
     * @return APY in basis points (100 = 1%)
     */
    function getAPY() external view returns (uint256);

    /**
     * @notice Get strategy metadata
     * @return strategyName Name of the strategy
     * @return version Version of the strategy
     * @return description Description of the strategy
     */
    function getStrategyInfo()
        external
        view
        returns (
            string memory strategyName,
            string memory version,
            string memory description
        );
}
