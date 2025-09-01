import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, Activity, TrendingUp, Shield, Zap, Bell } from 'lucide-react';

interface SystemMetrics {
  healthScore: number;
  totalValue: string;
  riskLevel: 'low' | 'medium' | 'high';
  lastRebalance: string;
  gasEfficiency: number;
  strategiesActive: number;
  alertsCount: number;
  fees24h: number;
  feeToYieldRatio: number;
}

interface StrategyHealth {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  apy: number;
  healthFactor?: number;
  allocation: number;
  lastUpdate: string;
  alerts: string[];
}

interface AutomationStatus {
  rebalancingEnabled: boolean;
  emergencyMode: boolean;
  lastAutomatedAction: string;
  nextRebalanceEstimate: string;
  automationEfficiency: number;
}

// Real-time monitoring system for Phase 6 Day 3
export const AdvancedMonitoringDashboard: React.FC = () => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    healthScore: 94,
    totalValue: '$125,847.32',
    riskLevel: 'low',
    lastRebalance: '2 hours ago',
    gasEfficiency: 87,
    strategiesActive: 4,
    alertsCount: 0,
    fees24h: 428.73,
    feeToYieldRatio: 9.8
  });

  const [strategiesHealth, setStrategiesHealth] = useState<StrategyHealth[]>([
    {
      name: 'Uniswap V3',
      status: 'healthy',
      apy: 12.4,
      allocation: 25,
      lastUpdate: '1 min ago',
      alerts: []
    },
    {
      name: 'Curve Finance',
      status: 'healthy',
      apy: 8.7,
      allocation: 25,
      lastUpdate: '1 min ago',
      alerts: []
    },
    {
      name: 'Compound V3',
      status: 'healthy',
      apy: 6.2,
      allocation: 25,
      lastUpdate: '2 min ago',
      alerts: []
    },
    {
      name: 'Aave V3',
      status: 'warning',
      apy: 15.8,
      healthFactor: 1.74,
      allocation: 25,
      lastUpdate: '30 sec ago',
      alerts: ['Health factor below 1.8x target']
    }
  ]);

  const [automationStatus, _setAutomationStatus] = useState<AutomationStatus>({
    rebalancingEnabled: true,
    emergencyMode: false,
    lastAutomatedAction: 'Health factor adjustment - 5 min ago',
    nextRebalanceEstimate: 'In 4-6 hours (volatility dependent)',
    automationEfficiency: 96
  });

  // Note: _setAutomationStatus reserved for future real-time automation updates

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update system metrics with small variations
      setSystemMetrics(prev => ({
        ...prev,
        healthScore: Math.max(85, Math.min(100, prev.healthScore + (Math.random() - 0.5) * 2)),
        gasEfficiency: Math.max(80, Math.min(95, prev.gasEfficiency + (Math.random() - 0.5) * 3)),
        totalValue: `$${(125847 + Math.random() * 1000 - 500).toFixed(2)}`,
        fees24h: Math.max(200, Math.min(800, prev.fees24h + (Math.random() - 0.5) * 20)),
        feeToYieldRatio: Math.max(5, Math.min(15, prev.feeToYieldRatio + (Math.random() - 0.5) * 0.3))
      }));

      // Update Aave health factor
      setStrategiesHealth(prev => prev.map(strategy => 
        strategy.name === 'Aave V3' 
          ? {
              ...strategy,
              healthFactor: Math.max(1.5, Math.min(2.5, (strategy.healthFactor || 1.74) + (Math.random() - 0.5) * 0.1)),
              lastUpdate: 'Just now'
            }
          : strategy
      ));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getHealthScoreColor = useCallback((score: number) => {
    if (score >= 95) return 'text-emerald-600';
    if (score >= 85) return 'text-yellow-600';
    return 'text-red-600';
  }, []);

  const getStrategyStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'healthy': return 'bg-emerald-100 text-emerald-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const averageAPY = useMemo(() => {
    return strategiesHealth.reduce((acc, strategy) => acc + strategy.apy, 0) / strategiesHealth.length;
  }, [strategiesHealth]);

  const totalAlerts = useMemo(() => {
    return strategiesHealth.reduce((acc, strategy) => acc + strategy.alerts.length, 0);
  }, [strategiesHealth]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Advanced Portfolio Monitoring
          </h1>
          <p className="text-slate-600 mt-2">Real-time automation & performance analytics</p>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <Shield className="text-emerald-600 w-8 h-8" />
              <span className={`text-2xl font-bold ${getHealthScoreColor(systemMetrics.healthScore)}`}>
                {systemMetrics.healthScore}%
              </span>
            </div>
            <h3 className="text-slate-600 text-sm font-medium">System Health</h3>
            <p className="text-xs text-slate-400 mt-1">All systems operational</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="text-blue-600 w-8 h-8" />
              <span className="text-2xl font-bold text-slate-800">{systemMetrics.totalValue}</span>
            </div>
            <h3 className="text-slate-600 text-sm font-medium">Total Portfolio Value</h3>
            <p className="text-xs text-emerald-600 mt-1">+2.3% today</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <Zap className="text-purple-600 w-8 h-8" />
              <span className="text-2xl font-bold text-slate-800">{averageAPY.toFixed(1)}%</span>
            </div>
            <h3 className="text-slate-600 text-sm font-medium">Weighted APY</h3>
            <p className="text-xs text-blue-600 mt-1">Risk-adjusted yield</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <Bell className={`w-8 h-8 ${totalAlerts > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
              <span className={`text-2xl font-bold ${totalAlerts > 0 ? 'text-yellow-600' : 'text-gray-600'}`}>
                {totalAlerts}
              </span>
            </div>
            <h3 className="text-slate-600 text-sm font-medium">Active Alerts</h3>
            <p className="text-xs text-slate-400 mt-1">Monitoring all strategies</p>
          </div>
        </div>

        {/* Strategy Health Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center">
              <Activity className="text-blue-600 w-6 h-6 mr-2" />
              Strategy Health Monitor
            </h2>
            
            <div className="space-y-4">
              {strategiesHealth.map((strategy, index) => (
                <div key={index} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-slate-800">{strategy.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStrategyStatusColor(strategy.status)}`}>
                        {strategy.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">{strategy.apy}% APY</p>
                      <p className="text-xs text-slate-500">{strategy.allocation}% allocation</p>
                    </div>
                  </div>
                  
                  {strategy.healthFactor && (
                    <div className="mb-2">
                      <p className="text-xs text-slate-600">
                        Health Factor: <span className="font-medium">{strategy.healthFactor.toFixed(2)}x</span>
                      </p>
                      <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                        {(() => {
                          const pct = Math.min(100, (strategy.healthFactor / 2.5) * 100);
                          const color = strategy.healthFactor >= 2.0 ? 'bg-emerald-500' : strategy.healthFactor >= 1.5 ? 'bg-yellow-500' : 'bg-red-500';
                          const widthClass = pct > 90 ? 'w-full' : pct > 75 ? 'w-11/12' : pct > 60 ? 'w-3/4' : pct > 45 ? 'w-1/2' : pct > 30 ? 'w-1/3' : 'w-1/4';
                          return <div className={`h-2 rounded-full transition-all duration-500 ${color} ${widthClass}`} />;
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Updated: {strategy.lastUpdate}</span>
                    {strategy.alerts.length > 0 && (
                      <span className="text-yellow-600 font-medium">{strategy.alerts.length} alert(s)</span>
                    )}
                  </div>

                  {strategy.alerts.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {strategy.alerts.map((alert, alertIndex) => (
                        <div key={alertIndex} className="bg-yellow-50 border border-yellow-200 rounded p-2">
                          <p className="text-xs text-yellow-800 flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {alert}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Automation Status */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center">
              <Zap className="text-purple-600 w-6 h-6 mr-2" />
              Automation Status
            </h2>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-slate-800">Automated Rebalancing</h3>
                  <p className="text-sm text-slate-600">Intelligent portfolio optimization</p>
                </div>
                <div className={`w-12 h-6 rounded-full transition-all duration-300 ${
                  automationStatus.rebalancingEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                } relative`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 ${
                    automationStatus.rebalancingEnabled ? 'left-6' : 'left-0.5'
                  }`} />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-slate-800">Emergency Mode</h3>
                  <p className="text-sm text-slate-600">Automated risk protection</p>
                </div>
                <div className={`w-12 h-6 rounded-full transition-all duration-300 ${
                  automationStatus.emergencyMode ? 'bg-red-500' : 'bg-slate-300'
                } relative`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 ${
                    automationStatus.emergencyMode ? 'left-6' : 'left-0.5'
                  }`} />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div>
                  <h4 className="font-medium text-slate-700 text-sm">Last Automated Action</h4>
                  <p className="text-slate-600 text-sm">{automationStatus.lastAutomatedAction}</p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 text-sm">Next Rebalance</h4>
                  <p className="text-slate-600 text-sm">{automationStatus.nextRebalanceEstimate}</p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 text-sm">Automation Efficiency</h4>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                      {(() => {
                        const eff = automationStatus.automationEfficiency;
                        const widthClass = eff > 90 ? 'w-full' : eff > 75 ? 'w-11/12' : eff > 60 ? 'w-3/4' : eff > 45 ? 'w-1/2' : eff > 30 ? 'w-1/3' : 'w-1/4';
                        return <div className={`bg-blue-500 h-2 rounded-full transition-all duration-500 ${widthClass}`} />;
                      })()}
                    </div>
                    <span className="text-sm font-medium text-blue-600">
                      {automationStatus.automationEfficiency}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Analytics */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center">
            <TrendingUp className="text-emerald-600 w-6 h-6 mr-2" />
            Real-Time Performance Analytics
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl">
              <h3 className="text-sm font-medium text-slate-600 mb-2">24h Performance</h3>
              <p className="text-2xl font-bold text-emerald-600">+2.34%</p>
              <p className="text-xs text-slate-500 mt-1">+$2,947.83</p>
            </div>

            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
              <h3 className="text-sm font-medium text-slate-600 mb-2">Sharpe Ratio</h3>
              <p className="text-2xl font-bold text-blue-600">1.87</p>
              <p className="text-xs text-slate-500 mt-1">Risk-adjusted returns</p>
            </div>

            <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
              <h3 className="text-sm font-medium text-slate-600 mb-2">Max Drawdown</h3>
              <p className="text-2xl font-bold text-purple-600">-1.23%</p>
              <p className="text-xs text-slate-500 mt-1">7-day period</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdvancedMonitoringDashboard;
