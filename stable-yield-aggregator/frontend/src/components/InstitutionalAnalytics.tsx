import React, { useState, useMemo, useCallback } from 'react';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Target,
  Activity,
  Percent,
  ArrowUpRight,
  Award,
  AlertCircle
} from 'lucide-react';

interface PerformanceData {
  date: string;
  portfolioValue: number;
  dailyReturn: number;
  benchmarkReturn: number;
  sharpeRatio: number;
  volatility: number;
}

interface StrategyPerformance {
  id: string;
  name: string;
  symbol: string;
  apy: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  volatility: number;
  alpha: number;
  beta: number;
  winRate: number;
  performance1d: number;
  performance7d: number;
  performance30d: number;
  performance90d: number;
  performance1y: number;
  tvl: number;
  volume24h: number;
  rank: number;
}

interface BenchmarkData {
  name: string;
  symbol: string;
  apy: number;
  volatility: number;
  sharpeRatio: number;
  correlation: number;
}

interface RiskMetric {
  name: string;
  current: number;
  target: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
}

// Institutional Analytics Suite Component
export const InstitutionalAnalytics: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('30d');
  const [selectedView, setSelectedView] = useState<'performance' | 'risk' | 'comparison'>('performance');
  const [_selectedStrategy] = useState<string>('all');

  const timeframes = [
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: '90D', value: '90d' },
    { label: '1Y', value: '1y' },
    { label: 'ALL', value: 'all' }
  ];

  // Mock performance data (reserved for future charts)
  const [_performanceHistory] = useState<PerformanceData[]>([
    { date: '2025-08-01', portfolioValue: 2400000, dailyReturn: 0.52, benchmarkReturn: 0.31, sharpeRatio: 2.1, volatility: 14.2 },
    { date: '2025-08-08', portfolioValue: 2435000, dailyReturn: 1.46, benchmarkReturn: 0.85, sharpeRatio: 2.2, volatility: 15.1 },
    { date: '2025-08-15', portfolioValue: 2458000, dailyReturn: 0.94, benchmarkReturn: 0.62, sharpeRatio: 2.3, volatility: 14.8 },
    { date: '2025-08-22', portfolioValue: 2521000, dailyReturn: 2.56, benchmarkReturn: 1.24, sharpeRatio: 2.4, volatility: 16.2 },
    { date: '2025-08-29', portfolioValue: 2547832, dailyReturn: 1.06, benchmarkReturn: 0.73, sharpeRatio: 2.34, volatility: 15.6 }
  ]);

  const [strategies] = useState<StrategyPerformance[]>([
    {
      id: 'uniswap-v3',
      name: 'Uniswap V3 Liquidity',
      symbol: 'UNI-V3',
      apy: 18.7,
      sharpeRatio: 2.8,
      sortinoRatio: 4.1,
      maxDrawdown: -8.3,
      volatility: 22.4,
      alpha: 3.2,
      beta: 1.15,
      winRate: 67.8,
      performance1d: 1.2,
      performance7d: 8.4,
      performance30d: 24.1,
      performance90d: 45.6,
      performance1y: 89.2,
      tvl: 45600000,
      volume24h: 12400000,
      rank: 1
    },
    {
      id: 'aave-v3',
      name: 'Aave V3 Leveraged',
      symbol: 'AAVE-V3',
      apy: 22.1,
      sharpeRatio: 2.1,
      sortinoRatio: 3.4,
      maxDrawdown: -12.7,
      volatility: 28.9,
      alpha: 4.8,
      beta: 1.34,
      winRate: 62.1,
      performance1d: 2.1,
      performance7d: 12.3,
      performance30d: 31.7,
      performance90d: 52.8,
      performance1y: 97.3,
      tvl: 1230000,
      volume24h: 567000,
      rank: 2
    },
    {
      id: 'curve-finance',
      name: 'Curve Stablecoins',
      symbol: 'CRV',
      apy: 12.3,
      sharpeRatio: 3.1,
      sortinoRatio: 4.8,
      maxDrawdown: -3.2,
      volatility: 8.7,
      alpha: 1.8,
      beta: 0.42,
      winRate: 78.9,
      performance1d: 0.3,
      performance7d: 2.8,
      performance30d: 11.2,
      performance90d: 24.6,
      performance1y: 52.1,
      tvl: 2340000,
      volume24h: 890000,
      rank: 3
    },
    {
      id: 'compound-v3',
      name: 'Compound V3 Lending',
      symbol: 'COMP-V3',
      apy: 8.9,
      sharpeRatio: 2.7,
      sortinoRatio: 3.9,
      maxDrawdown: -4.1,
      volatility: 9.3,
      alpha: 1.2,
      beta: 0.38,
      winRate: 74.2,
      performance1d: 0.1,
      performance7d: 1.4,
      performance30d: 5.8,
      performance90d: 16.7,
      performance1y: 38.9,
      tvl: 890000,
      volume24h: 234000,
      rank: 4
    }
  ]);

  const [benchmarks] = useState<BenchmarkData[]>([
    { name: 'DeFi Pulse Index', symbol: 'DPI', apy: 12.4, volatility: 18.7, sharpeRatio: 0.98, correlation: 0.73 },
    { name: 'Ethereum', symbol: 'ETH', apy: 8.9, volatility: 24.3, sharpeRatio: 0.67, correlation: 0.84 },
    { name: 'Bitcoin', symbol: 'BTC', apy: 6.2, volatility: 22.1, sharpeRatio: 0.52, correlation: 0.41 },
    { name: 'S&P 500', symbol: 'SPY', apy: 7.8, volatility: 16.2, sharpeRatio: 0.89, correlation: 0.23 }
  ]);

  const [riskMetrics] = useState<RiskMetric[]>([
    { name: 'Value at Risk (95%)', current: 4.2, target: 5.0, status: 'good', description: 'Maximum expected loss over 1 day' },
    { name: 'Maximum Drawdown', current: 8.3, target: 10.0, status: 'good', description: 'Largest peak-to-trough decline' },
    { name: 'Concentration Risk', current: 28.5, target: 30.0, status: 'warning', description: 'Largest single strategy allocation' },
    { name: 'Liquidity Risk', current: 15.2, target: 20.0, status: 'good', description: 'Portfolio liquidity score' },
    { name: 'Beta to ETH', current: 0.78, target: 1.0, status: 'good', description: 'Sensitivity to Ethereum movements' }
  ]);

  // Calculate portfolio summary metrics
  const portfolioSummary = useMemo(() => {
    const weightedAPY = strategies.reduce((sum, strategy) => sum + (strategy.apy * 0.25), 0);
    const weightedSharpe = strategies.reduce((sum, strategy) => sum + (strategy.sharpeRatio * 0.25), 0);
    const weightedVolatility = Math.sqrt(strategies.reduce((sum, strategy) => sum + Math.pow(strategy.volatility * 0.25, 2), 0));
    const maxDrawdown = Math.min(...strategies.map(s => s.maxDrawdown));
    
    return {
      weightedAPY,
      weightedSharpe,
      weightedVolatility,
      maxDrawdown,
      totalTVL: strategies.reduce((sum, strategy) => sum + strategy.tvl, 0),
      avgWinRate: strategies.reduce((sum, strategy) => sum + strategy.winRate, 0) / strategies.length
    };
  }, [strategies]);

  // Format percentage
  const formatPercentage = useCallback((value: number, showSign: boolean = true) => {
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
          Institutional Analytics
        </h2>

        <div className="flex items-center space-x-4">
          {/* View Selector */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {[
              { id: 'performance', label: 'Performance', icon: TrendingUp },
              { id: 'risk', label: 'Risk', icon: AlertCircle },
              { id: 'comparison', label: 'Comparison', icon: Target }
            ].map(view => {
              const Icon = view.icon;
              return (
                <button
                  key={view.id}
                  onClick={() => setSelectedView(view.id as 'performance' | 'risk' | 'comparison')}
                  className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                    selectedView === view.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{view.label}</span>
                </button>
              );
            })}
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {timeframes.map((timeframe) => (
              <button
                key={timeframe.value}
                onClick={() => setSelectedTimeframe(timeframe.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  selectedTimeframe === timeframe.value
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {timeframe.label}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <Percent className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-emerald-600 font-medium">+{formatPercentage(2.4, false)}</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{portfolioSummary.weightedAPY.toFixed(1)}%</h3>
          <p className="text-sm text-gray-600">Weighted APY</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-blue-600 font-medium">Excellent</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{portfolioSummary.weightedSharpe.toFixed(2)}</h3>
          <p className="text-sm text-gray-600">Sharpe Ratio</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-gray-500">Moderate</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{portfolioSummary.weightedVolatility.toFixed(1)}%</h3>
          <p className="text-sm text-gray-600">Volatility</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <span className="text-sm text-green-600">Low Risk</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{formatPercentage(Math.abs(portfolioSummary.maxDrawdown), false)}</h3>
          <p className="text-sm text-gray-600">Max Drawdown</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-emerald-600">High</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{portfolioSummary.avgWinRate.toFixed(1)}%</h3>
          <p className="text-sm text-gray-600">Win Rate</p>
        </div>
      </div>

      {/* Main Content Area */}
      {selectedView === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <LineChart className="w-5 h-5 mr-2 text-blue-600" />
                Portfolio Performance
              </h3>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-gray-600">Portfolio</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full" />
                  <span className="text-gray-600">Benchmark</span>
                </div>
              </div>
            </div>

            {/* Mock Chart Area */}
            <div className="h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center">
              <div className="text-center text-gray-500">
                <LineChart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Portfolio Performance Chart</p>
                <p className="text-xs">30-day cumulative returns vs benchmark</p>
                <div className="mt-4 text-xs space-y-1">
                  <p className="text-emerald-600 font-medium">Portfolio: +24.7% (30D)</p>
                  <p className="text-gray-500">Benchmark: +18.2% (30D)</p>
                  <p className="text-blue-600 font-medium">Alpha: +6.5%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2 text-gold-500" />
              Strategy Rankings
            </h3>

            <div className="space-y-3">
              {strategies.sort((a, b) => b.apy - a.apy).map((strategy, index) => (
                <div key={strategy.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-600' :
                      index === 1 ? 'bg-gray-100 text-gray-600' :
                      index === 2 ? 'bg-orange-100 text-orange-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{strategy.symbol}</h4>
                      <p className="text-xs text-gray-500">{strategy.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600 text-sm">{strategy.apy.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">APY</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-sm text-gray-600">Portfolio Weighted</p>
                <p className="text-lg font-bold text-blue-600">{portfolioSummary.weightedAPY.toFixed(1)}% APY</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedView === 'risk' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Metrics */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
              Risk Assessment
            </h3>

            <div className="space-y-4">
              {riskMetrics.map((metric) => (
                <div key={metric.name} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{metric.name}</h4>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      metric.status === 'good' ? 'bg-green-100 text-green-600' :
                      metric.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {metric.status}
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Current: {metric.current}%</span>
                      <span className="text-gray-600">Target: ≤{metric.target}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          metric.status === 'good' ? 'bg-green-500' :
                          metric.status === 'warning' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, (metric.current / metric.target) * 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500">{metric.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Strategy Risk Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-purple-600" />
              Strategy Risk Profile
            </h3>

            <div className="space-y-4">
              {strategies.map((strategy) => (
                <div key={strategy.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{strategy.symbol}</h4>
                    <div className="text-sm text-gray-600">
                      Volatility: {strategy.volatility.toFixed(1)}%
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="text-center">
                      <p className="text-gray-600">Sharpe</p>
                      <p className="font-semibold text-blue-600">{strategy.sharpeRatio.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">Max DD</p>
                      <p className="font-semibold text-red-600">{formatPercentage(Math.abs(strategy.maxDrawdown), false)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">Beta</p>
                      <p className="font-semibold text-gray-700">{strategy.beta.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedView === 'comparison' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Target className="w-5 h-5 mr-2 text-green-600" />
            Benchmark Comparison
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Asset</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">APY</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Volatility</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Sharpe</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Correlation</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Alpha</th>
                </tr>
              </thead>
              <tbody>
                {/* Portfolio Row */}
                <tr className="border-b border-gray-100 bg-blue-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        P
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Our Portfolio</h4>
                        <p className="text-xs text-gray-600">4-Strategy Diversified</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-right py-3 px-4 font-semibold text-emerald-600">
                    {portfolioSummary.weightedAPY.toFixed(1)}%
                  </td>
                  <td className="text-right py-3 px-4 font-medium text-gray-900">
                    {portfolioSummary.weightedVolatility.toFixed(1)}%
                  </td>
                  <td className="text-right py-3 px-4 font-medium text-gray-900">
                    {portfolioSummary.weightedSharpe.toFixed(2)}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-500">
                    -
                  </td>
                  <td className="text-right py-3 px-4 font-medium text-emerald-600">
                    +6.5%
                  </td>
                </tr>

                {/* Benchmark Rows */}
                {benchmarks.map((benchmark) => (
                  <tr key={benchmark.symbol} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-bold">
                          {benchmark.symbol.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{benchmark.name}</h4>
                          <p className="text-xs text-gray-600">{benchmark.symbol}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-gray-700">
                      {benchmark.apy.toFixed(1)}%
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-gray-700">
                      {benchmark.volatility.toFixed(1)}%
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-gray-700">
                      {benchmark.sharpeRatio.toFixed(2)}
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-gray-700">
                      {benchmark.correlation.toFixed(2)}
                    </td>
                    <td className="text-right py-3 px-4 font-medium">
                      <span className={`${
                        (portfolioSummary.weightedAPY - benchmark.apy) > 0 
                          ? 'text-emerald-600' 
                          : 'text-red-600'
                      }`}>
                        {formatPercentage(portfolioSummary.weightedAPY - benchmark.apy)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Performance Summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                <h4 className="font-medium text-emerald-900">Outperforming</h4>
              </div>
              <p className="text-emerald-700 text-sm mt-1">
                +{formatPercentage(6.5, false)} vs DeFi Pulse Index
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">Risk-Adjusted</h4>
              </div>
              <p className="text-blue-700 text-sm mt-1">
                Sharpe: {portfolioSummary.weightedSharpe.toFixed(2)} vs 0.98 avg
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-purple-600" />
                <h4 className="font-medium text-purple-900">Correlation</h4>
              </div>
              <p className="text-purple-700 text-sm mt-1">
                Low correlation (0.47 avg) to traditional assets
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstitutionalAnalytics;
