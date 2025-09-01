// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockAToken
 * @dev Mock implementation of Aave aToken for testing
 */
contract MockAToken is ERC20, Ownable {
    IERC20 public immutable underlyingAsset;
    uint128 public liquidityIndex = 1e27; // Starting at 1 RAY
    uint256 public lastUpdateTimestamp;
    address public pool; // Add pool reference

    // Simulate 5% APY growth in liquidity index
    uint256 private constant GROWTH_RATE = 158548959919; // Per second growth rate for ~5% APY

    constructor(
        string memory name,
        string memory symbol,
        address _underlyingAsset
    ) ERC20(name, symbol) Ownable(msg.sender) {
        underlyingAsset = IERC20(_underlyingAsset);
        lastUpdateTimestamp = block.timestamp;
    }

    /**
     * @dev Set the pool address (for testing setup)
     */
    function setPool(address _pool) external onlyOwner {
        pool = _pool;
    }

    /**
     * @dev Mint aTokens when underlying is deposited
     */
    function mint(address to, uint256 amount) external {
        require(
            msg.sender == owner() || msg.sender == pool,
            "Only owner or pool can mint"
        );
        updateLiquidityIndex();
        _mint(to, amount);
    }

    /**
     * @dev Burn aTokens when underlying is withdrawn
     */
    function burn(address from, uint256 amount) external {
        require(
            msg.sender == owner() || msg.sender == pool,
            "Only owner or pool can burn"
        );
        updateLiquidityIndex();
        _burn(from, amount);
    }

    /**
     * @dev Update liquidity index to simulate yield accrual
     */
    function updateLiquidityIndex() public {
        uint256 timeDelta = block.timestamp - lastUpdateTimestamp;
        if (timeDelta > 0) {
            liquidityIndex += uint128(
                (liquidityIndex * GROWTH_RATE * timeDelta) / 1e27
            );
            lastUpdateTimestamp = block.timestamp;
        }
    }

    /**
     * @dev Override balanceOf to include accrued interest
     */
    function balanceOf(address account) public view override returns (uint256) {
        uint256 scaledBalance = super.balanceOf(account);
        if (scaledBalance == 0) return 0;

        // Calculate current index with time-based growth
        uint256 timeDelta = block.timestamp - lastUpdateTimestamp;
        uint256 currentIndex = liquidityIndex +
            ((liquidityIndex * GROWTH_RATE * timeDelta) / 1e27);

        // Return balance with accrued interest
        return (scaledBalance * currentIndex) / 1e27;
    }

    /**
     * @dev Get scaled balance (without interest)
     */
    function scaledBalanceOf(address user) external view returns (uint256) {
        return super.balanceOf(user);
    }
}

/**
 * @title MockAavePool
 * @dev Mock implementation of Aave V3 Pool for testing
 */
contract MockAavePool is Ownable {
    MockAToken public aToken;
    IERC20 public underlyingAsset;

    // Mock reserve data
    uint128 public currentLiquidityRate = 1585489599; // ~5% APY in ray per second

    constructor(address _underlyingAsset, address _aToken) Ownable(msg.sender) {
        underlyingAsset = IERC20(_underlyingAsset);
        aToken = MockAToken(_aToken);
    }

    /**
     * @dev Mock supply function
     */
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 /* referralCode */
    ) external {
        require(asset == address(underlyingAsset), "Invalid asset");

        // Transfer underlying from user
        underlyingAsset.transferFrom(msg.sender, address(this), amount);

        // Mint aTokens
        aToken.mint(onBehalfOf, amount);
    }

    /**
     * @dev Mock withdraw function
     */
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        require(asset == address(underlyingAsset), "Invalid asset");

        uint256 aTokenBalance = aToken.balanceOf(msg.sender);
        uint256 actualAmount = amount;

        // If withdrawing max, calculate actual amount based on aToken balance
        if (amount == type(uint256).max) {
            actualAmount = aTokenBalance;
        }

        require(aTokenBalance >= actualAmount, "Insufficient aToken balance");

        // Burn aTokens
        aToken.burn(msg.sender, actualAmount);

        // Transfer underlying to user
        underlyingAsset.transfer(to, actualAmount);

        return actualAmount;
    }

    /**
     * @dev Mock getReserveData function
     */
    function getReserveData(
        address asset
    )
        external
        view
        returns (
            uint256 configuration,
            uint128 liquidityIndex,
            uint128 currentLiquidityRate_,
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
        )
    {
        require(asset == address(underlyingAsset), "Invalid asset");

        return (
            0, // configuration
            aToken.liquidityIndex(), // liquidityIndex
            currentLiquidityRate, // currentLiquidityRate
            0, // variableBorrowIndex
            0, // currentVariableBorrowRate
            0, // currentStableBorrowRate
            uint40(block.timestamp), // lastUpdateTimestamp
            0, // id
            address(aToken), // aTokenAddress
            address(0), // stableDebtTokenAddress
            address(0), // variableDebtTokenAddress
            address(0), // interestRateStrategyAddress
            0, // accruedToTreasury
            0, // unbacked
            0 // isolationModeTotalDebt
        );
    }

    /**
     * @dev Set liquidity rate for testing
     */
    function setLiquidityRate(uint128 _rate) external onlyOwner {
        currentLiquidityRate = _rate;
    }
}

/**
 * @title MockAaveRewards
 * @dev Mock implementation of Aave rewards for testing
 */
contract MockAaveRewards is Ownable {
    ERC20 public rewardToken; // Mock AAVE token
    mapping(address => uint256) public userRewards;

    constructor(address _rewardToken) Ownable(msg.sender) {
        rewardToken = ERC20(_rewardToken);
    }

    /**
     * @dev Set user rewards for testing
     */
    function setUserRewards(address user, uint256 amount) external onlyOwner {
        userRewards[user] = amount;
    }

    /**
     * @dev Get user rewards
     */
    function getUserRewards(
        address[] calldata /* assets */,
        address user
    ) external view returns (uint256) {
        return userRewards[user];
    }

    /**
     * @dev Claim rewards
     */
    function claimRewards(
        address[] calldata /* assets */,
        uint256 amount,
        address to
    ) external returns (uint256) {
        require(userRewards[msg.sender] >= amount, "Insufficient rewards");

        userRewards[msg.sender] -= amount;
        rewardToken.transfer(to, amount);

        return amount;
    }

    /**
     * @dev Fund rewards contract for testing
     */
    function fundRewards(uint256 amount) external onlyOwner {
        rewardToken.transferFrom(msg.sender, address(this), amount);
    }
}
