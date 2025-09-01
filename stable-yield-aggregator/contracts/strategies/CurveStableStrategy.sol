// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../../interfaces/IStrategyV2.sol";

interface IFeeControllerV2Curve {
    function performanceFeeBps() external view returns (uint256);
    function notifyFee(address token, uint256 amount) external;
}

// Curve Finance Interface
interface ICurvePool {
    function add_liquidity(uint256[3] calldata amounts, uint256 min_mint_amount) external returns (uint256);
    function remove_liquidity_one_coin(uint256 token_amount, int128 i, uint256 min_amount) external returns (uint256);
    function get_virtual_price() external view returns (uint256);
    function balances(uint256 i) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
    function fee() external view returns (uint256);
}

interface ICurveGauge {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function balanceOf(address user) external view returns (uint256);
    function claimable_tokens(address user) external view returns (uint256);
    function claim_rewards() external;
}

interface ICRVToken {
    function balanceOf(address user) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title CurveStableStrategy
 * @notice Phase 3: Curve Finance 3Pool Strategy for stablecoin yields
 * @dev Provides liquidity to Curve 3Pool (USDC/USDT/DAI) and stakes for CRV rewards
 */
contract CurveStableStrategy is IStrategyV2, Ownable, ReentrancyGuard {
    
    // Strategy Configuration
    IERC20 public immutable asset; // USDC
    address public immutable vault;
    
    // Curve Protocol Interfaces
    ICurvePool public immutable curvePool;      // 3Pool contract
    ICurveGauge public immutable curveGauge;    // 3Pool gauge for staking
    IERC20 public immutable curve3LP;          // 3Pool LP tokens
    ICRVToken public immutable crvToken;       // CRV reward token
    
    // Strategy State
    uint256 public totalDeposited;
    uint256 public totalLPTokens;
    uint256 public totalCRVEarned;
    uint256 public lastHarvestTime;
    uint256 public cumulativeYield;
    
    // Configuration
    uint256 public constant USDC_INDEX = 1;    // USDC index in 3Pool
    uint256 public performanceFee = 1000;      // 10% performance fee (basis points) (fallback if no controller)
    uint256 public slippageTolerance = 100;    // 1% slippage tolerance
    IFeeControllerV2Curve public feeController; // optional external controller
    
    // Events
    event Deposit(uint256 amount, uint256 lpTokens, address user);
    event Withdrawal(uint256 shares, uint256 amount, address receiver);
    event YieldHarvested(uint256 crvAmount, uint256 timestamp);
    event PerformanceFeeUpdated(uint256 newFee);
    event EmergencyWithdrawal(uint256 amount, address recipient);
    
    modifier onlyVault() {
        require(msg.sender == vault || msg.sender == owner(), "Only vault or owner");
        _;
    }
    
    constructor(
        address _asset,
        address _vault,
        address _curvePool,
        address _curveGauge,
        address _curve3LP,
        address _crvToken,
        address initialOwner
    ) Ownable(initialOwner) {
        asset = IERC20(_asset);
        vault = _vault;
        curvePool = ICurvePool(_curvePool);
        curveGauge = ICurveGauge(_curveGauge);
        curve3LP = IERC20(_curve3LP);
        crvToken = ICRVToken(_crvToken);
        
        lastHarvestTime = block.timestamp;
        
        // Approve contracts for operations
        asset.approve(_curvePool, type(uint256).max);
        curve3LP.approve(_curveGauge, type(uint256).max);
    }
    
    /**
     * @notice Deposit USDC into Curve 3Pool strategy
     * @param amount Amount of USDC to deposit
     * @param user Address of the user (for tracking)
     * @return shares Amount of strategy shares minted (LP tokens)
     */
    function deposit(uint256 amount, address user) external override onlyVault nonReentrant returns (uint256 shares) {
        require(amount > 0, "Amount must be greater than zero");
        require(user != address(0), "Invalid user address");
        
        // Transfer USDC from vault
        asset.transferFrom(msg.sender, address(this), amount);
        
        // Add liquidity to Curve 3Pool
        uint256[3] memory amounts = [0, amount, 0]; // [DAI, USDC, USDT]
        uint256 minLPTokens = _calculateMinLPTokens(amount);
        uint256 lpTokensReceived = curvePool.add_liquidity(amounts, minLPTokens);
        
        // Stake LP tokens in Curve Gauge
        curveGauge.deposit(lpTokensReceived);
        
        // Update state
        totalDeposited += amount;
        totalLPTokens += lpTokensReceived;
        
        emit Deposit(amount, lpTokensReceived, user);
        
        return lpTokensReceived;
    }
    
    /**
     * @notice Withdraw USDC from Curve strategy
     * @param shares Amount of LP token shares to redeem
     * @param receiver Address to receive withdrawn USDC
     * @param owner Address that owns the shares
     * @return assets Amount of USDC withdrawn
     */
    function withdraw(uint256 shares, address receiver, address owner) external override onlyVault nonReentrant returns (uint256 assets) {
        require(shares > 0, "Shares must be greater than zero");
        require(shares <= totalLPTokens, "Insufficient LP tokens");
        require(receiver != address(0), "Invalid receiver");
        require(owner != address(0), "Invalid owner");
        
        // Unstake LP tokens from gauge
        curveGauge.withdraw(shares);
        
        // Remove liquidity from Curve pool (get USDC back)
        uint256 minUSDCAmount = _calculateMinUSDCFromLP(shares);
        uint256 usdcReceived = curvePool.remove_liquidity_one_coin(
            shares,
            int128(int256(USDC_INDEX)), 
            minUSDCAmount
        );
        
        // Transfer USDC to receiver
        asset.transfer(receiver, usdcReceived);
        
        // Update state
        totalLPTokens -= shares;
        if (usdcReceived <= totalDeposited) {
            totalDeposited -= usdcReceived;
        } else {
            totalDeposited = 0;
        }
        
        emit Withdrawal(shares, usdcReceived, receiver);
        
        return usdcReceived;
    }
    
    /**
     * @notice Harvest CRV rewards from Curve gauge
     * @return yield Amount of CRV tokens harvested (converted to USDC equivalent)
     */
    function harvest() external override returns (uint256 yield) {
        // Claim CRV rewards from gauge
        curveGauge.claim_rewards();
        
        uint256 crvBalance = crvToken.balanceOf(address(this));
        
        if (crvBalance > 0) {
            uint256 feeBps = performanceFee;
            if (address(feeController) != address(0)) {
                feeBps = feeController.performanceFeeBps();
            }
            uint256 feeAmount = (crvBalance * feeBps) / 10_000;
            if (feeAmount > 0 && address(feeController) != address(0)) {
                // Transfer fee to controller & notify (fee paid in CRV)
                crvToken.transfer(address(feeController), feeAmount);
                feeController.notifyFee(address(crvToken), feeAmount);
                crvBalance -= feeAmount;
            }
            // For this implementation, we'll track CRV rewards
            // In production, you would swap CRV for USDC through a DEX
            totalCRVEarned += crvBalance;
            
            // Calculate yield in USDC equivalent (simplified)
            // In production, use price oracle to get CRV/USDC rate
            yield = _convertCRVToUSDCValue(crvBalance);
            
            cumulativeYield += yield;
            lastHarvestTime = block.timestamp;
            
            emit YieldHarvested(crvBalance, block.timestamp);
        }
        
        return yield;
    }

    function setFeeController(address _fc) external onlyOwner {
        feeController = IFeeControllerV2Curve(_fc);
    }
    
    /**
     * @notice Get total assets managed by strategy
     * @return Total USDC value including deposits and accrued yield
     */
    function totalAssets() external view override returns (uint256) {
        // Get current LP token balance from gauge
        uint256 currentLPTokens = curveGauge.balanceOf(address(this));
        
        if (currentLPTokens == 0) {
            return asset.balanceOf(address(this));
        }
        
        // Calculate USDC value of LP tokens
        uint256 usdcValue = _calculateUSDCValueFromLP(currentLPTokens);
        
        // Add any unharvested CRV rewards (in USDC equivalent)
        uint256 pendingCRVValue = _calculatePendingCRVValue();
        
        return usdcValue + pendingCRVValue + asset.balanceOf(address(this));
    }
    
    /**
     * @notice Get user's balance in the strategy
     * @param user Address of the user
     * @return Balance in USDC equivalent
     */
    function balanceOf(address user) external view override returns (uint256) {
        // For this implementation, return total balance for vault
        if (user == vault) {
            return this.totalAssets();
        }
        return 0;
    }
    
    /**
     * @notice Get current Annual Percentage Yield
     * @return APY in basis points (100 = 1%)
     */
    function getAPY() external view override returns (uint256) {
        // Calculate APY based on:
        // 1. Curve pool trading fees
        // 2. CRV reward emissions
        // 3. Historical performance
        
        uint256 baseAPY = _calculateCurvePoolAPY();
        uint256 crvAPY = _calculateCRVRewardAPY();
        
        return baseAPY + crvAPY;
    }
    
    /**
     * @notice Get strategy information
     * @return strategyName Name of the strategy
     * @return version Version string
     * @return description Strategy description
     */
    function getStrategyInfo() external pure override returns (string memory strategyName, string memory version, string memory description) {
        return (
            "Curve 3Pool Stable Strategy",
            "1.0.0",
            "Provides liquidity to Curve 3Pool (USDC/USDT/DAI) and earns CRV rewards"
        );
    }
    
    /**
     * @notice Get detailed strategy metrics
     * @return totalDeposits Total amount deposited
     * @return currentLPTokens Current LP tokens held
     * @return totalCRVRewards Total CRV rewards earned
     * @return currentAPY Current APY of the strategy
     * @return totalYield Total yield generated
     */
    function getStrategyMetrics() external view returns (
        uint256 totalDeposits,
        uint256 currentLPTokens,
        uint256 totalCRVRewards,
        uint256 currentAPY,
        uint256 totalYield
    ) {
        return (
            totalDeposited,
            curveGauge.balanceOf(address(this)),
            totalCRVEarned,
            this.getAPY(),
            cumulativeYield
        );
    }
    
    /**
     * @notice Emergency withdrawal (owner only)
     * @param recipient Address to receive emergency withdrawal
     */
    function emergencyWithdraw(address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        
        // Withdraw all LP tokens from gauge
        uint256 gaugeBalance = curveGauge.balanceOf(address(this));
        if (gaugeBalance > 0) {
            curveGauge.withdraw(gaugeBalance);
        }
        
        // Remove all liquidity from pool
        uint256 lpBalance = curve3LP.balanceOf(address(this));
        if (lpBalance > 0) {
            curvePool.remove_liquidity_one_coin(
                lpBalance,
                int128(int256(USDC_INDEX)),
                0 // No slippage protection in emergency
            );
        }
        
        // Transfer all USDC to recipient
        uint256 usdcBalance = asset.balanceOf(address(this));
        if (usdcBalance > 0) {
            asset.transfer(recipient, usdcBalance);
        }
        
        emit EmergencyWithdrawal(usdcBalance, recipient);
    }
    
    /**
     * @notice Update performance fee (owner only)
     * @param newFee New performance fee in basis points
     */
    function updatePerformanceFee(uint256 newFee) external onlyOwner {
        require(newFee <= 2000, "Fee too high"); // Max 20%
        performanceFee = newFee;
        emit PerformanceFeeUpdated(newFee);
    }
    
    // Internal calculation functions
    
    function _calculateMinLPTokens(uint256 usdcAmount) internal view returns (uint256) {
        // Calculate minimum LP tokens expected (with slippage tolerance)
        // This is a simplified calculation - in production, use Curve's calc functions
        uint256 virtualPrice = curvePool.get_virtual_price();
        uint256 expectedLP = (usdcAmount * 1e18) / virtualPrice;
        
        return (expectedLP * (10000 - slippageTolerance)) / 10000;
    }
    
    function _calculateMinUSDCFromLP(uint256 lpTokens) internal view returns (uint256) {
        // Calculate minimum USDC expected from LP tokens (with slippage tolerance)
        uint256 virtualPrice = curvePool.get_virtual_price();
        uint256 expectedUSDC = (lpTokens * virtualPrice) / 1e18;
        
        return (expectedUSDC * (10000 - slippageTolerance)) / 10000;
    }
    
    function _calculateUSDCValueFromLP(uint256 lpTokens) internal view returns (uint256) {
        if (lpTokens == 0) return 0;
        
        uint256 virtualPrice = curvePool.get_virtual_price();
        return (lpTokens * virtualPrice) / 1e18;
    }
    
    function _calculateCurvePoolAPY() internal view returns (uint256) {
        // Simplified APY calculation based on trading volume and fees
        // In production, this would use historical data and volume metrics
        uint256 poolFee = curvePool.fee(); // Get pool fee
        
        // Estimate APY from trading fees (simplified)
        // This is a placeholder - real implementation would use volume data
        return (poolFee * 365 * 100) / 10000; // Convert to APY basis points
    }
    
    function _calculateCRVRewardAPY() internal view returns (uint256) {
        // Simplified CRV reward APY calculation
        // In production, this would use gauge inflation rate and CRV price
        
        uint256 pendingRewards = curveGauge.claimable_tokens(address(this));
        if (pendingRewards == 0 || totalLPTokens == 0) return 0;
        
        // Estimate annual CRV rewards (placeholder calculation)
        uint256 dailyRewards = pendingRewards; // Assume current pending is daily
        uint256 annualRewards = dailyRewards * 365;
        uint256 rewardsValueUSDC = _convertCRVToUSDCValue(annualRewards);
        uint256 totalValue = _calculateUSDCValueFromLP(totalLPTokens);
        
        if (totalValue == 0) return 0;
        
        return (rewardsValueUSDC * 10000) / totalValue;
    }
    
    function _calculatePendingCRVValue() internal view returns (uint256) {
        uint256 pendingCRV = curveGauge.claimable_tokens(address(this));
        return _convertCRVToUSDCValue(pendingCRV);
    }
    
    function _convertCRVToUSDCValue(uint256 crvAmount) internal pure returns (uint256) {
        // Placeholder CRV to USDC conversion
        // In production, use price oracle (Chainlink) or DEX price
        // Assuming 1 CRV ≈ $0.50 for this example
        return (crvAmount * 50) / 100; // $0.50 per CRV
    }
}
