// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "./IStrategyV2.sol";

/**
 * @title ILiveUniswapV3Strategy
 * @notice Extended interface for LiveUniswapV3Strategy to access userShares
 */
interface ILiveUniswapV3Strategy is IStrategyV2 {
    /**
     * @notice Get user's shares in the strategy (not value, but actual shares)
     * @param user Address of the user
     * @return Number of shares the user owns
     */
    function userShares(address user) external view returns (uint256);
}
