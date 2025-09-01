const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * @title Test Setup Standards
 * @dev Standardized test setup utilities and fixtures for consistent testing
 * This module provides reusable fixtures and utilities for all tests
 */

// Standard test constants
const TEST_CONSTANTS = {
  // Token amounts (with proper decimals)
  USDC: {
    SMALL: ethers.parseUnits("100", 6),    // 100 USDC (6 decimals)
    MEDIUM: ethers.parseUnits("1000", 6),  // 1,000 USDC
    LARGE: ethers.parseUnits("10000", 6),  // 10,000 USDC
  },
  STANDARD: {
    SMALL: ethers.parseEther("100"),       // 100 tokens (18 decimals)
    MEDIUM: ethers.parseEther("1000"),     // 1,000 tokens
    LARGE: ethers.parseEther("10000"),     // 10,000 tokens
  },
  // Performance metrics
  PERFORMANCE: {
    MAX_GAS_DEPOSIT: 300000,
    MAX_GAS_WITHDRAW: 200000,
    MAX_GAS_HARVEST: 500000,
    MIN_APY_BASIS_POINTS: 100,    // 1%
    MAX_APY_BASIS_POINTS: 5000,   // 50%
  },
  // Fee configuration
  FEES: {
    PERFORMANCE_FEE: 1000,        // 10% in basis points
    MAX_PERFORMANCE_FEE: 2000,    // 20% max
  }
};

/**
 * @dev Standard token deployment fixture
 * Deploys all commonly used mock tokens with proper configurations
 */
async function deployStandardTokens() {
  const [owner, user1, user2, treasury, vault] = await ethers.getSigners();
  
  // Deploy standard tokens
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
  const dai = await MockERC20.deploy("Dai Stablecoin", "DAI", 18);
  const usdt = await MockERC20.deploy("Tether USD", "USDT", 6);
  
  // Deploy reward tokens
  const MockToken = await ethers.getContractFactory("MockToken");
  const aave = await MockToken.deploy("Aave Token", "AAVE", 18);
  const comp = await MockToken.deploy("Compound Token", "COMP", 18);
  
  // Deploy ERC20Mock for backward compatibility
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const standardToken = await ERC20Mock.deploy("Standard Token", "STD");
  
  // Mint initial balances
  await Promise.all([
    // USDC balances
    usdc.mint(user1.address, TEST_CONSTANTS.USDC.LARGE),
    usdc.mint(user2.address, TEST_CONSTANTS.USDC.MEDIUM),
    usdc.mint(vault.address, TEST_CONSTANTS.USDC.LARGE * 10n),
    usdc.mint(owner.address, TEST_CONSTANTS.USDC.LARGE * 5n),
    
    // DAI balances
    dai.mint(user1.address, TEST_CONSTANTS.STANDARD.LARGE),
    dai.mint(user2.address, TEST_CONSTANTS.STANDARD.MEDIUM),
    
    // Reward token balances
    aave.mint(owner.address, TEST_CONSTANTS.STANDARD.LARGE),
    comp.mint(owner.address, TEST_CONSTANTS.STANDARD.LARGE),
    
    // Standard token balances
    standardToken.mint(user1.address, TEST_CONSTANTS.STANDARD.LARGE),
    standardToken.mint(user2.address, TEST_CONSTANTS.STANDARD.MEDIUM),
  ]);
  
  return {
    tokens: { usdc, dai, usdt, aave, comp, standardToken },
    signers: { owner, user1, user2, treasury, vault }
  };
}

/**
 * @dev Aave strategy test fixture
 * Deploys complete Aave testing environment
 */
async function deployAaveFixture() {
  const { tokens, signers } = await deployStandardTokens();
  
  // Deploy Aave mocks
  const MockAToken = await ethers.getContractFactory("MockAToken");
  const aUsdc = await MockAToken.deploy("Aave USDC", "aUSDC", await tokens.usdc.getAddress());
  
  const MockAavePool = await ethers.getContractFactory("MockAavePool");
  const aavePool = await MockAavePool.deploy(
    await tokens.usdc.getAddress(),
    await aUsdc.getAddress()
  );
  
  const MockAaveRewards = await ethers.getContractFactory("MockAaveRewards");
  const aaveRewards = await MockAaveRewards.deploy(await tokens.aave.getAddress());
  
  // Setup permissions and funding
  await aUsdc.setPool(await aavePool.getAddress());
  await aUsdc.transferOwnership(await aavePool.getAddress());
  
  // Fund rewards contract
  await tokens.aave.mint(await aaveRewards.getAddress(), TEST_CONSTANTS.STANDARD.LARGE);
  
  return {
    ...tokens,
    ...signers,
    aave: {
      aUsdc,
      aavePool,
      aaveRewards
    }
  };
}

/**
 * @dev Compound strategy test fixture
 */
async function deployCompoundFixture() {
  const { tokens, signers } = await deployStandardTokens();
  
  // Deploy Compound mocks
  const MockCToken = await ethers.getContractFactory("MockCToken");
  const cUsdc = await MockCToken.deploy(await tokens.usdc.getAddress());
  
  const MockComptroller = await ethers.getContractFactory("MockComptroller");
  const comptroller = await MockComptroller.deploy(await tokens.comp.getAddress());
  
  // Fund cToken for liquidity
  await tokens.usdc.mint(await cUsdc.getAddress(), TEST_CONSTANTS.USDC.LARGE * 100n);
  
  return {
    ...tokens,
    ...signers,
    compound: {
      cUsdc,
      comptroller
    }
  };
}

/**
 * @dev Curve strategy test fixture
 */
async function deployCurveFixture() {
  const { tokens, signers } = await deployStandardTokens();
  
  // Deploy Curve mocks
  const MockLPToken = await ethers.getContractFactory("MockLPToken");
  const curve3LP = await MockLPToken.deploy();
  
  const MockCRV = await ethers.getContractFactory("MockCRV");
  const crv = await MockCRV.deploy();
  
  const MockCurvePool = await ethers.getContractFactory("MockCurvePool");
  const curvePool = await MockCurvePool.deploy(
    await tokens.dai.getAddress(),
    await tokens.usdc.getAddress(),
    await tokens.usdt.getAddress(),
    await curve3LP.getAddress()
  );
  
  const MockCurveGauge = await ethers.getContractFactory("MockCurveGauge");
  const curveGauge = await MockCurveGauge.deploy(
    await curve3LP.getAddress(),
    await crv.getAddress()
  );
  
  // Setup permissions
  await curve3LP.setMinter(await curvePool.getAddress(), true);
  await curve3LP.setMinter(await curveGauge.getAddress(), true);
  await crv.setMinter(await curveGauge.getAddress(), true);
  
  // Fund gauge with rewards
  await crv.mint(await curveGauge.getAddress(), TEST_CONSTANTS.STANDARD.LARGE);
  
  return {
    ...tokens,
    ...signers,
    curve: {
      curve3LP,
      crv,
      curvePool,
      curveGauge
    }
  };
}

/**
 * @dev Fee controller test fixture
 */
async function deployFeeControllerFixture() {
  const { tokens, signers } = await deployStandardTokens();
  
  // Deploy fee infrastructure
  const FeeController = await ethers.getContractFactory("FeeController");
  const feeController = await FeeController.deploy(signers.owner.address, signers.treasury.address);
  
  const DistributionSplitter = await ethers.getContractFactory("DistributionSplitter");
  const splitter = await DistributionSplitter.deploy(signers.owner.address);
  
  // Configure distribution
  await feeController.setFeeRecipient(await splitter.getAddress());
  await splitter.updateRecipients(
    [signers.treasury.address, signers.user1.address, signers.user2.address],
    [4000, 4000, 2000] // 40%, 40%, 20%
  );
  
  return {
    ...tokens,
    ...signers,
    fees: {
      feeController,
      splitter
    }
  };
}

/**
 * @dev Complete platform integration fixture
 * Deploys all contracts for full integration testing
 */
async function deployPlatformFixture() {
  const aaveFixture = await deployAaveFixture();
  const compoundFixture = await deployCompoundFixture();
  const curveFixture = await deployCurveFixture();
  const feeFixture = await deployFeeControllerFixture();
  
  // Deploy platform contracts
  const StableVault = await ethers.getContractFactory("StableVault");
  const vault = await StableVault.deploy(
    await aaveFixture.usdc.getAddress(),
    ethers.ZeroAddress
  );
  
  const StrategyManager = await ethers.getContractFactory("StrategyManager");
  const strategyManager = await StrategyManager.deploy();
  
  return {
    // Merge all fixtures
    ...aaveFixture,
    compound: compoundFixture.compound,
    curve: curveFixture.curve,
    fees: feeFixture.fees,
    platform: {
      vault,
      strategyManager
    }
  };
}

/**
 * @dev Test utility functions
 */
const TestUtils = {
  /**
   * @dev Assert that a value is within expected range
   */
  assertInRange: (actual, expected, toleranceBps = 100) => {
    const tolerance = expected * BigInt(toleranceBps) / 10000n;
    const lower = expected - tolerance;
    const upper = expected + tolerance;
    expect(actual).to.be.gte(lower);
    expect(actual).to.be.lte(upper);
  },
  
  /**
   * @dev Assert gas usage is below threshold
   */
  assertGasUsage: async (txPromise, maxGas) => {
    const tx = await txPromise;
    const receipt = await tx.wait();
    expect(receipt.gasUsed).to.be.lte(maxGas);
    return receipt;
  },
  
  /**
   * @dev Assert APY is within reasonable bounds
   */
  assertReasonableAPY: (apy) => {
    expect(apy).to.be.gte(TEST_CONSTANTS.PERFORMANCE.MIN_APY_BASIS_POINTS);
    expect(apy).to.be.lte(TEST_CONSTANTS.PERFORMANCE.MAX_APY_BASIS_POINTS);
  },
  
  /**
   * @dev Setup standard approvals for testing
   */
  setupApprovals: async (token, owner, spenders, amount = ethers.MaxUint256) => {
    for (const spender of spenders) {
      await token.connect(owner).approve(spender, amount);
    }
  }
};

module.exports = {
  TEST_CONSTANTS,
  deployStandardTokens,
  deployAaveFixture,
  deployCompoundFixture,
  deployCurveFixture,
  deployFeeControllerFixture,
  deployPlatformFixture,
  TestUtils
};
