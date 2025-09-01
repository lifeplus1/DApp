import { Contract, BrowserProvider } from 'ethers';

// Global declarations
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

export interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
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

export {}; // Make this file a module
