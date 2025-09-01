import React, { useState, useCallback, useMemo } from 'react';
import { 
  Sliders, 
  ArrowRightLeft, 
  Target, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  Settings2,
  Info,
  DollarSign,
  Percent
} from 'lucide-react';

interface TradingAction {
  id: string;
  type: 'rebalance' | 'deposit' | 'withdraw' | 'emergency';
  description: string;
  impact: string;
  estimatedGas: number;
  timeToExecute: string;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

interface StrategyAdjustment {
  strategyId: string;
  name: string;
  currentAllocation: number;
  newAllocation: number;
  difference: number;
  impactOnAPY: number;
  riskChange: number;
}

interface RebalanceSettings {
  autoRebalanceEnabled: boolean;
  rebalanceThreshold: number;
  maxSlippage: number;
  gasPrice: 'slow' | 'standard' | 'fast';
  emergencyMode: boolean;
}

// Professional Trading Panel Component
export const ProfessionalTradingPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'allocate' | 'rebalance' | 'settings'>('allocate');
  const [draggedStrategy, setDraggedStrategy] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const [rebalanceSettings, setRebalanceSettings] = useState<RebalanceSettings>({
    autoRebalanceEnabled: true,
    rebalanceThreshold: 5.0,
    maxSlippage: 1.0,
    gasPrice: 'standard',
    emergencyMode: false
  });

  const [adjustments, setAdjustments] = useState<StrategyAdjustment[]>([
    {
      strategyId: 'uniswap-v3',
      name: 'Uniswap V3 Liquidity',
      currentAllocation: 28.5,
      newAllocation: 25.0,
      difference: -3.5,
      impactOnAPY: -0.6,
      riskChange: -0.2
    },
    {
      strategyId: 'curve-finance',
      name: 'Curve Stablecoins',
      currentAllocation: 24.8,
      newAllocation: 25.0,
      difference: 0.2,
      impactOnAPY: 0.1,
      riskChange: 0
    },
    {
      strategyId: 'compound-v3',
      name: 'Compound V3 Lending',
      currentAllocation: 23.2,
      newAllocation: 25.0,
      difference: 1.8,
      impactOnAPY: 0.2,
      riskChange: 0.1
    },
    {
      strategyId: 'aave-v3',
      name: 'Aave V3 Leveraged',
      currentAllocation: 23.5,
      newAllocation: 25.0,
      difference: 1.5,
      impactOnAPY: 0.3,
      riskChange: 0.1
    }
  ]);

  const [pendingActions] = useState<TradingAction[]>([
    {
      id: '1',
      type: 'rebalance',
      description: 'Rebalance to target allocations',
      impact: 'Low market impact, optimized execution',
      estimatedGas: 0.0023,
      timeToExecute: '2-3 minutes',
      riskLevel: 'low',
      status: 'pending'
    }
  ]);

  // Calculate total impact of adjustments
  const totalImpact = useMemo(() => {
    return {
      apyChange: adjustments.reduce((sum, adj) => sum + adj.impactOnAPY, 0),
      riskChange: adjustments.reduce((sum, adj) => sum + adj.riskChange, 0),
      totalReallocation: adjustments.reduce((sum, adj) => sum + Math.abs(adj.difference), 0)
    };
  }, [adjustments]);

  // Handle allocation adjustment
  const handleAllocationChange = useCallback((strategyId: string, newAllocation: number) => {
    setAdjustments(prev => 
      prev.map(adj => 
        adj.strategyId === strategyId 
          ? { 
              ...adj, 
              newAllocation,
              difference: newAllocation - adj.currentAllocation,
              impactOnAPY: (newAllocation - adj.currentAllocation) * 0.15, // Mock calculation
              riskChange: (newAllocation - adj.currentAllocation) * 0.05
            }
          : adj
      )
    );
  }, []);

  // Execute rebalance
  const executeRebalance = useCallback(async () => {
    setIsExecuting(true);
    
    // Simulate execution time
    setTimeout(() => {
      setIsExecuting(false);
      // Reset adjustments to show successful rebalance
      setAdjustments(prev => 
        prev.map(adj => ({
          ...adj,
          currentAllocation: adj.newAllocation,
          difference: 0,
          impactOnAPY: 0,
          riskChange: 0
        }))
      );
    }, 3000);
  }, []);

  // Drag and drop handlers
  const handleDragStart = useCallback((strategyId: string) => {
    setDraggedStrategy(strategyId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedStrategy(null);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Sliders className="w-5 h-5 mr-2 text-blue-600" />
          Professional Trading Panel
        </h2>
        
        {/* Tab Navigation */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          {[
            { id: 'allocate', label: 'Allocate', icon: Target },
            { id: 'rebalance', label: 'Rebalance', icon: ArrowRightLeft },
            { id: 'settings', label: 'Settings', icon: Settings2 }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'allocate' | 'rebalance' | 'settings')}
                className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Allocation Tab */}
      {activeTab === 'allocate' && (
        <div className="space-y-6">
          {/* Strategy Allocation Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Strategy Allocation</h3>
              <div className="text-sm text-gray-500">
                Total: {adjustments.reduce((sum, adj) => sum + adj.newAllocation, 0).toFixed(1)}%
              </div>
            </div>

            {adjustments.map((adjustment) => (
              <div 
                key={adjustment.strategyId}
                className={`border rounded-xl p-4 transition-all duration-200 ${
                  draggedStrategy === adjustment.strategyId 
                    ? 'border-blue-300 bg-blue-50 shadow-lg' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                draggable
                onDragStart={() => handleDragStart(adjustment.strategyId)}
                onDragEnd={handleDragEnd}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                      {adjustment.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{adjustment.name}</h4>
                      <p className="text-sm text-gray-500">
                        Current: {adjustment.currentAllocation}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Impact Indicators */}
                  <div className="flex items-center space-x-4">
                    {adjustment.difference !== 0 && (
                      <div className={`text-sm font-medium ${
                        adjustment.difference > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {adjustment.difference > 0 ? '+' : ''}{adjustment.difference.toFixed(1)}%
                      </div>
                    )}
                    
                    {/* APY Impact */}
                    {adjustment.impactOnAPY !== 0 && (
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        adjustment.impactOnAPY > 0 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        APY: {adjustment.impactOnAPY > 0 ? '+' : ''}{adjustment.impactOnAPY.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Allocation Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Target Allocation</span>
                    <span className="font-medium">{adjustment.newAllocation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={adjustment.newAllocation}
                    onChange={(e) => handleAllocationChange(adjustment.strategyId, parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Rebalance Impact Summary */}
          {totalImpact.totalReallocation > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Info className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-blue-900">Rebalance Impact</h4>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-blue-700">Portfolio APY</p>
                  <p className={`font-semibold ${totalImpact.apyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalImpact.apyChange >= 0 ? '+' : ''}{totalImpact.apyChange.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-blue-700">Risk Change</p>
                  <p className={`font-semibold ${totalImpact.riskChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalImpact.riskChange >= 0 ? '+' : ''}{totalImpact.riskChange.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-blue-700">Total Reallocation</p>
                  <p className="font-semibold text-blue-600">
                    {totalImpact.totalReallocation.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rebalance Tab */}
      {activeTab === 'rebalance' && (
        <div className="space-y-6">
          {/* Pending Actions */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Actions</h3>
            
            {pendingActions.length > 0 ? (
              <div className="space-y-3">
                {pendingActions.map((action) => (
                  <div key={action.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          action.type === 'rebalance' ? 'bg-blue-100 text-blue-600' :
                          action.type === 'emergency' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {action.type === 'rebalance' && <ArrowRightLeft className="w-4 h-4" />}
                          {action.type === 'emergency' && <AlertTriangle className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{action.description}</h4>
                          <p className="text-sm text-gray-600">{action.impact}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          action.riskLevel === 'low' ? 'bg-green-100 text-green-600' :
                          action.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {action.riskLevel} risk
                        </div>
                        <p className="text-sm text-gray-500 mt-1">~{action.estimatedGas} ETH gas</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Estimated time: {action.timeToExecute}</span>
                      <div className="flex items-center space-x-2">
                        {action.status === 'pending' && (
                          <div className="flex items-center space-x-1 text-yellow-600">
                            <Pause className="w-3 h-3" />
                            <span>Pending</span>
                          </div>
                        )}
                        {action.status === 'executing' && (
                          <div className="flex items-center space-x-1 text-blue-600">
                            <Play className="w-3 h-3" />
                            <span>Executing</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p>Portfolio is balanced</p>
                <p className="text-sm">No rebalancing needed at this time</p>
              </div>
            )}
          </div>

          {/* Execute Controls */}
          {totalImpact.totalReallocation > 0 && (
            <div className="border border-gray-200 rounded-xl p-4">
              <h4 className="font-medium text-gray-900 mb-4">Execute Rebalance</h4>
              
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-600">Estimated Gas</span>
                  </div>
                  <p className="font-semibold text-gray-900">0.0023 ETH</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Percent className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-600">Max Slippage</span>
                  </div>
                  <p className="font-semibold text-gray-900">{rebalanceSettings.maxSlippage}%</p>
                </div>
              </div>

              <button
                onClick={executeRebalance}
                disabled={isExecuting}
                className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                  isExecuting 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isExecuting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    <span>Executing Rebalance...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Play className="w-4 h-4" />
                    <span>Execute Rebalance</span>
                  </div>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Automation Settings</h3>
            
            <div className="space-y-4">
              {/* Auto Rebalance Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h4 className="font-medium text-gray-900">Auto Rebalancing</h4>
                  <p className="text-sm text-gray-600">Automatically rebalance when threshold is reached</p>
                </div>
                <div className={`w-12 h-6 rounded-full transition-all duration-300 ${
                  rebalanceSettings.autoRebalanceEnabled ? 'bg-blue-500' : 'bg-gray-300'
                } relative cursor-pointer`}
                  onClick={() => setRebalanceSettings(prev => ({
                    ...prev,
                    autoRebalanceEnabled: !prev.autoRebalanceEnabled
                  }))}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 ${
                    rebalanceSettings.autoRebalanceEnabled ? 'left-6' : 'left-0.5'
                  }`} />
                </div>
              </div>

              {/* Rebalance Threshold */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Rebalance Threshold: {rebalanceSettings.rebalanceThreshold}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={rebalanceSettings.rebalanceThreshold}
                  onChange={(e) => setRebalanceSettings(prev => ({
                    ...prev,
                    rebalanceThreshold: parseFloat(e.target.value)
                  }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>1%</span>
                  <span>5%</span>
                  <span>10%</span>
                </div>
              </div>

              {/* Max Slippage */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Max Slippage: {rebalanceSettings.maxSlippage}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={rebalanceSettings.maxSlippage}
                  onChange={(e) => setRebalanceSettings(prev => ({
                    ...prev,
                    maxSlippage: parseFloat(e.target.value)
                  }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0.1%</span>
                  <span>2.5%</span>
                  <span>5%</span>
                </div>
              </div>

              {/* Gas Price Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gas Price</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['slow', 'standard', 'fast'] as const).map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setRebalanceSettings(prev => ({ ...prev, gasPrice: speed }))}
                      className={`p-3 rounded-lg border transition-all duration-200 ${
                        rebalanceSettings.gasPrice === speed
                          ? 'border-blue-300 bg-blue-50 text-blue-600'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium capitalize">{speed}</div>
                      <div className="text-xs text-gray-500">
                        {speed === 'slow' && '~5 min'}
                        {speed === 'standard' && '~2 min'}
                        {speed === 'fast' && '~30 sec'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Emergency Mode */}
              <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <h4 className="font-medium text-red-900">Emergency Mode</h4>
                    <p className="text-sm text-red-700">Pause all automated actions</p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full transition-all duration-300 ${
                  rebalanceSettings.emergencyMode ? 'bg-red-500' : 'bg-gray-300'
                } relative cursor-pointer`}
                  onClick={() => setRebalanceSettings(prev => ({
                    ...prev,
                    emergencyMode: !prev.emergencyMode
                  }))}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 ${
                    rebalanceSettings.emergencyMode ? 'left-6' : 'left-0.5'
                  }`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Shield className="w-4 h-4" />
          <span>All actions are secured by multi-sig</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">
            <RotateCcw className="w-4 h-4 mr-1 inline" />
            Reset
          </button>
          
          {totalImpact.totalReallocation > 0 && (
            <button 
              onClick={() => setActiveTab('rebalance')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Review Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessionalTradingPanel;
