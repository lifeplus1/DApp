// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "../../interfaces/IStrategyV2.sol";

// Aave V3 Interfaces
interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
    function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external;
    function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256);
    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    );
    function getReserveData(address asset) external view returns (
        uint256 configuration,
        uint128 liquidityIndex,
        uint128 currentLiquidityRate,
        uint128 variableBorrowIndex,
        uint128 currentVariableBorrowRate,
        uint128 currentStableBorrowRate,
        uint40 lastUpdateTimestamp,
        uint16 id,
        address aTokenAddress,
        address stableDebtTokenAddress,
        address variableDebtTokenAddress,
        address interestRateStrategyAddress,
        uint128 accruedToTreasury,
        uint128 unbacked,
        uint128 isolationModeTotalDebt
    );
}

interface IAToken is IERC20 {
    function scaledBalanceOf(address user) external view returns (uint256);
}

interface IVariableDebtToken is IERC20 {
    function scaledBalanceOf(address user) external view returns (uint256);
}

interface IPriceOracle {
    function getAssetPrice(address asset) external view returns (uint256);
}

/**
 * @title AaveV3Strategy
 * @notice Phase 6: Enterprise Aave V3 Lending Strategy with Advanced Risk Management
 * @dev Implements yield generation through Aave V3 lending with optional leverage and comprehensive risk controls
 */
contract AaveV3Strategy is IStrategyV2, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // Role definitions
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // Constants
    uint256 public constant MIN_HEALTH_FACTOR = 1.5e18;      // 1.5x minimum health factor
    uint256 public constant TARGET_HEALTH_FACTOR = 2.0e18;   // 2.0x target health factor
    uint256 public constant MAX_LEVERAGE_RATIO = 300;        // 3x maximum leverage
    uint256 public constant LIQUIDATION_BUFFER = 0.1e18;     // 10% liquidation buffer
    uint256 public constant PERFORMANCE_FEE_BPS = 1000;      // 10% performance fee
    uint256 public constant MAX_BPS = 10000;

    // Core contracts
    IERC20 public immutable asset;                    // USDC
    IPool public immutable aavePool;                  // Aave V3 Pool
    IAToken public immutable aToken;                  // aUSDC token
    IVariableDebtToken public immutable debtToken;    // Variable debt token
    IPriceOracle public immutable priceOracle;        // Aave price oracle

    // Strategy configuration
    struct AaveConfig {
        uint256 targetLTV;           // Target loan-to-value ratio (BPS)
        uint256 maxLTV;              // Maximum LTV before deleveraging (BPS)
        uint256 rebalanceThreshold;  // Health factor rebalance trigger (BPS)
        bool leverageEnabled;        // Enable/disable leverage
        uint256 performanceFee;      // Strategy performance fee (BPS)
        uint256 maxSlippage;         // Maximum acceptable slippage (BPS)
    }

    AaveConfig public config;

    // State tracking
    uint256 public totalDeposits;
    uint256 public totalBorrows;
    uint256 public lastHarvest;
    uint256 public performanceFeeAccrued;
    uint256 public totalPrincipal;
    uint256 public totalYieldGenerated;

    // Emergency state
    bool public emergencyMode;
    uint256 public emergencyExitTimestamp;
    address private adminAddress; // cache admin for emergency withdrawals

    // Events
    event Deposit(address indexed caller, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed caller, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
    event HealthFactorUpdated(uint256 oldHealthFactor, uint256 newHealthFactor);
    event LeverageAdjusted(uint256 borrowAmount, uint256 newHealthFactor);
    event EmergencyActivated(address indexed caller, uint256 timestamp);
    event PerformanceFeeCollected(uint256 feeAmount, uint256 timestamp);
    event ConfigUpdated(uint256 targetLTV, uint256 maxLTV, bool leverageEnabled);

    // Modifiers
    modifier onlyManager() {
        require(hasRole(MANAGER_ROLE, msg.sender), "Not manager");
        _;
    }

    modifier onlyEmergency() {
        require(hasRole(EMERGENCY_ROLE, msg.sender), "Not emergency operator");
        _;
    }

    modifier notInEmergency() {
        require(!emergencyMode, "Emergency mode active");
        _;
    }

    constructor(
        address _asset,
        address _aavePool,
        address _aToken,
        address _debtToken,
        address _priceOracle,
        address _admin
    ) {
        require(_asset != address(0), "Invalid asset");
        require(_aavePool != address(0), "Invalid pool");
        require(_aToken != address(0), "Invalid aToken");
        require(_admin != address(0), "Invalid admin");

        asset = IERC20(_asset);
        aavePool = IPool(_aavePool);
        aToken = IAToken(_aToken);
        debtToken = IVariableDebtToken(_debtToken);
        priceOracle = IPriceOracle(_priceOracle);

        // Setup roles
    _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MANAGER_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
    adminAddress = _admin;

        // Initialize configuration with conservative defaults
        config = AaveConfig({
            targetLTV: 6000,        // 60% target LTV
            maxLTV: 7500,           // 75% max LTV
            rebalanceThreshold: 500, // 5% health factor change triggers rebalance
            leverageEnabled: false,  // Start with leverage disabled
            performanceFee: PERFORMANCE_FEE_BPS,
            maxSlippage: 100        // 1% max slippage
        });

        lastHarvest = block.timestamp;
    }

    /**
     * @notice Deposit USDC to earn yield through Aave V3
     * @param assets Amount of USDC to deposit
     * @param receiver Address to receive shares
     * @return shares Amount of shares minted
     */
    function deposit(uint256 assets, address receiver) 
        external 
        override 
        nonReentrant 
        whenNotPaused 
        notInEmergency 
        returns (uint256 shares) 
    {
        require(assets > 0, "Zero assets");
        require(receiver != address(0), "Invalid receiver");

        // Calculate shares (1:1 ratio for simplicity in Phase 6)
        shares = assets;

        // Transfer assets from caller
        asset.safeTransferFrom(msg.sender, address(this), assets);

        // Supply to Aave
        asset.forceApprove(address(aavePool), assets);
        aavePool.supply(address(asset), assets, address(this), 0);

        // Update state
        totalDeposits += assets;
        totalPrincipal += assets;

        // Apply leverage if enabled and safe
        if (config.leverageEnabled) {
            _adjustLeverage();
        }

        emit Deposit(msg.sender, receiver, assets, shares);
        return shares;
    }

    /**
     * @notice Withdraw USDC from strategy
     * @param assets Amount of USDC to withdraw
     * @param receiver Address to receive assets
     * @param owner Address that owns the shares
     * @return shares Amount of shares burned
     */
    function withdraw(uint256 assets, address receiver, address owner) 
        external 
        override 
        nonReentrant 
        returns (uint256 shares) 
    {
        require(assets > 0, "Zero assets");
        require(receiver != address(0), "Invalid receiver");

        // Calculate shares (1:1 ratio)
        shares = assets;

        // Check if we need to deleverage first
        uint256 availableLiquidity = _getAvailableLiquidity();
        if (assets > availableLiquidity && totalBorrows > 0) {
            _reduceLeverage(assets - availableLiquidity);
        }

        // Withdraw from Aave
        uint256 withdrawn = aavePool.withdraw(address(asset), assets, address(this));
        require(withdrawn >= assets, "Insufficient withdrawal");

        // Transfer to receiver
        asset.safeTransfer(receiver, withdrawn);

        // Update state
        totalDeposits = totalDeposits > assets ? totalDeposits - assets : 0;

        // Maintain health factor after withdrawal
        _ensureHealthFactor();

        emit Withdraw(msg.sender, receiver, owner, withdrawn, shares);
        return shares;
    }

    /**
     * @notice Get total assets managed by strategy
     * @return Total USDC value including borrowed and supplied amounts
     */
    function totalAssets() external view override returns (uint256) {
        uint256 supplied = aToken.balanceOf(address(this));
        uint256 borrowed = debtToken.balanceOf(address(this));
        uint256 idle = asset.balanceOf(address(this));
        
        // Net position = supplied - borrowed + idle cash
        return supplied + idle - borrowed;
    }

    /**
     * @notice Get balance of shares for a user (simplified for Phase 6)
     * @param account User address
     * @return User's share balance
     */
    function balanceOf(address account) external view override returns (uint256) {
        // Simplified implementation - in production would track actual shares
        return account == address(this) ? totalPrincipal : 0;
    }

    /**
     * @notice Preview deposit calculation
     * @param assets Amount to deposit
     * @return shares Amount of shares that would be minted
     */
    // Preview helpers (not part of interface)
    function previewDeposit(uint256 assets) external pure returns (uint256 shares) {
        return assets;
    }
    function previewWithdraw(uint256 assets) external pure returns (uint256 shares) {
        return assets;
    }

    /**
     * @notice Get current APY from Aave lending
     * @return APY in basis points
     */
    function getAPY() external view override returns (uint256) {
        (, uint128 liquidityRate, , , , , , , , , , , , , ) = aavePool.getReserveData(address(asset));
        
        // Convert ray (27 decimals) to BPS
        return (uint256(liquidityRate) * MAX_BPS) / 1e27;
    }

    /**
     * @notice Get current health factor
     * @return Health factor with 18 decimals
     */
    function getHealthFactor() public view returns (uint256) {
        (, , , , , uint256 healthFactor) = aavePool.getUserAccountData(address(this));
        return healthFactor;
    }

    /**
     * @notice Harvest yield and compound
     */
    function harvest() external override onlyManager nonReentrant returns (uint256 yield) {
        uint256 currentBalance = aToken.balanceOf(address(this));
        yield = currentBalance > totalDeposits ? currentBalance - totalDeposits : 0;

        if (yield > 0) {
            // Calculate performance fee
            uint256 feeAmount = (yield * config.performanceFee) / MAX_BPS;
            performanceFeeAccrued += feeAmount;
            totalYieldGenerated += yield;

            // Compound remaining yield back into Aave
            uint256 compoundAmount = yield - feeAmount;
            if (compoundAmount > 0) {
                totalDeposits += compoundAmount;
                
                // Apply leverage if enabled
                if (config.leverageEnabled) {
                    _adjustLeverage();
                }
            }

            lastHarvest = block.timestamp;
            emit PerformanceFeeCollected(feeAmount, block.timestamp);
        }
        return yield;
    }

    /**
     * @notice Adjust leverage to maintain target LTV
     */
    function rebalance() external onlyManager nonReentrant notInEmergency {
        if (config.leverageEnabled) {
            _adjustLeverage();
        }
        _ensureHealthFactor();
    }

    /**
     * @notice Update strategy configuration
     */
    function updateConfig(
        uint256 _targetLTV,
        uint256 _maxLTV,
        bool _leverageEnabled,
        uint256 _maxSlippage
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_targetLTV <= _maxLTV, "Target LTV too high");
        require(_maxLTV <= 8000, "Max LTV too high"); // 80% maximum
        require(_maxSlippage <= 500, "Slippage too high"); // 5% maximum

        config.targetLTV = _targetLTV;
        config.maxLTV = _maxLTV;
        config.leverageEnabled = _leverageEnabled;
        config.maxSlippage = _maxSlippage;

        emit ConfigUpdated(_targetLTV, _maxLTV, _leverageEnabled);
    }

    /**
     * @notice Emergency functions
     */
    function activateEmergencyMode() external onlyEmergency {
        emergencyMode = true;
        emergencyExitTimestamp = block.timestamp;
        _pause();
        
        // Reduce leverage immediately in emergency
        if (totalBorrows > 0) {
            _emergencyDeleverage();
        }

        emit EmergencyActivated(msg.sender, block.timestamp);
    }

    function emergencyWithdraw() external onlyRole(EMERGENCY_ROLE) {
        require(emergencyMode, "Not in emergency mode");
        
        // Repay all debt first
        uint256 debt = debtToken.balanceOf(address(this));
        if (debt > 0) {
            uint256 availableBalance = asset.balanceOf(address(this));
            if (availableBalance < debt) {
                // Withdraw what we need from Aave
                uint256 toWithdraw = debt - availableBalance;
                aavePool.withdraw(address(asset), toWithdraw, address(this));
            }
            
            asset.forceApprove(address(aavePool), debt);
            aavePool.repay(address(asset), debt, 2, address(this)); // 2 = variable rate
        }

        // Withdraw all collateral
        uint256 aTokenBalance = aToken.balanceOf(address(this));
        if (aTokenBalance > 0) {
            aavePool.withdraw(address(asset), type(uint256).max, address(this));
        }

        // Transfer all USDC to admin
        uint256 balance = asset.balanceOf(address(this));
        if (balance > 0) {
            asset.safeTransfer(adminAddress, balance);
        }
    }

    /**
     * @notice Internal functions
     */
    function _adjustLeverage() internal {
        uint256 currentHealthFactor = getHealthFactor();
        
        if (currentHealthFactor > TARGET_HEALTH_FACTOR + LIQUIDATION_BUFFER) {
            // Can increase leverage
            uint256 maxBorrow = _calculateMaxBorrow();
            if (maxBorrow > 0) {
                _increaseLeverage(maxBorrow);
            }
        } else if (currentHealthFactor < TARGET_HEALTH_FACTOR - LIQUIDATION_BUFFER) {
            // Need to reduce leverage
            uint256 repayAmount = _calculateRepayAmount();
            if (repayAmount > 0) {
                _reduceLeverage(repayAmount);
            }
        }
    }

    function _calculateMaxBorrow() internal view returns (uint256) {
        (, , uint256 availableBorrows, , , ) = aavePool.getUserAccountData(address(this));
        uint256 currentLTV = _getCurrentLTV();
        
        if (currentLTV < config.targetLTV) {
            uint256 maxAdditionalBorrow = (totalDeposits * (config.targetLTV - currentLTV)) / MAX_BPS;
            return Math.min(availableBorrows, maxAdditionalBorrow);
        }
        
        return 0;
    }

    function _calculateRepayAmount() internal view returns (uint256) {
        uint256 currentLTV = _getCurrentLTV();
        if (currentLTV > config.targetLTV) {
            uint256 excessLTV = currentLTV - config.targetLTV;
            return (totalBorrows * excessLTV) / currentLTV;
        }
        return 0;
    }

    function _increaseLeverage(uint256 borrowAmount) internal {
        // Borrow USDC
        aavePool.borrow(address(asset), borrowAmount, 2, 0, address(this)); // 2 = variable rate
        totalBorrows += borrowAmount;
        
        // Supply borrowed USDC back to Aave
        asset.forceApprove(address(aavePool), borrowAmount);
        aavePool.supply(address(asset), borrowAmount, address(this), 0);
        totalDeposits += borrowAmount;

        uint256 newHealthFactor = getHealthFactor();
        emit LeverageAdjusted(borrowAmount, newHealthFactor);
    }

    function _reduceLeverage(uint256 repayAmount) internal {
        uint256 currentDebt = debtToken.balanceOf(address(this));
        repayAmount = Math.min(repayAmount, currentDebt);
        
        if (repayAmount == 0) return;

        // Withdraw from Aave to repay debt
        uint256 availableBalance = asset.balanceOf(address(this));
        if (availableBalance < repayAmount) {
            uint256 toWithdraw = repayAmount - availableBalance;
            aavePool.withdraw(address(asset), toWithdraw, address(this));
            totalDeposits = totalDeposits > toWithdraw ? totalDeposits - toWithdraw : 0;
        }

        // Repay debt
        asset.forceApprove(address(aavePool), repayAmount);
        uint256 actualRepay = aavePool.repay(address(asset), repayAmount, 2, address(this));
        totalBorrows = totalBorrows > actualRepay ? totalBorrows - actualRepay : 0;

        uint256 newHealthFactor = getHealthFactor();
        emit LeverageAdjusted(0, newHealthFactor);
    }

    function _emergencyDeleverage() internal {
        uint256 currentDebt = debtToken.balanceOf(address(this));
        if (currentDebt > 0) {
            _reduceLeverage(currentDebt);
        }
    }

    function _ensureHealthFactor() internal {
        uint256 healthFactor = getHealthFactor();
        if (healthFactor < MIN_HEALTH_FACTOR && totalBorrows > 0) {
            uint256 repayAmount = _calculateRepayAmount();
            if (repayAmount > 0) {
                _reduceLeverage(repayAmount);
            }
        }
    }

    function _getCurrentLTV() internal view returns (uint256) {
        if (totalDeposits == 0) return 0;
        return (totalBorrows * MAX_BPS) / totalDeposits;
    }

    function _getAvailableLiquidity() internal view returns (uint256) {
        return aToken.balanceOf(address(this)) + asset.balanceOf(address(this));
    }

    /**
     * @notice Get strategy performance metrics
     */
    function getPerformanceMetrics() external view returns (
        uint256 totalAssetsManaged,
        uint256 currentAPY,
        uint256 healthFactorCurrent,
        uint256 leverageRatio,
        uint256 yieldGenerated
    ) {
        totalAssetsManaged = this.totalAssets();
        currentAPY = this.getAPY();
        healthFactorCurrent = getHealthFactor();
        leverageRatio = totalDeposits > 0 ? (totalBorrows * MAX_BPS) / totalDeposits : 0;
        yieldGenerated = totalYieldGenerated;
    }
    function getStrategyInfo() external view override returns (string memory strategyName, string memory version, string memory description) {
        return ("AaveV3 Strategy", "1.0.0", "Aave V3 lending with optional leverage and risk management");
    }
}
