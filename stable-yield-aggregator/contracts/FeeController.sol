// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FeeController
 * @notice Centralized fee collection & distribution controller.
 * @dev Minimal scaffold per ADR-0005. Implements:
 *  - Configurable performance fee bps
 *  - Event emission for accrual
 *  - Authorized strategy registration (allow-list)
 *  - Pull-based fee collection from strategies (strategy transfers fees here)
 *  - Distribution placeholder (to be expanded with DistributionSplitter)
 */
contract FeeController is Ownable {
    // ============ Events ============
    event StrategyRegistered(address indexed strategy, bool enabled);
    event PerformanceFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event FeesAccrued(address indexed strategy, address indexed token, uint256 amount);
    event FeesWithdrawn(address indexed recipient, address indexed token, uint256 amount);
    event FeesWithdrawnPerStrategy(address indexed strategy, address indexed token, uint256 amount);

    // ============ Constants ============
    uint256 public constant MAX_FEE_BPS = 2_000; // 20% safety cap

    // ============ Storage ============
    mapping(address => bool) public isStrategy;               // authorized fee sources
    mapping(address => mapping(address => uint256)) public accrued; // token => strategy => amount
    address[] public strategies;                              // registry list (append-only)
    uint256 public performanceFeeBps = 1_000; // default 10%

    // Destination for withdrawn fees (can be a splitter later)
    address public feeRecipient;

    // ============ Modifiers ============
    modifier onlyStrategy() {
        require(isStrategy[msg.sender], "NOT_STRATEGY");
        _;
    }

    constructor(address _owner, address _feeRecipient) Ownable(_owner) {
        require(_owner != address(0) && _feeRecipient != address(0), "ZERO_ADDR");
        feeRecipient = _feeRecipient;
    }

    // ============ Admin Functions ============

    function registerStrategy(address strategy, bool enabled) external onlyOwner {
        require(strategy != address(0), "ZERO_ADDR");
        if (enabled && !isStrategy[strategy]) {
            strategies.push(strategy);
        }
        isStrategy[strategy] = enabled;
        emit StrategyRegistered(strategy, enabled);
    }

    function setPerformanceFeeBps(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "FEE_TOO_HIGH");
        uint256 old = performanceFeeBps;
        performanceFeeBps = newFeeBps;
        emit PerformanceFeeUpdated(old, newFeeBps);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "ZERO_ADDR");
        feeRecipient = newRecipient;
    }

    // ============ Strategy Hooks ============
    /**
     * @notice Called by a strategy after realizing performance fees.
     * @dev Strategy must transfer the fee tokens to this contract before calling.
     */
    function notifyFee(address token, uint256 amount) external onlyStrategy {
        require(amount > 0, "NO_AMOUNT");
        // Balance check optional: we trust transfer happened pre-call.
        accrued[token][msg.sender] += amount;
        emit FeesAccrued(msg.sender, token, amount);
    }

    // ============ Fee Management ============
    function withdrawFees(address token) external {
        uint256 length = strategies.length;
        uint256 total;
        // Sum accrued amounts for enabled strategies
        for (uint256 i; i < length; ++i) {
            address strat = strategies[i];
            if (isStrategy[strat]) {
                uint256 amt = accrued[token][strat];
                if (amt > 0) {
                    total += amt;
                }
            }
        }
        require(total > 0, "NO_FEES");
        // Safety: ensure contract holds at least total (strategies should have transferred already)
        uint256 bal = IERC20(token).balanceOf(address(this));
        require(bal >= total, "BAL_MISMATCH");
        // Zero-out and emit per-strategy events
        for (uint256 i; i < length; ++i) {
            address strat = strategies[i];
            if (isStrategy[strat]) {
                uint256 amt = accrued[token][strat];
                if (amt > 0) {
                    accrued[token][strat] = 0;
                    emit FeesWithdrawnPerStrategy(strat, token, amt);
                }
            }
        }
        IERC20(token).transfer(feeRecipient, total);
        emit FeesWithdrawn(feeRecipient, token, total);
    }

    function strategiesCount() external view returns (uint256) { return strategies.length; }
}
