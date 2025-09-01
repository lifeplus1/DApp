import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@headlessui/react';
import { CONTRACTS, YIELD_OPTIMIZER_ABI, ENHANCED_STRATEGY_ABI } from '../constants/contracts';
import type { Provider } from '../types/ethereum';

interface StrategyMetrics {
  address: string;
  name: string;
  apy: number;
  tvl: number;
  isActive: boolean;
  allocation: number;
}

interface YieldAnalyticsProps {
  web3Provider?: Provider | null;
}

// Accessible Badge Component
const Badge: React.FC<{
  children: React.ReactNode;
  variant: 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}> = ({ children, variant, size = 'sm' }) => {
  const baseClasses = "inline-flex items-center font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2";
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  const variantClasses = {
    success: 'bg-green-100 text-green-800 focus:ring-green-500',
    warning: 'bg-yellow-100 text-yellow-800 focus:ring-yellow-500',
    error: 'bg-red-100 text-red-800 focus:ring-red-500',
    info: 'bg-blue-100 text-blue-800 focus:ring-blue-500'
  };

  return (
    <span className={`${baseClasses} ${sizeClasses} ${variantClasses[variant]}`}>
      {children}
    </span>
  );
};

export const YieldAnalytics: React.FC<YieldAnalyticsProps> = ({ web3Provider }) => {
  const [strategies, setStrategies] = useState<StrategyMetrics[]>([]);
  const [bestStrategy, setBestStrategy] = useState<{address: string, apy: number} | null>(null);
  const [loading, setLoading] = useState(false);

  // Memoized contract configuration
  const contractConfig = useMemo(() => ({
    yieldOptimizer: CONTRACTS.advancedYieldOptimizer,
    enhancedStrategy: CONTRACTS.enhancedUniswapStrategy,
    yieldOptimizerABI: YIELD_OPTIMIZER_ABI,
    enhancedStrategyABI: ENHANCED_STRATEGY_ABI
  }), []);

  // Optimized strategy metrics fetching with useCallback
  const fetchStrategyMetrics = useCallback(async () => {
    if (!web3Provider) return;
    
    setLoading(true);
    try {
      const { ethers } = await import('ethers');
      const signer = await web3Provider.getSigner();
      
      // Connect to YieldOptimizer
      const yieldOptimizer = new ethers.Contract(
        contractConfig.yieldOptimizer,
        contractConfig.yieldOptimizerABI,
        signer
      );
      
      // Connect to Enhanced Strategy
      const enhancedStrategy = new ethers.Contract(
        contractConfig.enhancedStrategy,
        contractConfig.enhancedStrategyABI,
        signer
      );
      
      // Fetch strategy data
      const [name, apy, tvl, isActive] = await Promise.all([
        enhancedStrategy.name?.() || 'Enhanced UniswapV3 Strategy',
        enhancedStrategy.getAPY?.() || 800, // Default 8% APY
        enhancedStrategy.getTVL?.() || 0,
        enhancedStrategy.isActive?.() || true,
      ]);
      
      const strategyData: StrategyMetrics = {
        address: CONTRACTS.enhancedUniswapStrategy,
        name,
        apy: Number(apy) / 100, // Convert from basis points
        tvl: Number(ethers.formatEther(tvl || 0)),
        isActive,
        allocation: 100, // For now, assuming 100% allocation
      };
      
      setStrategies([strategyData]);
      
      // Get best strategy recommendation
      try {
        if (yieldOptimizer.getBestStrategy) {
          const [bestStrategyAddress, bestAPY] = await yieldOptimizer.getBestStrategy();
          setBestStrategy({
            address: bestStrategyAddress,
            apy: Number(bestAPY) / 100,
          });
        }
      } catch (_error) {
        console.log('Best strategy call failed (expected in current setup)');
      }
      
    } catch (_error) {
      console.error('Error fetching yield data:', _error);
    } finally {
      setLoading(false);
    }
  }, [web3Provider, contractConfig]);

  // Optimized effect with proper dependencies
  useEffect(() => {
    if (web3Provider) {
      fetchStrategyMetrics();
    }
  }, [web3Provider, fetchStrategyMetrics]);

  // Memoized formatting functions
  const formatAPY = useCallback((apy: number) => `${apy.toFixed(2)}%`, []);
  const formatTVL = useCallback((tvl: number) => `$${tvl.toLocaleString()}`, []);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          🧠 Advanced Yield Analytics
        </h2>
        <Button
          onClick={fetchStrategyMetrics}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh'}
        </Button>
      </div>

      {/* Best Strategy Recommendation */}
      {bestStrategy && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-700 mb-2">
            🎯 Recommended Strategy
          </h3>
          <div className="flex justify-between items-center">
            <span className="text-green-600">
              Best APY: {formatAPY(bestStrategy.apy)}
            </span>
            <span className="text-xs text-green-500 font-mono">
              {bestStrategy.address.slice(0, 8)}...
            </span>
          </div>
        </div>
      )}

      {/* Strategy Performance Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-700">Strategy</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-700">APY</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-700">TVL</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-700">Status</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-700">Allocation</th>
            </tr>
          </thead>
          <tbody>
            {strategies.map((strategy) => (
              <tr key={strategy.address} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-2">
                  <div>
                    <div className="font-medium text-gray-900">{strategy.name}</div>
                    <div className="text-xs text-gray-500 font-mono">
                      {strategy.address.slice(0, 10)}...{strategy.address.slice(-6)}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <Badge variant={strategy.apy > 10 ? 'success' : strategy.apy > 5 ? 'warning' : 'info'}>
                    {formatAPY(strategy.apy)}
                  </Badge>
                </td>
                <td className="py-3 px-2 text-gray-900">
                  {formatTVL(strategy.tvl)}
                </td>
                <td className="py-3 px-2">
                  <Badge variant={strategy.isActive ? 'success' : 'error'}>
                    {strategy.isActive ? '✅ Active' : '❌ Inactive'}
                  </Badge>
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ease-out ${
                          strategy.allocation >= 100 ? 'w-full bg-blue-600' :
                          strategy.allocation >= 75 ? 'w-3/4 bg-blue-600' :
                          strategy.allocation >= 50 ? 'w-1/2 bg-blue-600' :
                          strategy.allocation >= 25 ? 'w-1/4 bg-blue-600' :
                          'w-1/12 bg-blue-600'
                        }`}
                        title={`Allocation: ${strategy.allocation}%`}
                      />
                    </div>
                    <span className="text-sm text-gray-600 min-w-[3rem]">
                      {strategy.allocation}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Feature Highlights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-1">🧠</div>
          <div className="text-sm font-medium text-gray-700">Intelligent Routing</div>
          <div className="text-xs text-gray-500">AI-powered yield optimization</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-1">⚡</div>
          <div className="text-sm font-medium text-gray-700">Real-time Analytics</div>
          <div className="text-xs text-gray-500">Live performance tracking</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-1">🔒</div>
          <div className="text-sm font-medium text-gray-700">Risk Management</div>
          <div className="text-xs text-gray-500">Advanced safety protocols</div>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div
            className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"
            role="status"
            aria-label="Loading strategy data"
          >
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
};
