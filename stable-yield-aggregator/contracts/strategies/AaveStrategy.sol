// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../../interfaces/IStrategyV2.sol";

/**
 * @title AaveStrategy
 * @author DeFi Portfolio Team
 * @notice Aave V3 USDC lending strategy with automated yield harvesting
 * @dev Implements IStrategyV2 for seamless PortfolioManager integration
 */

interface IPool {
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);

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

interface IAaveRewards {
    function claimRewards(
        address[] calldata assets,
        uint256 amount,
        address to
    ) external returns (uint256);
    
    function getUserRewards(
        address[] calldata assets,
        address user
    ) external view returns (uint256);
}

contract AaveStrategy is IStrategyV2, AccessControlEnumerable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant PORTFOLIO_MANAGER_ROLE = keccak256("PORTFOLIO_MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // Core protocol contracts
    IERC20 public immutable asset; // USDC
    IPool public immutable aavePool;
    IAToken public immutable aToken; // aUSDC
    IAaveRewards public immutable aaveRewards;
    
    // Strategy parameters
    uint256 public performanceFee = 1000; // 10% (basis points)
    uint256 public totalShares;
    bool public active = true;
    bool public emergencyMode = false;
    
    // User shares tracking
    mapping(address => uint256) public shares;
    
    // Performance tracking
    uint256 public lastHarvestTimestamp;
    uint256 public totalFeesCollected;
    uint256 private constant RAY = 1e27; // Aave liquidity index precision
    uint256 private constant HALF_RAY = RAY / 2;
    
    // Events
    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 shares, uint256 amount);
    event RewardsHarvested(uint256 rewardAmount, uint256 feeAmount);
    event EmergencyModeToggled(bool enabled);
    event PerformanceFeeUpdated(uint256 newFee);
    
    /**
     * @dev Initialize the AaveStrategy
     * @param _asset The underlying asset (USDC)
     * @param _aavePool The Aave V3 Pool contract
     * @param _aToken The corresponding aToken (aUSDC)
     * @param _aaveRewards The Aave rewards contract
     * @param _admin Strategy admin address
     * @param _portfolioManager Portfolio manager contract
     */
    constructor(
        address _asset,
        address _aavePool,
        address _aToken,
        address _aaveRewards,
        address _admin,
        address _portfolioManager
    ) {
        require(_asset != address(0), "Invalid asset");
        require(_aavePool != address(0), "Invalid pool");
        require(_aToken != address(0), "Invalid aToken");
        require(_admin != address(0), "Invalid admin");
        require(_portfolioManager != address(0), "Invalid portfolio manager");

        asset = IERC20(_asset);
        aavePool = IPool(_aavePool);
        aToken = IAToken(_aToken);
        aaveRewards = IAaveRewards(_aaveRewards);
        lastHarvestTimestamp = block.timestamp;

        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PORTFOLIO_MANAGER_ROLE, _portfolioManager);
        _grantRole(EMERGENCY_ROLE, _admin);
        
        // Approve Aave pool for maximum efficiency
        IERC20(asset).approve(address(aavePool), type(uint256).max);
    }

    // ============ IStrategyV2 Implementation ============

    /**
     * @dev Deposit USDC into Aave V3 pool
     */
    function deposit(uint256 amount, address user) 
        external 
        override 
        nonReentrant 
        onlyRole(PORTFOLIO_MANAGER_ROLE)
        returns (uint256 sharesIssued) 
    {
        require(active && !emergencyMode, "Strategy not active");
        require(amount > 0, "Amount must be > 0");

        // Transfer USDC from caller
        asset.safeTransferFrom(msg.sender, address(this), amount);
        
        // Supply to Aave pool
        aavePool.supply(address(asset), amount, address(this), 0);
        
        // Calculate shares to issue
        if (totalShares == 0) {
            sharesIssued = amount;
        } else {
            uint256 totalAssetsBefore = totalAssets() - amount;
            sharesIssued = (amount * totalShares) / totalAssetsBefore;
        }
        
        // Update state
        shares[user] += sharesIssued;
        totalShares += sharesIssued;
        
        emit Deposited(user, amount, sharesIssued);
    }

    /**
     * @dev Withdraw USDC from Aave V3 pool
     */
    function withdraw(uint256 sharesToRedeem, address receiver, address owner)
        external
        override
        nonReentrant
        onlyRole(PORTFOLIO_MANAGER_ROLE)
        returns (uint256 amountWithdrawn)
    {
        require(sharesToRedeem > 0, "Shares must be > 0");
        require(shares[owner] >= sharesToRedeem, "Insufficient shares");

        // Calculate withdrawal amount
        uint256 totalAssetsValue = totalAssets();
        amountWithdrawn = (sharesToRedeem * totalAssetsValue) / totalShares;
        
        // Update shares first (prevent reentrancy)
        shares[owner] -= sharesToRedeem;
        totalShares -= sharesToRedeem;
        
        // Withdraw from Aave
        uint256 actualWithdrawn = aavePool.withdraw(
            address(asset), 
            amountWithdrawn, 
            address(this)
        );
        
        // Transfer to receiver
        asset.safeTransfer(receiver, actualWithdrawn);
        
        emit Withdrawn(owner, sharesToRedeem, actualWithdrawn);
        
        return actualWithdrawn;
    }

    /**
     * @dev Get total assets under management (including accrued interest)
     */
    function totalAssets() public view override returns (uint256) {
        return aToken.balanceOf(address(this));
    }

    /**
     * @dev Calculate current APY based on Aave rates
     */
    function getAPY() external view override returns (uint256) {
        (, , uint128 currentLiquidityRate, , , , , , , , , , , , ) = 
            aavePool.getReserveData(address(asset));
        
        // Convert from ray (1e27) to basis points (1e4)
        // Aave rate is per second, convert to annual
        uint256 secondsPerYear = 365 days;
        uint256 rayAPY = currentLiquidityRate * secondsPerYear;
        
        // Convert to basis points (divide by 1e23 = 1e27 / 1e4)
        return rayAPY / 1e23;
    }

    /**
     * @dev Harvest AAVE rewards and collect performance fees
     */
    function harvest() 
        external 
        override 
        nonReentrant
        returns (uint256 rewardAmount) 
    {
        require(active, "Strategy not active");
        
        // Get available rewards
        address[] memory assets = new address[](1);
        assets[0] = address(aToken);
        
        uint256 pendingRewards = aaveRewards.getUserRewards(assets, address(this));
        
        if (pendingRewards > 0) {
            // Claim rewards
            rewardAmount = aaveRewards.claimRewards(
                assets,
                pendingRewards,
                address(this)
            );
            
            // Calculate and collect performance fee
            uint256 feeAmount = (rewardAmount * performanceFee) / 10000;
            totalFeesCollected += feeAmount;
            
            // TODO: Convert AAVE rewards to USDC and reinvest
            // For now, rewards stay as AAVE tokens in strategy
            
            lastHarvestTimestamp = block.timestamp;
            
            emit RewardsHarvested(rewardAmount, feeAmount);
        }
        
        return rewardAmount;
    }

    /**
     * @dev Get strategy information
     */
    function getStrategyInfo() 
        external 
        pure 
        override 
        returns (string memory name, string memory version, string memory description) 
    {
        return (
            "AaveStrategy",
            "1.0.0", 
            "Aave V3 USDC lending strategy with AAVE rewards"
        );
    }

    // ============ Admin Functions ============

    /**
     * @dev Toggle emergency mode (admin only)
     */
    function toggleEmergencyMode() external onlyRole(EMERGENCY_ROLE) {
        emergencyMode = !emergencyMode;
        emit EmergencyModeToggled(emergencyMode);
    }

    /**
     * @dev Emergency withdrawal of all funds (emergency role only)
     */
    function emergencyWithdraw() external onlyRole(EMERGENCY_ROLE) {
        require(emergencyMode, "Not in emergency mode");
        
        uint256 aTokenBalance = aToken.balanceOf(address(this));
        if (aTokenBalance > 0) {
            aavePool.withdraw(address(asset), type(uint256).max, address(this));
        }
        
        // Transfer all USDC to admin
        uint256 usdcBalance = asset.balanceOf(address(this));
        if (usdcBalance > 0) {
            // Get the first admin (there should be at least one)
            address admin = address(0);
            uint256 adminCount = getRoleMemberCount(DEFAULT_ADMIN_ROLE);
            if (adminCount > 0) {
                admin = getRoleMember(DEFAULT_ADMIN_ROLE, 0);
            }
            require(admin != address(0), "No admin found");
            asset.safeTransfer(admin, usdcBalance);
        }
    }

    /**
     * @dev Set performance fee (admin only)
     */
    function setPerformanceFee(uint256 _performanceFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_performanceFee <= 2000, "Fee too high"); // Max 20%
        performanceFee = _performanceFee;
        emit PerformanceFeeUpdated(_performanceFee);
    }

    /**
     * @dev Toggle strategy active status
     */
    function toggleActive() external onlyRole(DEFAULT_ADMIN_ROLE) {
        active = !active;
    }

    // ============ View Functions ============

    /**
     * @dev Get user's underlying asset balance (required by IStrategyV2)
     */
    function balanceOf(address user) external view override returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares[user] * totalAssets()) / totalShares;
    }

    /**
     * @dev Get user's share balance
     */
    function sharesOf(address user) external view returns (uint256) {
        return shares[user];
    }

    /**
     * @dev Get total supply of shares
     */
    function totalSupply() external view returns (uint256) {
        return totalShares;
    }

    /**
     * @dev Check if strategy supports an asset
     */
    function supportsAsset(address _asset) external view returns (bool) {
        return _asset == address(asset);
    }
}
