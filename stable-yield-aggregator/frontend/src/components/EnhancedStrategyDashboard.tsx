import React, { useState } from 'react';
import { 
  ArrowTrendingUpIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  SparklesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import useEnhancedStrategy from '../hooks/useEnhancedStrategy';
import type { Provider, Signer } from '../types/ethereum';

interface EnhancedStrategyDashboardProps {
  strategyAddress: string;
  vaultAddress: string;
  provider?: Provider | null;
  signer?: Signer | null;
  className?: string;
}

const EnhancedStrategyDashboard: React.FC<EnhancedStrategyDashboardProps> = ({
  strategyAddress,
  vaultAddress,
  provider,
  signer,
  className = ''
}) => {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isHarvesting, setIsHarvesting] = useState(false);

  const { metrics, userBalance, loading, error, actions } = useEnhancedStrategy({
    strategyAddress,
    vaultAddress,
    ...(provider && { provider }),
    ...(signer && { signer })
  });

  const handleDeposit = async () => {
    if (!depositAmount || isDepositing) return;
    
    setIsDepositing(true);
    const result = await actions.deposit(depositAmount);
    
    if (result.success) {
      setDepositAmount('');
      // Show success notification (you can integrate with your notification system)
      console.log('✅ Deposit successful:', result.data);
    } else {
      console.error('❌ Deposit failed:', result.message);
    }
    setIsDepositing(false);
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || isWithdrawing) return;
    
    setIsWithdrawing(true);
    const result = await actions.withdraw(withdrawAmount);
    
    if (result.success) {
      setWithdrawAmount('');
      console.log('✅ Withdraw successful:', result.data);
    } else {
      console.error('❌ Withdraw failed:', result.message);
    }
    setIsWithdrawing(false);
  };

  const handleHarvest = async () => {
    if (isHarvesting) return;
    
    setIsHarvesting(true);
    const result = await actions.harvestYield();
    
    if (result.success) {
      console.log('✅ Harvest successful:', result.data);
    } else {
      console.error('❌ Harvest failed:', result.message);
    }
    setIsHarvesting(false);
  };

  if (loading && !metrics) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 animate-pulse ${className}`}>
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="h-12 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Strategy Connection Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatAPY = (apy: string) => {
    const numericAPY = parseFloat(apy.replace('%', ''));
    return `${numericAPY.toFixed(2)}%`;
  };

  const formatCurrency = (amount: string) => {
    const numericAmount = parseFloat(amount);
    if (numericAmount >= 1000000) {
      return `$${(numericAmount / 1000000).toFixed(2)}M`;
    } else if (numericAmount >= 1000) {
      return `$${(numericAmount / 1000).toFixed(2)}K`;
    }
    return `$${numericAmount.toFixed(2)}`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {metrics?.strategyName || 'Enhanced Real Yield Strategy'}
            </h2>
            <p className="text-sm text-gray-600">
              Status: <span className={`font-medium ${metrics?.isActive ? 'text-green-600' : 'text-red-600'}`}>
                {metrics?.isActive ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
        </div>
        <button
          onClick={actions.refreshMetrics}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={loading}
          title="Refresh metrics"
        >
          <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Current APY</p>
              <p className="text-2xl font-bold text-green-900">
                {formatAPY(metrics?.currentAPY || '0%')}
              </p>
            </div>
            <ArrowTrendingUpIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Deposits</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(metrics?.totalDeposits || '0')}
              </p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Yield</p>
              <p className="text-2xl font-bold text-purple-900">
                {formatCurrency(metrics?.totalYield || '0')}
              </p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Harvests</p>
              <p className="text-2xl font-bold text-orange-900">
                {metrics?.harvestCount || '0'}
              </p>
            </div>
            <SparklesIcon className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* User Balance */}
      {signer && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Your Position</p>
              <p className="text-xl font-bold text-gray-900">
                {parseFloat(userBalance).toFixed(4)} Shares
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Cumulative Yield</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(metrics?.cumulativeYield || '0')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {signer && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Deposit */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Deposit Amount
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleDeposit}
                disabled={!depositAmount || isDepositing}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <ArrowUpIcon className="h-4 w-4" />
                <span>{isDepositing ? 'Depositing...' : 'Deposit'}</span>
              </button>
            </div>
          </div>

          {/* Withdraw */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Withdraw Amount
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || isWithdrawing}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <ArrowDownIcon className="h-4 w-4" />
                <span>{isWithdrawing ? 'Withdrawing...' : 'Withdraw'}</span>
              </button>
            </div>
          </div>

          {/* Harvest */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Harvest Yield
            </label>
            <button
              onClick={handleHarvest}
              disabled={isHarvesting}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
            >
              <SparklesIcon className="h-4 w-4" />
              <span>{isHarvesting ? 'Harvesting...' : 'Harvest Yield'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Connection prompt for non-connected users */}
      {!signer && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-center">
            <p className="text-blue-800 font-medium">Connect your wallet to interact with the strategy</p>
            <p className="text-sm text-blue-600 mt-1">
              View real-time metrics and manage your position
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedStrategyDashboard;
