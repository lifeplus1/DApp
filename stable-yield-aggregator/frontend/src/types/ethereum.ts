import { BrowserProvider, Contract, JsonRpcSigner } from 'ethers';

// Global declarations
declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

export interface WalletSwitchError {
  code: number;
  message: string;
}

export interface ContractInstances {
  vault: Contract;
  mockUSDC: Contract;
  strategyManager: Contract;
  dummyStrategy: Contract;
  provider: BrowserProvider;
}

export interface NetworkInfo {
  chainId: string;
  chainName: string;
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export interface StrategyData {
  name: string;
  address: string;
  totalDeposits: string;
  currentAPY: string;
  risk: 'Low' | 'Medium' | 'High';
}

export interface ProviderSigner {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
}

export { }; // Make this file a module

