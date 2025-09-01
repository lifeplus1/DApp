import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import type { Strategy, ContractAddresses } from '../types/web3';

interface ContractInstances {
  vault?: Contract;
  mockUSDC?: Contract;
  strategyManager?: Contract;
  dummyStrategy?: Contract;
  [key: string]: Contract | undefined;
}

// Advanced state management for DeFi operations
interface DeFiState {
  // Connection state
  account: string | null;
  provider: BrowserProvider | null;
  chainId: number | null;
  isConnecting: boolean;
  
  // Contract state
  contracts: ContractInstances;
  balances: {
    usdc: bigint;
    vault: bigint;
    eth: bigint;
  };
  
  // DeFi data
  strategies: Strategy[];
  vaultMetrics: {
    totalAssets: bigint;
    totalSupply: bigint;
    performanceFee: number;
    currentStrategy: string;
  };
  
  // UI state
  loading: boolean;
  error: string | null;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
    timestamp: number;
  }>;
}

type DeFiAction =
  | { type: 'CONNECT_START' }
  | { type: 'CONNECT_SUCCESS'; payload: { account: string; provider: BrowserProvider; chainId: number } }
  | { type: 'CONNECT_ERROR'; payload: string }
  | { type: 'DISCONNECT' }
  | { type: 'UPDATE_BALANCES'; payload: typeof initialState.balances }
  | { type: 'UPDATE_STRATEGIES'; payload: Strategy[] }
  | { type: 'UPDATE_VAULT_METRICS'; payload: typeof initialState.vaultMetrics }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<typeof initialState.notifications[0], 'id' | 'timestamp'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string };

const initialState: DeFiState = {
  account: null,
  provider: null,
  chainId: null,
  isConnecting: false,
  contracts: {},
  balances: {
    usdc: 0n,
    vault: 0n,
    eth: 0n
  },
  strategies: [],
  vaultMetrics: {
    totalAssets: 0n,
    totalSupply: 0n,
    performanceFee: 0,
    currentStrategy: ''
  },
  loading: false,
  error: null,
  notifications: []
};

function defiReducer(state: DeFiState, action: DeFiAction): DeFiState {
  switch (action.type) {
    case 'CONNECT_START':
      return { ...state, isConnecting: true, error: null };
      
    case 'CONNECT_SUCCESS':
      return {
        ...state,
        isConnecting: false,
        account: action.payload.account,
        provider: action.payload.provider,
        chainId: action.payload.chainId,
        error: null
      };
      
    case 'CONNECT_ERROR':
      return {
        ...state,
        isConnecting: false,
        error: action.payload
      };
      
    case 'DISCONNECT':
      return {
        ...initialState
      };
      
    case 'UPDATE_BALANCES':
      return {
        ...state,
        balances: action.payload
      };
      
    case 'UPDATE_STRATEGIES':
      return {
        ...state,
        strategies: action.payload
      };
      
    case 'UPDATE_VAULT_METRICS':
      return {
        ...state,
        vaultMetrics: action.payload
      };
      
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
      
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            ...action.payload,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now()
          }
        ]
      };
      
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
      
    default:
      return state;
  }
}

const DeFiContext = createContext<{
  state: DeFiState;
  actions: {
    connectWallet: () => Promise<void>;
    disconnect: () => void;
    refreshBalances: () => Promise<void>;
    refreshStrategies: () => Promise<void>;
    deposit: (amount: string) => Promise<void>;
    withdraw: (amount: string) => Promise<void>;
    harvest: () => Promise<void>;
    addNotification: (notification: Omit<DeFiState['notifications'][0], 'id' | 'timestamp'>) => void;
    removeNotification: (id: string) => void;
  };
} | null>(null);

export const useDeFi = () => {
  const context = useContext(DeFiContext);
  if (!context) {
    throw new Error('useDeFi must be used within DeFiProvider');
  }
  return context;
};

const CONTRACT_ADDRESSES: ContractAddresses = {
  vault: '0xc40Ddb079330D8E53245DF51A245BC42BA5cd74c',
  mockUSDC: '0x3F2178618013EeFE109857aB3eC83049C90968bA',
  strategyManager: '0x9C2e9Ffc91065f3f780387c38DAd7FCBD884e25a',
  dummyStrategy: '0x21df534BDfdf729a300d99D7B04286385Be8D720'
};

const VAULT_ABI = [
  "function deposit(uint256 assets, address receiver) external returns (uint256)",
  "function withdraw(uint256 assets, address receiver, address owner) external returns (uint256)",
  "function totalAssets() external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function harvest() external",
  "function currentStrategy() external view returns (address)",
  "function owner() external view returns (address)"
] as const;

const ERC20_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
] as const;

const STRATEGY_MANAGER_ABI = [
  "function getBestStrategy() external view returns (address, uint256)",
  "function getAllStrategies() external view returns (address[])",
  "function getStrategyInfo(address) external view returns (tuple(address, uint256, uint256, bool, string))"
] as const;

export const DeFiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(defiReducer, initialState);

  // Memoized contract addresses configuration
  const contractAddresses = useMemo(() => ({
    vault: '0x0AFCE27CA41E84a50144324a2A5762459bF2C487',
    mockUSDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    strategyManager: '0x46375e552F269a90F42CE4746D23FA9d347142CB',
    dummyStrategy: '0xD3e7F770403019aFCAE9A554aB00d062e2688348'
  }), []);

  // Optimized wallet connection with useCallback
  const connectWallet = useCallback(async () => {
    try {
      dispatch({ type: 'CONNECT_START' });

      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (!accounts?.[0]) {
        throw new Error('No accounts found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      // Check if on Sepolia
      if (network.chainId !== 11155111n) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
          });
        } catch (switchError: unknown) {
          if (switchError instanceof Error && 'code' in switchError) {
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0xaa36a7',
                  chainName: 'Sepolia Test Network',
                  rpcUrls: ['https://sepolia.infura.io/v3/'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io/']
                }],
              });
            }
          }
        }
      }

      dispatch({
        type: 'CONNECT_SUCCESS',
        payload: {
          account: accounts[0],
          provider,
          chainId: Number(network.chainId)
        }
      });

      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          message: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`
        }
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      dispatch({
        type: 'CONNECT_ERROR',
        payload: errorMessage
      });
    }
  }, []);

  // Optimized disconnect function with useCallback
  const disconnect = useCallback(() => {
    dispatch({ type: 'DISCONNECT' });
  }, []);

  // Optimized balance refresh with useCallback
  const refreshBalances = useCallback(async () => {
    if (!state.provider || !state.account) return;

    try {
      const signer = await state.provider.getSigner();
      
      const vaultContract = new ethers.Contract(contractAddresses.vault, VAULT_ABI, signer);
      const usdcContract = new ethers.Contract(contractAddresses.mockUSDC, ERC20_ABI, signer);

      const [vaultBalance, usdcBalance, ethBalance] = await Promise.all([
        vaultContract.balanceOf!(state.account) as Promise<bigint>,
        usdcContract.balanceOf!(state.account) as Promise<bigint>,
        state.provider.getBalance(state.account)
      ]);

      dispatch({
        type: 'UPDATE_BALANCES',
        payload: {
          vault: vaultBalance,
          usdc: usdcBalance,
          eth: ethBalance
        }
      });

    } catch (error) {
      console.error('Failed to refresh balances:', error);
    }
  }, [state.provider, state.account, contractAddresses]);

  const refreshStrategies = async () => {
    if (!state.provider) return;

    try {
      const signer = await state.provider.getSigner();
      const strategyManagerContract = new ethers.Contract(
        CONTRACT_ADDRESSES.strategyManager, 
        STRATEGY_MANAGER_ABI, 
        signer
      );

      const strategyAddresses = await strategyManagerContract.getAllStrategies!() as string[];
      
      const strategies = await Promise.all(
        strategyAddresses.map(async (addr) => {
          const info = await strategyManagerContract.getStrategyInfo!(addr) as [string, bigint, bigint, boolean, string];
          return {
            address: info[0],
            apr: info[1],
            tvl: info[2],
            isActive: info[3],
            name: info[4]
          } satisfies Strategy;
        })
      );

      dispatch({ type: 'UPDATE_STRATEGIES', payload: strategies });

    } catch (error) {
      console.error('Failed to refresh strategies:', error);
    }
  };

  const deposit = async (amount: string) => {
    if (!state.provider || !state.account) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const signer = await state.provider.getSigner();
      const vaultContract = new ethers.Contract(CONTRACT_ADDRESSES.vault, VAULT_ABI, signer);
      const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.mockUSDC, ERC20_ABI, signer);

      const parsedAmount = ethers.parseUnits(amount, 6);

      // Check and approve if needed
      const allowance = await usdcContract.allowance!(state.account, CONTRACT_ADDRESSES.vault) as bigint;
      
      if (allowance < parsedAmount) {
        const approveTx = await usdcContract.approve!(CONTRACT_ADDRESSES.vault, parsedAmount);
        await approveTx.wait();
      }

      const depositTx = await vaultContract.deposit!(parsedAmount, state.account);
      await depositTx.wait();

      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          message: `Successfully deposited ${amount} USDC`
        }
      });

      await refreshBalances();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'error',
          message: `Deposit failed: ${errorMessage}`
        }
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const withdraw = async (amount: string) => {
    if (!state.provider || !state.account) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const signer = await state.provider.getSigner();
      const vaultContract = new ethers.Contract(CONTRACT_ADDRESSES.vault, VAULT_ABI, signer);

      const parsedAmount = ethers.parseUnits(amount, 6);
      
      const withdrawTx = await vaultContract.withdraw!(parsedAmount, state.account, state.account);
      await withdrawTx.wait();

      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          message: `Successfully withdrew ${amount} USDC`
        }
      });

      await refreshBalances();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'error',
          message: `Withdrawal failed: ${errorMessage}`
        }
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const harvest = async () => {
    if (!state.provider || !state.account) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const signer = await state.provider.getSigner();
      const vaultContract = new ethers.Contract(CONTRACT_ADDRESSES.vault, VAULT_ABI, signer);

      const harvestTx = await vaultContract.harvest!();
      await harvestTx.wait();

      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          message: 'Successfully harvested yields!'
        }
      });

      await refreshBalances();
      await refreshStrategies();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'error',
          message: `Harvest failed: ${errorMessage}`
        }
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const addNotification = (notification: Omit<DeFiState['notifications'][0], 'id' | 'timestamp'>) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  // Auto-refresh data when account changes
  useEffect(() => {
    if (state.account && state.provider) {
      void refreshBalances();
      void refreshStrategies();
    }
  }, [state.account, state.provider]);

  // Auto-remove notifications after 5 seconds
  useEffect(() => {
    state.notifications.forEach(notification => {
      if (Date.now() - notification.timestamp > 5000) {
        setTimeout(() => removeNotification(notification.id), 100);
      }
    });
  }, [state.notifications, removeNotification]);

  // Memoized actions to prevent unnecessary re-renders
  const actions = useMemo(() => ({
    connectWallet,
    disconnect,
    refreshBalances,
    refreshStrategies,
    deposit,
    withdraw,
    harvest,
    addNotification,
    removeNotification
  }), [connectWallet, disconnect, refreshBalances, refreshStrategies, deposit, withdraw, harvest, addNotification, removeNotification]);

  // Memoized context value
  const contextValue = useMemo(() => ({
    state,
    actions
  }), [state, actions]);

  return (
    <DeFiContext.Provider value={contextValue}>
      {children}
    </DeFiContext.Provider>
  );
};
