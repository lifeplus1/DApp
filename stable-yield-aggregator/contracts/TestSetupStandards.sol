// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/**
 * @title TestSetupStandards
 * @dev Comprehensive test setup utilities and standards for the DApp project
 * This file defines best practices for test setup and mock contract patterns
 */

// Import all mock contracts for standardized testing
import "./mocks/MockERC20.sol";
import "./mocks/MockToken.sol";
import "./mocks/MockCToken.sol";
import "./mocks/MockComptroller.sol";
import "./test/MockAave.sol";
import "./test/MockCurve.sol";
import "./ERC20Mock.sol";

/**
 * @title TestStandardsLibrary
 * @dev Library containing standardized test setup functions and constants
 */
library TestStandards {
    // Standard decimal configurations
    uint8 public constant USDC_DECIMALS = 6;
    uint8 public constant STANDARD_DECIMALS = 18;

    // Standard test amounts
    uint256 public constant TEST_AMOUNT_SMALL = 100e18; // 100 tokens
    uint256 public constant TEST_AMOUNT_MEDIUM = 1000e18; // 1,000 tokens
    uint256 public constant TEST_AMOUNT_LARGE = 10000e18; // 10,000 tokens

    // USDC specific amounts (6 decimals)
    uint256 public constant TEST_USDC_SMALL = 100e6; // 100 USDC
    uint256 public constant TEST_USDC_MEDIUM = 1000e6; // 1,000 USDC
    uint256 public constant TEST_USDC_LARGE = 10000e6; // 10,000 USDC

    // Standard test addresses (deterministic for consistency)
    address public constant TEST_USER_1 =
        0x1234567890123456789012345678901234567890;
    address public constant TEST_USER_2 =
        0x2345678901234567890123456789012345678901;
    address public constant TEST_TREASURY =
        0x3456789012345678901234567890123456789012;
    address public constant TEST_VAULT =
        0x4567890123456789012345678901234567890123;
}

/**
 * @title StandardTokenSetup
 * @dev Contract that provides standardized token setup for tests
 */
contract StandardTokenSetup {
    MockERC20 public usdc;
    MockERC20 public dai;
    MockERC20 public usdt;
    MockToken public aave;
    MockToken public comp;
    ERC20Mock public standardToken;

    /**
     * @dev Initialize standard tokens for testing
     */
    function setupStandardTokens() internal {
        // Deploy standard tokens with proper decimals
        usdc = new MockERC20("USD Coin", "USDC", TestStandards.USDC_DECIMALS);
        dai = new MockERC20(
            "Dai Stablecoin",
            "DAI",
            TestStandards.STANDARD_DECIMALS
        );
        usdt = new MockERC20("Tether USD", "USDT", TestStandards.USDC_DECIMALS);

        // Deploy reward tokens
        aave = new MockToken(
            "Aave Token",
            "AAVE",
            TestStandards.STANDARD_DECIMALS
        );
        comp = new MockToken(
            "Compound Token",
            "COMP",
            TestStandards.STANDARD_DECIMALS
        );

        // Deploy standard ERC20Mock for backward compatibility
        standardToken = new ERC20Mock("Standard Token", "STD");
    }

    /**
     * @dev Mint standard amounts to test users
     */
    function mintTestAmounts() internal {
        // Mint USDC
        usdc.mint(TestStandards.TEST_USER_1, TestStandards.TEST_USDC_LARGE);
        usdc.mint(TestStandards.TEST_USER_2, TestStandards.TEST_USDC_MEDIUM);
        usdc.mint(TestStandards.TEST_VAULT, TestStandards.TEST_USDC_LARGE * 10);

        // Mint DAI
        dai.mint(TestStandards.TEST_USER_1, TestStandards.TEST_AMOUNT_LARGE);
        dai.mint(TestStandards.TEST_USER_2, TestStandards.TEST_AMOUNT_MEDIUM);

        // Mint reward tokens
        aave.mint(TestStandards.TEST_USER_1, TestStandards.TEST_AMOUNT_LARGE);
        comp.mint(TestStandards.TEST_USER_1, TestStandards.TEST_AMOUNT_LARGE);

        // Mint standard tokens
        standardToken.mint(
            TestStandards.TEST_USER_1,
            TestStandards.TEST_AMOUNT_LARGE
        );
        standardToken.mint(
            TestStandards.TEST_USER_2,
            TestStandards.TEST_AMOUNT_MEDIUM
        );
    }
}

/**
 * @title AaveTestSetup
 * @dev Standardized setup for Aave strategy tests
 */
contract AaveTestSetup is StandardTokenSetup {
    MockAToken public aUsdc;
    MockAavePool public aavePool;
    MockAaveRewards public aaveRewards;

    function setupAave() internal {
        setupStandardTokens();

        // Deploy Aave mocks
        aUsdc = new MockAToken("Aave USDC", "aUSDC", address(usdc));
        aavePool = new MockAavePool(address(usdc), address(aUsdc));
        aaveRewards = new MockAaveRewards(address(aave));

        // Setup permissions
        aUsdc.setPool(address(aavePool));
        aUsdc.transferOwnership(address(aavePool));

        // Fund rewards contract
        aave.mint(address(aaveRewards), TestStandards.TEST_AMOUNT_LARGE);
    }
}

/**
 * @title CompoundTestSetup
 * @dev Standardized setup for Compound strategy tests
 */
contract CompoundTestSetup is StandardTokenSetup {
    MockCToken public cUsdc;
    MockComptroller public comptroller;

    function setupCompound() internal {
        setupStandardTokens();

        // Deploy Compound mocks
        cUsdc = new MockCToken(address(usdc));
        comptroller = new MockComptroller(address(comp));

        // Fund cToken with underlying for liquidity
        usdc.mint(address(cUsdc), TestStandards.TEST_USDC_LARGE * 100);
    }
}

/**
 * @title CurveTestSetup
 * @dev Standardized setup for Curve strategy tests
 */
contract CurveTestSetup is StandardTokenSetup {
    MockLPToken public curve3LP;
    MockCRV public crv;
    MockCurvePool public curvePool;
    MockCurveGauge public curveGauge;

    function setupCurve() internal {
        setupStandardTokens();

        // Deploy Curve mocks
        curve3LP = new MockLPToken();
        crv = new MockCRV();
        curvePool = new MockCurvePool(
            address(dai),
            address(usdc),
            address(usdt),
            address(curve3LP)
        );
        curveGauge = new MockCurveGauge(address(curve3LP), address(crv));

        // Setup permissions
        curve3LP.setMinter(address(curvePool), true);
        curve3LP.setMinter(address(curveGauge), true);
        crv.setMinter(address(curveGauge), true);

        // Fund gauge with rewards
        crv.mint(address(curveGauge), TestStandards.TEST_AMOUNT_LARGE);
    }
}
