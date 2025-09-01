import { Contract, BrowserProvider, Signer as EthersSigner } from 'ethers';

// Re-export ethers types for convenience
export type Provider = BrowserProvider;
export type Signer = EthersSigner;

// Type definitions for Ethereum requests
export interface EthereumRequest {
  method: string;
  params?: unknown[];
}

export interface EthereumEventHandler {
  (event: string, ...args: unknown[]): void;
}

// Specific event handler types for common Ethereum events
export interface AccountsChangedHandler {
  (accounts: string[]): void;
}

export interface ChainChangedHandler {
  (chainId: string): void;
}

export interface ConnectHandler {
  (connectInfo: { chainId: string }): void;
}

export interface DisconnectHandler {
  (error: { code: number; message: string }): void;
}

// Error types for Ethereum operations
export interface EthereumError {
  code: number;
  message: string;
  data?: unknown;
}

export interface WalletSwitchError extends EthereumError {
  code: 4902 | number;
}

export interface WalletOperationError extends EthereumError {
  method?: string;
  cause?: string;
}

// Global declarations
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: EthereumRequest) => Promise<unknown>;
      on: {
        (event: 'accountsChanged', handler: AccountsChangedHandler): void;
        (event: 'chainChanged', handler: ChainChangedHandler): void;
        (event: 'connect', handler: ConnectHandler): void;
        (event: 'disconnect', handler: DisconnectHandler): void;
        (event: string, handler: EthereumEventHandler): void;
      };
      removeListener: {
        (event: 'accountsChanged', handler: AccountsChangedHandler): void;
        (event: 'chainChanged', handler: ChainChangedHandler): void;
        (event: 'connect', handler: ConnectHandler): void;
        (event: 'disconnect', handler: DisconnectHandler): void;
        (event: string, handler: EthereumEventHandler): void;
      };
    };
  }
}

export interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: EthereumRequest) => Promise<unknown>;
  on: (event: string, handler: EthereumEventHandler) => void;
  removeListener: (event: string, handler: EthereumEventHandler) => void;
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
