/**
 * @title Phase 5.2 React Component Optimization Implementation
 * @notice Enhanced React components with TypeScript and performance optimizations
 * @dev Implements React.memo, useMemo, useCallback for optimal performance
 */

import type { BrowserProvider, JsonRpcSigner } from 'ethers';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { LoadingState, OptimizedButton } from './OptimizedComponents';
import { ResponsiveContainer, ResponsiveGrid, useResponsive } from './ResponsiveUtils';

/**
 * @title Optimized Strategy Card Component
 * @notice Memoized strategy display card with performance optimization
 */

interface StrategyData {
  address: string;
  name: string;
  apy: number;
  tvl: number;
  riskLevel: 'low' | 'medium' | 'high';
  isActive: boolean;
}

interface OptimizedStrategyCardProps {
  strategy: StrategyData;
  onSelect?: (address: string) => void;
  isSelected?: boolean;
  className?: string;
}

export const OptimizedStrategyCard: React.FC<OptimizedStrategyCardProps> = memo(({
  strategy,
  onSelect,
  isSelected = false,
  className = ''
}) => {
  const { isMobile } = useResponsive();
  
  const handleClick = useCallback(() => {
    if (onSelect && strategy.isActive) {
      onSelect(strategy.address);
    }
  }, [onSelect, strategy.address, strategy.isActive]);

  const riskColorClass = useMemo(() => {
    const colors = {
      low: 'text-green-600 bg-green-50',
      medium: 'text-yellow-600 bg-yellow-50',
      high: 'text-red-600 bg-red-50'
    };
    return colors[strategy.riskLevel];
  }, [strategy.riskLevel]);

  const formattedTVL = useMemo(() => {
    if (strategy.tvl >= 1000000) {
      return `$${(strategy.tvl / 1000000).toFixed(1)}M`;
    }
    if (strategy.tvl >= 1000) {
      return `$${(strategy.tvl / 1000).toFixed(1)}K`;
    }
    return `$${strategy.tvl.toFixed(0)}`;
  }, [strategy.tvl]);

  const cardClasses = useMemo(() => `
    bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200
    border-2 cursor-pointer
    ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}
    ${!strategy.isActive ? 'opacity-60 cursor-not-allowed' : ''}
    ${className}
  `.trim(), [isSelected, strategy.isActive, className]);

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      role="button"
      tabIndex={strategy.isActive ? 0 : -1}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg text-gray-900 mb-1">
              {strategy.name}
            </h3>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${riskColorClass}`}>
              {strategy.riskLevel.toUpperCase()} RISK
            </span>
          </div>
          <div className={`w-3 h-3 rounded-full ${strategy.isActive ? 'bg-green-400' : 'bg-gray-400'}`} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500 mb-1">APY</div>
            <div className="text-2xl font-bold text-blue-600">
              {(strategy.apy / 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">TVL</div>
            <div className={`text-xl font-semibold text-gray-900 ${isMobile ? 'text-lg' : ''}`}>
              {formattedTVL}
            </div>
          </div>
        </div>

        {!strategy.isActive && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Strategy temporarily inactive
          </div>
        )}
      </div>
    </div>
  );
});
OptimizedStrategyCard.displayName = 'OptimizedStrategyCard';

/**
 * @title Optimized Portfolio Summary
 * @notice Memoized portfolio overview with performance metrics
 */

interface PortfolioData {
  totalValue: number;
  totalYield: number;
  dailyChange: number;
  weeklyChange: number;
  allocations: Array<{
    strategy: string;
    percentage: number;
    value: number;
  }>;
}

interface OptimizedPortfolioSummaryProps {
  portfolio: PortfolioData;
  provider?: BrowserProvider;
  signer?: JsonRpcSigner;
  className?: string;
}

export const OptimizedPortfolioSummary: React.FC<OptimizedPortfolioSummaryProps> = memo(({
  portfolio,
  provider: _provider,
  signer: _signer,
  className = ''
}) => {
  const { isMobile, isTablet } = useResponsive();

  const formattedValues = useMemo(() => ({
    totalValue: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(portfolio.totalValue),
    totalYield: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(portfolio.totalYield),
    dailyChange: portfolio.dailyChange.toFixed(2),
    weeklyChange: portfolio.weeklyChange.toFixed(2)
  }), [portfolio]);

  const changeColorClass = useCallback((change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  }, []);

  const changeIcon = useCallback((change: number) => {
    return change >= 0 ? '↗' : '↘';
  }, []);

  const gridColumns = useMemo(() => {
    if (isMobile) return { sm: 1, md: 2 };
    if (isTablet) return { md: 2, lg: 3 };
    return { lg: 4 };
  }, [isMobile, isTablet]);

  return (
    <ResponsiveContainer className={className}>
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Portfolio Summary</h2>
        
        <ResponsiveGrid columns={gridColumns} gap="md">
          {/* Total Portfolio Value */}
          <div className="text-center p-4">
            <div className="text-sm text-gray-500 mb-2">Total Value</div>
            <div className="text-3xl font-bold text-gray-900">
              {formattedValues.totalValue}
            </div>
          </div>

          {/* Total Yield Earned */}
          <div className="text-center p-4">
            <div className="text-sm text-gray-500 mb-2">Total Yield</div>
            <div className="text-2xl font-semibold text-green-600">
              +{formattedValues.totalYield}
            </div>
          </div>

          {/* Daily Change */}
          <div className="text-center p-4">
            <div className="text-sm text-gray-500 mb-2">24h Change</div>
            <div className={`text-xl font-semibold flex items-center justify-center ${changeColorClass(portfolio.dailyChange)}`}>
              <span className="mr-1">{changeIcon(portfolio.dailyChange)}</span>
              {Math.abs(Number(formattedValues.dailyChange))}%
            </div>
          </div>

          {/* Weekly Change */}
          <div className="text-center p-4">
            <div className="text-sm text-gray-500 mb-2">7d Change</div>
            <div className={`text-xl font-semibold flex items-center justify-center ${changeColorClass(portfolio.weeklyChange)}`}>
              <span className="mr-1">{changeIcon(portfolio.weeklyChange)}</span>
              {Math.abs(Number(formattedValues.weeklyChange))}%
            </div>
          </div>
        </ResponsiveGrid>

        {/* Strategy Allocations */}
        {portfolio.allocations.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Allocation</h3>
            <div className="space-y-3">
              {portfolio.allocations.map((allocation, index) => (
                <div key={`${allocation.strategy}-${index}`} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className={`w-4 h-4 rounded mr-3 bg-[hsl(${(index * 60) % 360},70%,50%)]`}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {allocation.strategy}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {allocation.percentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      ${allocation.value.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ResponsiveContainer>
  );
});
OptimizedPortfolioSummary.displayName = 'OptimizedPortfolioSummary';

/**
 * @title Transaction History Component
 * @notice Optimized transaction display with pagination
 */

interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'yield' | 'rebalance';
  amount: number;
  timestamp: number;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
}

interface OptimizedTransactionHistoryProps {
  transactions: Transaction[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
}

export const OptimizedTransactionHistory: React.FC<OptimizedTransactionHistoryProps> = memo(({
  transactions,
  loading = false,
  onLoadMore,
  hasMore = false,
  className = ''
}) => {
  const { isMobile } = useResponsive();
  const [filter, setFilter] = useState<Transaction['type'] | 'all'>('all');

  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter(tx => tx.type === filter);
  }, [transactions, filter]);

  const formatAmount = useCallback((amount: number, type: Transaction['type']) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
    
    const sign = type === 'deposit' || type === 'yield' ? '+' : '-';
    return `${sign}${formatted}`;
  }, []);

  const getTypeColor = useCallback((type: Transaction['type']) => {
    const colors = {
      deposit: 'text-green-600 bg-green-50',
      withdraw: 'text-red-600 bg-red-50',
      yield: 'text-blue-600 bg-blue-50',
      rebalance: 'text-purple-600 bg-purple-50'
    };
    return colors[type];
  }, []);

  const getStatusColor = useCallback((status: Transaction['status']) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-50',
      confirmed: 'text-green-600 bg-green-50',
      failed: 'text-red-600 bg-red-50'
    };
    return colors[status];
  }, []);

  const handleLoadMore = useCallback(() => {
    if (onLoadMore && hasMore && !loading) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, loading]);

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
        
        {/* Filter Dropdown */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Transaction['type'] | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Filter transactions by type"
        >
          <option value="all">All Types</option>
          <option value="deposit">Deposits</option>
          <option value="withdraw">Withdrawals</option>
          <option value="yield">Yield</option>
          <option value="rebalance">Rebalancing</option>
        </select>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No transactions found
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(tx.type)}`}>
                  {tx.type.toUpperCase()}
                </span>
                
                <div>
                  <div className="font-medium text-gray-900">
                    {formatAmount(tx.amount, tx.type)}
                  </div>
                  {!isMobile && (
                    <div className="text-sm text-gray-500">
                      {new Date(tx.timestamp * 1000).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(tx.status)}`}>
                  {tx.status.toUpperCase()}
                </span>
                {!isMobile && (
                  <div className="text-xs text-gray-400 mt-1">
                    {tx.txHash.substring(0, 8)}...{tx.txHash.substring(tx.txHash.length - 6)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-6 text-center">
          <OptimizedButton
            onClick={handleLoadMore}
            loading={loading}
            variant="secondary"
            className="w-full md:w-auto"
          >
            Load More Transactions
          </OptimizedButton>
        </div>
      )}

      {loading && !hasMore && (
        <div className="mt-6">
          <LoadingState type="skeleton" />
        </div>
      )}
    </div>
  );
});
OptimizedTransactionHistory.displayName = 'OptimizedTransactionHistory';

export default {
  OptimizedStrategyCard,
  OptimizedPortfolioSummary,
  OptimizedTransactionHistory
};
