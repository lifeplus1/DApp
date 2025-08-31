import { useState, useEffect, useCallback } from 'react'
import { formatEther } from 'ethers'
import { ArrowUpIcon, ArrowDownIcon, ChartBarIcon } from '@heroicons/react/24/outline'

interface StrategyMetrics {
  totalDeposited: bigint
  totalFeesEarned: bigint
  currentAPY: number
  lastHarvestTime: number
  activePositions: number
  strategy: string
}

export function UniswapV3Dashboard() {
  const [metrics, setMetrics] = useState<StrategyMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Simulate wallet connection state
  const isConnected = true // Assume connected for demo

  // Fetch strategy metrics (simplified for demo)
  const fetchMetrics = useCallback(async () => {
    try {
      setRefreshing(true)
      setError(null)
      
      // Simulate real Uniswap V3 strategy metrics
      const simulatedMetrics: StrategyMetrics = {
        totalDeposited: BigInt("5000000000000000000000"), // $5000
        totalFeesEarned: BigInt("250000000000000000000"),   // $250 fees
        currentAPY: Math.floor(1200 + Math.random() * 600), // 12-18% APY range
        lastHarvestTime: Date.now() - (Math.random() * 3600000), // Last hour
        activePositions: 1,
        strategy: 'Uniswap V3 USDC/USDT 0.05%'
      }
      
      setMetrics(simulatedMetrics)
    } catch (err) {
      console.error('Failed to fetch strategy metrics:', err)
      setError('Failed to load strategy data')
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    
    if (hours > 0) return `${hours}h ${minutes}m ago`
    return `${minutes}m ago`
  }

  // Format currency
  const formatCurrency = (value: bigint) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(formatEther(value)))
  }

  // Format APY
  const formatAPY = (apy: number) => {
    return (apy / 100).toFixed(2) + '%'
  }

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Connect Wallet</h3>
          <p className="text-gray-500">Connect your wallet to view strategy performance</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Strategy Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Live Uniswap V3 Strategy</h2>
            <p className="text-sm text-gray-600">{metrics?.strategy}</p>
          </div>
          <button
            onClick={fetchMetrics}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {refreshing ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Deposited */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <ArrowDownIcon className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Deposited</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics ? formatCurrency(metrics.totalDeposited) : '$0.00'}
              </p>
            </div>
          </div>
        </div>

        {/* Fees Earned */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <ArrowUpIcon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Fees Earned</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics ? formatCurrency(metrics.totalFeesEarned) : '$0.00'}
              </p>
            </div>
          </div>
        </div>

        {/* Current APY */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <ChartBarIcon className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Current APY</p>
              <p className="text-2xl font-semibold text-purple-600">
                {metrics ? formatAPY(metrics.currentAPY) : '0.00%'}
              </p>
              <p className="text-xs text-gray-500">Live yield rate</p>
            </div>
          </div>
        </div>

        {/* Active Positions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 text-sm font-semibold">
                  {metrics?.activePositions || 0}
                </span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Positions</p>
              <p className="text-sm text-gray-600">
                Last harvest: {metrics ? formatTimeAgo(metrics.lastHarvestTime) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Yield Performance</h3>
          <span className="text-sm text-gray-500">Last 7 days</span>
        </div>
        
        {/* Simulated chart area */}
        <div className="h-64 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Real-Time Yield Chart</p>
            <p className="text-sm text-gray-400 mt-2">
              Interactive yield tracking and analytics coming soon
            </p>
            <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
              <span className="text-green-600">● Live APY: {metrics ? formatAPY(metrics.currentAPY) : '0%'}</span>
              <span className="text-blue-600">● 7d Average: 14.2%</span>
              <span className="text-purple-600">● Peak APY: 18.7%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Strategy Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Protocol Information</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="font-medium">Protocol:</span> Uniswap V3</p>
              <p><span className="font-medium">Pool:</span> USDC/USDT 0.05%</p>
              <p><span className="font-medium">Position Type:</span> Concentrated Liquidity</p>
              <p><span className="font-medium">Risk Level:</span> <span className="text-green-600">Low</span></p>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Performance Metrics</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="font-medium">Fee Tier:</span> 0.05%</p>
              <p><span className="font-medium">Auto-Compound:</span> Every 24 hours</p>
              <p><span className="font-medium">Slippage Protection:</span> 0.5%</p>
              <p><span className="font-medium">Uptime:</span> <span className="text-green-600">99.9%</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
