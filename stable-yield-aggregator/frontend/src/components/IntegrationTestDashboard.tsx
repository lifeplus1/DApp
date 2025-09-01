import React, { useState, useCallback, useMemo } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { 
  OptimizedStrategyCard, 
  OptimizedPortfolioSummary, 
  OptimizedTransactionHistory 
} from './Phase5OptimizedComponents';
import { 
  ResponsiveContainer, 
  ResponsiveGrid, 
  ResponsiveText, 
  useResponsive 
} from './ResponsiveUtils';
import { 
  LoadingState, 
  OptimizedButton, 
  usePerformanceMonitor 
} from './OptimizedComponents';

/**
 * @title Integration Test Dashboard
 * @notice Test all Phase 5.2 optimized components together
 */

interface IntegrationTestDashboardProps {
  className?: string;
}

export const IntegrationTestDashboard: React.FC<IntegrationTestDashboardProps> = ({ 
  className = '' 
}) => {
  // Performance monitoring for this component
  const performanceData = usePerformanceMonitor('IntegrationTestDashboard');
  
  // Responsive utilities
  const { isMobile, isTablet } = useResponsive();
  
  // State management
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  // Mock data for testing - memoized to prevent unnecessary recalculations
  const mockStrategies = useMemo(() => [
    {
      address: '0x1234567890123456789012345678901234567890',
      name: 'Uniswap V3 USDC/ETH',
      apy: 1250, // 12.5%
      tvl: 2500000,
      riskLevel: 'medium' as const,
      isActive: true
    },
    {
      address: '0x0987654321098765432109876543210987654321',
      name: 'Aave Lending Strategy',
      apy: 850, // 8.5%
      tvl: 1800000,
      riskLevel: 'low' as const,
      isActive: true
    },
    {
      address: '0x1111222233334444555566667777888899990000',
      name: 'Compound Yield Farming',
      apy: 1580, // 15.8%
      tvl: 950000,
      riskLevel: 'high' as const,
      isActive: false
    }
  ], []);

  const mockPortfolio = useMemo(() => ({
    totalValue: 125000,
    totalYield: 8750,
    dailyChange: 2.3,
    weeklyChange: -1.2,
    allocations: [
      { strategy: 'Uniswap V3', percentage: 60, value: 75000 },
      { strategy: 'Aave Lending', percentage: 30, value: 37500 },
      { strategy: 'Cash Reserve', percentage: 10, value: 12500 }
    ]
  }), []);

  const mockTransactions = useMemo(() => [
    {
      id: '1',
      type: 'deposit' as const,
      amount: 50000,
      timestamp: Date.now() - 86400000, // 1 day ago
      txHash: '0xabcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd123456',
      status: 'confirmed' as const
    },
    {
      id: '2',
      type: 'yield' as const,
      amount: 1250,
      timestamp: Date.now() - 3600000, // 1 hour ago
      txHash: '0xefgh7890123456efgh7890123456efgh7890123456efgh7890123456efgh789012',
      status: 'confirmed' as const
    },
    {
      id: '3',
      type: 'rebalance' as const,
      amount: 0,
      timestamp: Date.now() - 1800000, // 30 min ago
      txHash: '0xijkl3456789012ijkl3456789012ijkl3456789012ijkl3456789012ijkl345678',
      status: 'pending' as const
    }
  ], []);

  // Optimized event handlers
  const handleStrategySelect = useCallback((address: string) => {
    setSelectedStrategy(address);
  }, []);

  const handleLoadMore = useCallback(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => setLoading(false), 2000);
  }, []);

  const handleToggleTransactions = useCallback(() => {
    setShowTransactions(prev => !prev);
  }, []);

  // Grid configuration based on screen size
  const gridConfig = useMemo(() => {
    if (isMobile) return { sm: 1 };
    if (isTablet) return { md: 2 };
    return { lg: 3 };
  }, [isMobile, isTablet]);

  return (
    <ErrorBoundary>
      <ResponsiveContainer className={`space-y-8 ${className}`}>
        {/* Header with responsive text */}
        <div className="text-center">
          <ResponsiveText
            as="h1"
            size={{ sm: 'text-2xl', md: 'text-3xl', lg: 'text-4xl' }}
            className="font-bold text-gray-900 mb-4"
          >
            🚀 Phase 5.2 Integration Test Dashboard
          </ResponsiveText>
          
          <ResponsiveText
            size={{ sm: 'text-sm', md: 'text-base', lg: 'text-lg' }}
            className="text-gray-600 mb-6"
          >
            Testing all optimized components with responsive design and performance monitoring
          </ResponsiveText>

          {/* Performance info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Performance Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-600">Render Count:</span>
                  <span className="ml-1 font-mono">{performanceData.renderCount}</span>
                </div>
                <div>
                  <span className="text-blue-600">Avg Render Time:</span>
                  <span className="ml-1 font-mono">{performanceData.averageRenderTime.toFixed(2)}ms</span>
                </div>
                <div>
                  <span className="text-blue-600">Screen Size:</span>
                  <span className="ml-1 font-mono">
                    {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Portfolio Summary */}
        <OptimizedPortfolioSummary 
          portfolio={mockPortfolio}
          className="mb-8"
        />

        {/* Strategy Grid */}
        <div>
          <ResponsiveText
            as="h2"
            size={{ sm: 'text-xl', md: 'text-2xl' }}
            className="font-bold text-gray-900 mb-6"
          >
            Available Strategies
          </ResponsiveText>
          
          <ResponsiveGrid columns={gridConfig} gap="lg">
            {mockStrategies.map((strategy) => (
              <OptimizedStrategyCard
                key={strategy.address}
                strategy={strategy}
                onSelect={handleStrategySelect}
                isSelected={selectedStrategy === strategy.address}
              />
            ))}
          </ResponsiveGrid>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <OptimizedButton
            onClick={handleToggleTransactions}
            variant="primary"
            size={isMobile ? 'lg' : 'md'}
          >
            {showTransactions ? 'Hide' : 'Show'} Transaction History
          </OptimizedButton>
          
          <OptimizedButton
            onClick={handleLoadMore}
            loading={loading}
            variant="secondary"
            size={isMobile ? 'lg' : 'md'}
          >
            Load More Data
          </OptimizedButton>
        </div>

        {/* Transaction History - Conditionally Rendered */}
        {showTransactions && (
          <OptimizedTransactionHistory
            transactions={mockTransactions}
            loading={loading}
            onLoadMore={handleLoadMore}
            hasMore={true}
          />
        )}

        {/* Loading State Demo */}
        {loading && (
          <div className="flex justify-center">
            <LoadingState
              type="dots"
              size="lg"
              message="Loading additional data..."
            />
          </div>
        )}

        {/* Component Status Grid */}
        <div className="bg-gray-50 rounded-lg p-6">
          <ResponsiveText
            as="h3"
            size={{ sm: 'text-lg', md: 'text-xl' }}
            className="font-semibold text-gray-900 mb-4"
          >
            Component Integration Status
          </ResponsiveText>
          
          <ResponsiveGrid 
            columns={{ sm: 1, md: 2, lg: 4 }} 
            gap="md"
            className="text-center"
          >
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl mb-2">✅</div>
              <div className="font-semibold text-sm">Optimized Components</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl mb-2">📱</div>
              <div className="font-semibold text-sm">Responsive Utils</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl mb-2">🛡️</div>
              <div className="font-semibold text-sm">Error Boundaries</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl mb-2">⚡</div>
              <div className="font-semibold text-sm">Performance Monitor</div>
            </div>
          </ResponsiveGrid>
        </div>
      </ResponsiveContainer>
    </ErrorBoundary>
  );
};

export default IntegrationTestDashboard;
