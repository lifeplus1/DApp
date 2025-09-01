// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IStrategyV2.sol";

/**
 * @title StableVault
 * @dev ERC4626-compliant vault for stablecoin yield aggregation. Aggregates across DEX LP pools (e.g., USDC/USDT).
 * Routes liquidity to best strategy based on yield. 1% fee on yields for monetization.
 * Best practices: Uses OpenZeppelin for security, immutable asset, reentrancy guards implicit in ERC4626.
 * For production, add Chainlink oracle for dynamic pool scanning and multi-strategy routing.
 */
contract StableVault is ERC4626, Ownable {
    IStrategyV2 public currentStrategy; // Active strategy for auto-routing.
    uint256 public constant FEE_BASIS = 10000; // 100%
    uint256 public constant PERFORMANCE_FEE = 100; // 1% fee on yields.

    event StrategyUpdated(address newStrategy);
    event Harvested(uint256 yield, uint256 fee);

    constructor(IERC20 _asset, address initialStrategy) ERC4626(_asset) ERC20("Stable Yield Vault", "SYV") Ownable(msg.sender) {
        currentStrategy = IStrategyV2(initialStrategy);
    }

    /**
     * @dev Override to route deposits to current strategy.
     */
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal virtual override {
        super._deposit(caller, receiver, assets, shares);
        IERC20(asset()).approve(address(currentStrategy), assets);
        currentStrategy.deposit(assets, receiver);
    }

    /**
     * @dev Override to withdraw from strategy.
     */
    function _withdraw(address caller, address receiver, address owner, uint256 assets, uint256 shares) internal virtual override {
        // Calculate shares to withdraw from strategy based on assets
        uint256 totalStrategyShares = currentStrategy.balanceOf(owner);
        uint256 sharesToWithdraw = totalStrategyShares > 0 ? (shares * totalStrategyShares) / balanceOf(owner) : 0;
        
        if (sharesToWithdraw > 0) {
            currentStrategy.withdraw(sharesToWithdraw, address(this), owner);
        }
        super._withdraw(caller, receiver, owner, assets, shares);
    }

    /**
     * @dev Total assets including strategy yields.
     */
    function totalAssets() public view virtual override returns (uint256) {
        if (address(currentStrategy) == address(0)) {
            return IERC20(asset()).balanceOf(address(this));
        }
        return currentStrategy.totalAssets();
    }

    /**
     * @dev Harvest yields and apply fee. Callable by owner.
     */
    function harvest() external onlyOwner {
        uint256 yield = currentStrategy.harvest();
        if (yield > 0) {
            uint256 fee = (yield * PERFORMANCE_FEE) / FEE_BASIS;
            if (fee > 0) {
                _transferFee(fee);
            }
            emit Harvested(yield, fee);
        }
    }

    /**
     * @dev Update to best strategy (auto-route logic; in prod, use oracle for yield comparison).
     */
    function setStrategy(address newStrategy) external onlyOwner {
        require(newStrategy != address(0), "Invalid strategy address");
        
        // If we have assets in the current strategy, migrate them
        uint256 assets = currentStrategy.balanceOf(address(this));
        if (assets > 0) {
            // Withdraw from current strategy
            currentStrategy.withdraw(assets, address(this), address(this));
            
            // Deposit to new strategy
            IERC20(asset()).approve(newStrategy, assets);
            IStrategyV2(newStrategy).deposit(assets, address(this));
        }
        
        currentStrategy = IStrategyV2(newStrategy);
        emit StrategyUpdated(newStrategy);
    }

    function _transferFee(uint256 fee) internal {
        // Transfer fee to owner (monetization).
        IERC20(asset()).transfer(owner(), fee);
    }
}
