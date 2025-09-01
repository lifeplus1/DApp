import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  PieChart, 
  Settings, 
  Download, 
  RefreshCw,
  AlertTriangle,
  Shield,
  Zap,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  Target
} from 'lucide-react';

// Enhanced interfaces for production-grade portfolio management
interface PortfolioMetrics {
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  weeklyChange: number;
  weeklyChangePercent: number;
  monthlyChange: number;
  monthlyChangePercent: number;
  allTimeHigh: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  volatility: number;
  beta: number;
}

interface StrategyAllocation {
  id: string;
  name: string;
  symbol: string;
  allocation: number;
  targetAllocation: number;
  currentValue: number;
  apy: number;
  risk: 'low' | 'medium' | 'high';
  healthScore: number;
  status: 'healthy' | 'warning' | 'critical';
  lastRebalance: string;
  performance24h: number;
  performance7d: number;
  performance30d: number;
  tvl: number;
  volume24h: number;
}

interface RiskMetrics {
  portfolioRisk: 'low' | 'medium' | 'high';
  concentrationRisk: number;
  liquidityRisk: number;
  smartContractRisk: number;
  marketRisk: number;
  counterpartyRisk: number;
  overallScore: number;
}

interface TimeframeOption {
  label: string;
  value: string;
  days: number;
}

// Professional Enterprise Portfolio Dashboard
export const EnterprisePortfolioDashboard: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('7d');
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const timeframeOptions: TimeframeOption[] = [
    { label: '24H', value: '1d', days: 1 },
    { label: '7D', value: '7d', days: 7 },
    { label: '30D', value: '30d', days: 30 },
    { label: '90D', value: '90d', days: 90 },
    { label: '1Y', value: '1y', days: 365 },
    { label: 'ALL', value: 'all', days: 9999 }
  ];

  // Mock data - in production, this would come from API/blockchain
  const [portfolioMetrics] = useState<PortfolioMetrics>({
    totalValue: 2547832.45,
    dailyChange: 12847.32,
    dailyChangePercent: 0.508,
    weeklyChange: 89234.12,
    weeklyChangePercent: 3.62,
    monthlyChange: 187543.88,
    monthlyChangePercent: 7.94,
    allTimeHigh: 2612450.33,
    maxDrawdown: -0.089,
    sharpeRatio: 2.34,
    sortinoRatio: 3.12,
    volatility: 15.6,
    beta: 0.78
  });

  const [strategies] = useState<StrategyAllocation[]>([
    {
      id: 'uniswap-v3',
      name: 'Uniswap V3 Liquidity',
      symbol: 'UNI-V3',
      allocation: 28.5,
      targetAllocation: 25.0,
      currentValue: 726432.15,
      apy: 18.7,
      risk: 'medium',
      healthScore: 94,
      status: 'healthy',
      lastRebalance: '2 hours ago',
      performance24h: 1.2,
      performance7d: 8.4,
      performance30d: 24.1,
      tvl: 45600000,
      volume24h: 12400000
    },
    {
      id: 'curve-finance',
      name: 'Curve Stablecoins',
      symbol: 'CRV',
      allocation: 24.8,
      targetAllocation: 25.0,
      currentValue: 631862.13,
      apy: 12.3,
      risk: 'low',
      healthScore: 97,
      status: 'healthy',
      lastRebalance: '4 hours ago',
      performance24h: 0.3,
      performance7d: 2.8,
      performance30d: 11.2,
      tvl: 2340000,
      volume24h: 890000
    },
    {
      id: 'compound-v3',
      name: 'Compound V3 Lending',
      symbol: 'COMP-V3',
      allocation: 23.2,
      targetAllocation: 25.0,
      currentValue: 591096.89,
      apy: 8.9,
      risk: 'low',
      healthScore: 96,
      status: 'healthy',
      lastRebalance: '6 hours ago',
      performance24h: 0.1,
      performance7d: 1.4,
      performance30d: 5.8,
      tvl: 890000,
      volume24h: 234000
    },
    {
      id: 'aave-v3',
      name: 'Aave V3 Leveraged',
      symbol: 'AAVE-V3',
      allocation: 23.5,
      targetAllocation: 25.0,
      currentValue: 598441.28,
      apy: 22.1,
      risk: 'high',
      healthScore: 87,
      status: 'warning',
      lastRebalance: '30 minutes ago',
      performance24h: 2.1,
      performance7d: 12.3,
      performance30d: 31.7,
      tvl: 1230000,
      volume24h: 567000
    }
  ]);

  const [riskMetrics] = useState<RiskMetrics>({
    portfolioRisk: 'medium',
    concentrationRisk: 0.23,
    liquidityRisk: 0.15,
    smartContractRisk: 0.18,
    marketRisk: 0.34,
    counterpartyRisk: 0.12,
    overallScore: 8.2
  });

  // Calculate portfolio statistics
  const portfolioStats = useMemo(() => {
    const totalAPY = strategies.reduce((acc, strategy) => 
      acc + (strategy.apy * strategy.allocation / 100), 0);
    
    const avgHealthScore = strategies.reduce((acc, strategy) => 
      acc + strategy.healthScore, 0) / strategies.length;

    const rebalanceNeeded = strategies.some(strategy => 
      Math.abs(strategy.allocation - strategy.targetAllocation) > 2);

    return {
      weightedAPY: totalAPY,
      avgHealthScore,
      rebalanceNeeded,
      strategiesCount: strategies.length,
      healthyStrategies: strategies.filter(s => s.status === 'healthy').length
    };
  }, [strategies]);

  // Format currency values
  const formatCurrency = useCallback((value: number, showPrivacy: boolean = false) => {
    if (showPrivacy && isPrivacyMode) return '••••••••';
    
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  }, [isPrivacyMode]);

  // Format percentage
  const formatPercentage = useCallback((value: number, showSign: boolean = true) => {
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }, []);

  // Auto refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // In production, this would trigger data refresh
      console.log('Auto-refreshing portfolio data...');
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
      {/* Header Controls */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Enterprise Portfolio
              </h1>
              
              {/* Timeframe Selector */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                {timeframeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedTimeframe(option.value)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                      selectedTimeframe === option.value
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                className={`p-2 rounded-lg transition-colors ${
                  isPrivacyMode 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isPrivacyMode ? 'Show values' : 'Hide values'}
              >
                {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg transition-colors ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              </button>

              <button className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors" title="Export data">
                <Download className="w-4 h-4" />
              </button>

              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`p-2 rounded-lg transition-colors ${
                  showAdvanced 
                    ? 'bg-purple-100 text-purple-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        
        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Portfolio Value */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div className={`flex items-center space-x-1 text-sm ${
                portfolioMetrics.dailyChangePercent >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {portfolioMetrics.dailyChangePercent >= 0 ? 
                  <ArrowUpRight className="w-4 h-4" /> : 
                  <ArrowDownRight className="w-4 h-4" />
                }
                <span>{formatPercentage(portfolioMetrics.dailyChangePercent)}</span>
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">
              {formatCurrency(portfolioMetrics.totalValue, true)}
            </h3>
            <p className={`text-sm ${portfolioMetrics.dailyChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {portfolioMetrics.dailyChange >= 0 ? '+' : ''}{formatCurrency(Math.abs(portfolioMetrics.dailyChange))} today
            </p>
          </div>

          {/* Weighted APY */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                Weighted
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">
              {portfolioStats.weightedAPY.toFixed(1)}%
            </h3>
            <p className="text-sm text-gray-600">Annual Percentage Yield</p>
          </div>

          {/* Portfolio Health */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div className={`text-xs px-2 py-1 rounded-full ${
                portfolioStats.avgHealthScore >= 95 ? 'bg-green-100 text-green-600' :
                portfolioStats.avgHealthScore >= 85 ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }`}>
                {portfolioStats.healthyStrategies}/{portfolioStats.strategiesCount}
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">
              {portfolioStats.avgHealthScore.toFixed(0)}%
            </h3>
            <p className="text-sm text-gray-600">Health Score</p>
          </div>

          {/* Risk Score */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              {portfolioStats.rebalanceNeeded && (
                <div className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded-full">
                  Rebalance
                </div>
              )}
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">
              {riskMetrics.overallScore}/10
            </h3>
            <p className="text-sm text-gray-600">Risk Score</p>
          </div>
        </div>

        {/* Strategy Allocation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Strategy Allocation List */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                Strategy Allocation
              </h2>
              <div className="flex items-center space-x-2">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Rebalance
                </button>
                <button className="p-1.5 text-gray-400 hover:text-gray-600" title="Filter strategies">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {strategies.map((strategy) => (
                <div key={strategy.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                        {strategy.symbol.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{strategy.name}</h3>
                        <p className="text-sm text-gray-500">{strategy.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(strategy.currentValue, true)}
                      </p>
                      <p className={`text-sm ${
                        strategy.performance24h >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(strategy.performance24h)} 24h
                      </p>
                    </div>
                  </div>

                  {/* Allocation Progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        Allocation: {strategy.allocation}% / {strategy.targetAllocation}%
                      </span>
                      <span className="text-gray-900 font-medium">
                        {strategy.apy}% APY
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 relative">
                      <div 
                        className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${strategy.allocation}%` }}
                      />
                      {/* Target line */}
                      <div 
                        className="absolute top-0 w-0.5 h-2.5 bg-gray-600 rounded-full"
                        style={{ left: `${strategy.targetAllocation}%` }}
                      />
                    </div>
                  </div>

                  {/* Strategy Metrics */}
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Health</p>
                      <div className="flex items-center space-x-1">
                        <span className={`font-medium ${
                          strategy.healthScore >= 95 ? 'text-green-600' :
                          strategy.healthScore >= 85 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {strategy.healthScore}%
                        </span>
                        <div className={`w-2 h-2 rounded-full ${
                          strategy.status === 'healthy' ? 'bg-green-500' :
                          strategy.status === 'warning' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`} />
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-500">Risk</p>
                      <span className={`font-medium capitalize ${
                        strategy.risk === 'low' ? 'text-green-600' :
                        strategy.risk === 'medium' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {strategy.risk}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-500">7D</p>
                      <span className={`font-medium ${
                        strategy.performance7d >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(strategy.performance7d)}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Update</p>
                      <span className="font-medium text-gray-600">{strategy.lastRebalance}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Portfolio Pie Chart & Quick Actions */}
          <div className="space-y-6">
            {/* Allocation Pie Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-purple-600" />
                Allocation Overview
              </h3>
              
              {/* Simple pie chart representation */}
              <div className="relative w-40 h-40 mx-auto mb-4">
                <div className="w-40 h-40 rounded-full border-8 border-blue-500 bg-gradient-to-r from-blue-500 via-emerald-500 via-amber-500 to-red-500" />
                <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{strategies.length}</p>
                    <p className="text-xs text-gray-500">Strategies</p>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2">
                {strategies.map((strategy, index) => (
                  <div key={strategy.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-emerald-500' :
                        index === 2 ? 'bg-amber-500' :
                        'bg-red-500'
                      }`} />
                      <span className="text-gray-600">{strategy.symbol}</span>
                    </div>
                    <span className="font-medium text-gray-900">{strategy.allocation}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-600" />
                Quick Actions
              </h3>
              
              <div className="space-y-3">
                <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 transition-colors">
                  Auto-Rebalance Portfolio
                </button>
                <button className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                  Manual Allocation
                </button>
                <button className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                  Risk Assessment
                </button>
                <button className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                  Export Report
                </button>
              </div>

              {portfolioStats.rebalanceNeeded && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800 font-medium">
                      Rebalance Recommended
                    </span>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    Some strategies are off target allocation
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Analytics (Show when enabled) */}
        {showAdvanced && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Metrics */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-red-600" />
                Risk Analysis
              </h3>
              
              <div className="space-y-4">
                {Object.entries({
                  'Market Risk': riskMetrics.marketRisk,
                  'Concentration Risk': riskMetrics.concentrationRisk,
                  'Smart Contract Risk': riskMetrics.smartContractRisk,
                  'Liquidity Risk': riskMetrics.liquidityRisk,
                  'Counterparty Risk': riskMetrics.counterpartyRisk
                }).map(([label, value]) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-medium">{(value * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          value < 0.2 ? 'bg-green-500' :
                          value < 0.3 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${value * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-green-600" />
                Performance Metrics
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{portfolioMetrics.sharpeRatio}</p>
                  <p className="text-sm text-gray-600">Sharpe Ratio</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{portfolioMetrics.sortinoRatio}</p>
                  <p className="text-sm text-gray-600">Sortino Ratio</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{portfolioMetrics.volatility}%</p>
                  <p className="text-sm text-gray-600">Volatility</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{formatPercentage(portfolioMetrics.maxDrawdown, false)}</p>
                  <p className="text-sm text-gray-600">Max Drawdown</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EnterprisePortfolioDashboard;
