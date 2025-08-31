// Advanced contract addresses (Sepolia testnet)
export const CONTRACTS = {
  // Core infrastructure
  vault: "0xc40Ddb079330D8E53245DF51A245BC42BA5cd74c",
  mockUSDC: "0x3F2178618013EeFE109857aB3eC83049C90968bA",
  strategyManager: "0x9C2e9Ffc91065f3f780387c38DAd7FCBD884e25a",
  
  // Advanced architecture
  enhancedUniswapStrategy: "0x0CBaFD25deB2c0103696f9eC845E932bA2Db2790",
  advancedYieldOptimizer: "0xa2dBAFB32bfc2c24093C515008010E20021Aee54",
} as const;

// Network configuration
export const NETWORK_CONFIG = {
  chainId: 11155111, // Sepolia
  name: "Sepolia",
  rpcUrl: "https://sepolia.infura.io/v3/YOUR_PROJECT_ID",
  blockExplorer: "https://sepolia.etherscan.io",
} as const;

// Contract ABIs (simplified for key functions)
export const YIELD_OPTIMIZER_ABI = [
  "function getOptimalAllocation(uint256 totalAmount) external view returns (address[] memory, uint256[] memory)",
  "function shouldRebalance(address[] calldata, uint256[] calldata) external view returns (bool, uint256[] memory)",
  "function getBestStrategy() external view returns (address, uint256)",
  "function strategies(address) external view returns (uint256, uint256, bool, string memory)",
  "function addStrategy(address strategy) external",
  "function updateStrategyMetrics(address strategy) external",
] as const;

export const ENHANCED_STRATEGY_ABI = [
  "function getAPY() external view returns (uint256)",
  "function getTVL() external view returns (uint256)",
  "function totalAssets() external view returns (uint256)",
  "function isActive() external view returns (bool)",
  "function name() external view returns (string memory)",
  "function deposit(uint256 amount) external returns (uint256)",
  "function withdraw(uint256 amount) external returns (uint256)",
  "function harvest() external returns (uint256)",
] as const;
