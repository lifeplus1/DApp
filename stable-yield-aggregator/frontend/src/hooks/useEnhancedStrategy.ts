import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { TypeSafeContractWrapper, DeFiOperationResult } from '../lib/contractUtils';
import LiveUniswapV3StrategyABI from '../abi/LiveUniswapV3Strategy.json';
import deployments from '../deployments.json';

// Enhanced strategy ABI (key functions for backward compatibility)
const ENHANCED_STRATEGY_ABI = [
  "function getAPY() view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function getStrategyMetrics() view returns (uint256, uint256, uint256, uint256, uint256)",
  "function name() view returns (string)",
  "function isActive() view returns (bool)",
  "function deposit(uint256 amount) returns (uint256)",
  "function withdraw(uint256 amount) returns (uint256)",
  "function harvest() returns (uint256)"
];

// Live Uniswap V3 Strategy ABI (simplified interface)
const LIVE_STRATEGY_ABI = LiveUniswapV3StrategyABI;

const VAULT_ABI = [
  "function deposit(uint256 assets, address receiver) returns (uint256)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function harvestYield() returns (uint256)"
];

export interface EnhancedStrategyMetrics {
  currentAPY: string;
  totalDeposits: string;
  totalYield: string;
  harvestCount: string;
  cumulativeYield: string;
  isActive: boolean;
  strategyName: string;
}

export interface UseEnhancedStrategyOptions {
  strategyAddress: string;
  vaultAddress: string;
  provider?: ethers.Provider;
  signer?: ethers.Signer;
}

export const useEnhancedStrategy = ({
  strategyAddress,
  vaultAddress,
  provider,
  signer
}: UseEnhancedStrategyOptions) => {
  const [metrics, setMetrics] = useState<EnhancedStrategyMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string>('0');
  
  const contractWrapper = new TypeSafeContractWrapper(
    provider || new ethers.BrowserProvider(window.ethereum as any),
    signer
  );

  // Load strategy metrics
  const loadMetrics = useCallback(async (): Promise<void> => {
    if (!strategyAddress || !provider) return;
    
    try {
      setLoading(true);
      setError(null);

      // Determine if we're using Phase 2 Live Strategy
      const isPhase2 = deployments.phase2?.enabled && 
                      strategyAddress === deployments.contracts.liveUniswapV3Strategy;

      const strategy = contractWrapper.createContract(
        strategyAddress,
        isPhase2 ? LIVE_STRATEGY_ABI : ENHANCED_STRATEGY_ABI
      ) as any;

      const vault = contractWrapper.createContract(
        vaultAddress,
        VAULT_ABI
      ) as any;

      if (isPhase2) {
        // Phase 2: Use LiveUniswapV3Strategy
        const [currentAPY, name, isActive, totalValue] = await Promise.all([
          strategy.getAPY(),
          strategy.name(),
          strategy.isActive(),
          strategy.totalAssets()
        ]);

        // Get user balance if signer available
        let balance = '0';
        if (signer) {
          const userAddress = await signer.getAddress();
          const balanceWei = await strategy.balanceOf(userAddress);
          balance = ethers.formatUnits(balanceWei, 18); // 18 decimals for mock USDC
        }

        // Calculate APY percentage (from basis points)
        const apyPercent = Number(currentAPY) / 100;

        setMetrics({
          currentAPY: `${apyPercent.toFixed(2)}%`,
          totalDeposits: ethers.formatUnits(totalValue, 18),
          totalYield: 'Real Yields',
          harvestCount: 'Live',
          cumulativeYield: 'Active',
          isActive,
          strategyName: `${name} (Phase 2)`
        });
        setUserBalance(balance);

      } else {
        // Phase 1: Use original enhanced strategy
        const [currentAPY, name, isActive, strategyMetrics] = await Promise.all([
          strategy.getAPY(),
          strategy.name(),
          strategy.isActive(),
          strategy.getStrategyMetrics()
        ]);

        // Get user balance if signer available
        let balance = '0';
        if (signer) {
          const userAddress = await signer.getAddress();
          const balanceWei = await vault.balanceOf(userAddress);
          balance = ethers.formatEther(balanceWei);
        }

        const [totalDeposits, totalYield, , harvestCount, cumulativeYield] = strategyMetrics;

        setMetrics({
          currentAPY: `${Number(currentAPY) / 100}%`,
          totalDeposits: ethers.formatEther(totalDeposits),
          totalYield: ethers.formatEther(totalYield),
          harvestCount: harvestCount.toString(),
          cumulativeYield: ethers.formatEther(cumulativeYield),
          isActive,
          strategyName: name
        });
        setUserBalance(balance);
      }

    } catch (err: any) {
      console.error('Failed to load strategy metrics:', err);
      setError(err.message || 'Failed to load strategy data');
    } finally {
      setLoading(false);
    }
  }, [strategyAddress, vaultAddress, provider, signer, contractWrapper]);

  // Check if Phase 2 is enabled and strategy is available
  const isPhase2 = deployments.phase2?.enabled && deployments.phase2?.liveStrategy;
  const liveStrategyAddress = deployments.phase2?.liveStrategy;

  // Deposit function
  const deposit = useCallback(async (amount: string): Promise<DeFiOperationResult<string>> => {
    if (!signer || !vaultAddress) {
      return {
        success: false,
        error: 'user_rejected',
        message: 'Wallet not connected'
      };
    }

    if (isPhase2 && liveStrategyAddress) {
      // Direct strategy deposit for Phase 2
      const strategy = contractWrapper.createContract(liveStrategyAddress, LiveUniswapV3StrategyABI) as any;
      const userAddress = await signer.getAddress();

      return contractWrapper.safeExecute(async () => {
        const amountWei = ethers.parseEther(amount);
        const tx = await strategy.deposit(amountWei, userAddress);
        await tx.wait();
        
        // Reload metrics after successful deposit
        await loadMetrics();
        
        return tx.hash;
      }, `Depositing ${amount} tokens to Uniswap V3 Strategy`);
    } else {
      // Legacy vault deposit
      const vault = contractWrapper.createContract(vaultAddress, VAULT_ABI) as any;
      const userAddress = await signer.getAddress();

      return contractWrapper.safeExecute(async () => {
        const amountWei = ethers.parseEther(amount);
        const tx = await vault.deposit(amountWei, userAddress);
        await tx.wait();
        
        // Reload metrics after successful deposit
        await loadMetrics();
        
        return tx.hash;
      }, `Depositing ${amount} tokens`);
    }
  }, [signer, vaultAddress, liveStrategyAddress, isPhase2, contractWrapper, loadMetrics]);

  // Withdraw function
  const withdraw = useCallback(async (amount: string): Promise<DeFiOperationResult<string>> => {
    if (!signer || !vaultAddress) {
      return {
        success: false,
        error: 'user_rejected',
        message: 'Wallet not connected'
      };
    }

    if (isPhase2 && liveStrategyAddress) {
      // Direct strategy withdrawal for Phase 2
      const strategy = contractWrapper.createContract(liveStrategyAddress, LiveUniswapV3StrategyABI) as any;
      const userAddress = await signer.getAddress();

      return contractWrapper.safeExecute(async () => {
        const amountWei = ethers.parseEther(amount);
        const tx = await strategy.withdraw(amountWei, userAddress, userAddress);
        await tx.wait();
        
        // Reload metrics after successful withdrawal
        await loadMetrics();
        
        return tx.hash;
      }, `Withdrawing ${amount} tokens from Uniswap V3 Strategy`);
    } else {
      // Legacy vault withdrawal
      const vault = contractWrapper.createContract(vaultAddress, VAULT_ABI) as any;
      const userAddress = await signer.getAddress();

      return contractWrapper.safeExecute(async () => {
        const amountWei = ethers.parseEther(amount);
        const tx = await vault.redeem(amountWei, userAddress, userAddress);
        await tx.wait();
        
        // Reload metrics after successful withdrawal
        await loadMetrics();
        
        return tx.hash;
      }, `Withdrawing ${amount} tokens`);
    }
  }, [signer, vaultAddress, liveStrategyAddress, isPhase2, contractWrapper, loadMetrics]);

  // Harvest yield function
  const harvestYield = useCallback(async (): Promise<DeFiOperationResult<string>> => {
    if (!signer) {
      return {
        success: false,
        error: 'user_rejected',
        message: 'Wallet not connected'
      };
    }

    if (isPhase2 && liveStrategyAddress) {
      // Direct strategy harvest for Phase 2
      const strategy = contractWrapper.createContract(liveStrategyAddress, LiveUniswapV3StrategyABI) as any;

      return contractWrapper.safeExecute(async () => {
        const tx = await strategy.harvest();
        await tx.wait();
        
        // Reload metrics after successful harvest
        await loadMetrics();
        
        return tx.hash;
      }, 'Harvesting Uniswap V3 yield');
    } else if (vaultAddress) {
      // Legacy vault harvest
      const vault = contractWrapper.createContract(vaultAddress, VAULT_ABI) as any;

      return contractWrapper.safeExecute(async () => {
        const tx = await vault.harvestYield();
        await tx.wait();
        
        // Reload metrics after successful harvest
        await loadMetrics();
        
        return tx.hash;
      }, 'Harvesting yield');
    } else {
      return {
        success: false,
        error: 'contract_error',
        message: 'No strategy or vault contract available'
      };
    }
  }, [signer, vaultAddress, liveStrategyAddress, isPhase2, contractWrapper, loadMetrics]);

  // Auto-refresh metrics every 30 seconds
  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

  return {
    metrics,
    userBalance,
    loading,
    error,
    actions: {
      deposit,
      withdraw,
      harvestYield,
      refreshMetrics: loadMetrics
    }
  };
};

export default useEnhancedStrategy;
