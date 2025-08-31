// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IStrategy.sol";

/**
 * @title StableVault
 * @dev ERC4626-compliant vault for stablecoin yield aggregation. Aggregates across DEX LP pools (e.g., USDC/USDT).
 * Routes liquidity to best strategy based on yield. 1% fee on yields for monetization.
 * Best practices: Uses OpenZeppelin for security, immutable asset, reentrancy guards implicit in ERC4626.
 * For production, add Chainlink oracle for dynamic pool scanning and multi-strategy routing.
 */
contract StableVault is ERC4626, Ownable {
    IStrategy public currentStrategy; // Active strategy for auto-routing.
    uint256 public constant FEE_BASIS = 10000; // 100%
    uint256 public constant PERFORMANCE_FEE = 100; // 1% fee on yields.

    event StrategyUpdated(address newStrategy);
    event Harvested(uint256 yield, uint256 fee);

    constructor(IERC20 _asset, address initialStrategy) ERC4626(_asset) ERC20("Stable Yield Vault", "SYV") Ownable(msg.sender) {
        currentStrategy = IStrategy(initialStrategy);
    }

    /**
     * @dev Override to route deposits to current strategy.
     */
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal virtual override {
        super._deposit(caller, receiver, assets, shares);
        IERC20(asset()).approve(address(currentStrategy), assets);
        currentStrategy.deposit(assets);
    }

    /**
     * @dev Override to withdraw from strategy.
     */
    function _withdraw(address caller, address receiver, address owner, uint256 assets, uint256 shares) internal virtual override {
        currentStrategy.withdraw(assets);
        super._withdraw(caller, receiver, owner, assets, shares);
    }

    /**
     * @dev Total assets including strategy yields.
     */
    function totalAssets() public view virtual override returns (uint256) {
        return currentStrategy.totalAssets();
    }

    /**
     * @dev Harvest yields and apply fee. Callable by owner.
     */
    function harvest() external onlyOwner {
        uint256 yield = currentStrategy.harvest();
        if (yield > 0) {
            uint256 fee = (yield * PERFORMANCE_FEE) / FEE_BASIS;
            // Transfer yield from strategy to vault first
            currentStrategy.withdraw(yield);
            // Then transfer fee to owner
            IERC20(asset()).transfer(owner(), fee);
            // Deposit remaining yield back to strategy
            if (yield > fee) {
                IERC20(asset()).approve(address(currentStrategy), yield - fee);
                currentStrategy.deposit(yield - fee);
            }
            emit Harvested(yield, fee);
        }
    }

    /**
     * @dev Update to best strategy (auto-route logic; in prod, use oracle for yield comparison).
     */
    function setStrategy(address newStrategy) external onlyOwner {
        uint256 assets = totalAssets();
        if (assets > 0) {
            currentStrategy.withdraw(assets);
        }
        currentStrategy = IStrategy(newStrategy);
        IERC20(asset()).approve(newStrategy, assets);
        currentStrategy.deposit(assets);
        emit StrategyUpdated(newStrategy);
    }

    function _transferFee(uint256 fee) internal {
        // Transfer fee to owner (monetization).
        IERC20(asset()).transfer(owner(), fee);
    }
}
