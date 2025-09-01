export interface Strategy {
  address: string;
  name: string;
  apr: bigint;
  tvl: bigint;
  isActive: boolean;
}

export interface VaultInfo {
  totalAssets: bigint;
  totalSupply: bigint;
  sharePrice: bigint;
  performanceFee: number;
}

export interface UserInfo {
  balance: bigint;
  shares: bigint;
  allowance: bigint;
}

export interface ContractAddresses {
  vault: string;
  mockUSDC: string;
  strategyManager: string;
  dummyStrategy: string;
}

export interface Web3Error {
  code: number;
  message: string;
  data?: any;
}
