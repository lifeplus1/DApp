import React, { useState } from 'react';
import './App.css';
import { DeFiProvider, useDeFi } from './contexts/DeFiContext';
import { 
  WalletConnector, 
  BalanceCard, 
  ActionCard, 
  StrategyGrid, 
  AdminPanel,
  NotificationCenter 
} from './components/DeFiComponents';
import { YieldAnalytics } from './components/YieldAnalytics';
import { UniswapV3Dashboard } from './components/UniswapV3Dashboard';
import EnhancedYieldApp from './components/EnhancedYieldApp';

const DeFiApp: React.FC = () => {
  const { state, actions } = useDeFi();
  const [showEnhanced, setShowEnhanced] = useState(false);

  // Toggle between original and enhanced view
  if (showEnhanced) {
    return <EnhancedYieldApp />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <NotificationCenter />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🏦 Stable Yield Aggregator
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Enterprise-grade yield optimization with TypeScript safety
          </p>
          
          {/* Platform Toggle */}
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setShowEnhanced(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 flex items-center space-x-2"
            >
              <span className="text-xl">🚀</span>
              <span>Experience Real Uniswap V3 Yields (Phase 2)</span>
            </button>
          </div>
          
          <div className="mt-2 flex justify-center space-x-4 text-sm">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
              ✅ Type-Safe DeFi
            </span>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              🛡️ Audit-Ready
            </span>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
              🚀 Production-Ready
            </span>
          </div>
        </div>

        {/* Wallet Connection */}
        <WalletConnector />

        {state.account && (
          <>
            {/* Balance Overview */}
            <BalanceCard />

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <ActionCard
                title="💸 Deposit USDC"
                description="Deposit stablecoins to start earning optimized yields across multiple strategies."
                buttonText="Deposit USDC"
                buttonColor="bg-green-600 hover:bg-green-700"
                onSubmit={actions.deposit}
              />
              
              <ActionCard
                title="💳 Withdraw USDC"
                description="Withdraw your funds plus earned yields at any time with no lock-up period."
                buttonText="Withdraw USDC"
                buttonColor="bg-blue-600 hover:bg-blue-700"
                onSubmit={actions.withdraw}
              />
            </div>

            {/* Strategy Overview */}
            <StrategyGrid />

            {/* Admin Panel */}
            <div className="mt-8">
              <AdminPanel />
            </div>

            {/* Advanced Yield Analytics */}
            <div className="mt-8">
              <YieldAnalytics web3Provider={state.provider} />
            </div>

            {/* Real Uniswap V3 Strategy Dashboard */}
            <div className="mt-8">
              <UniswapV3Dashboard />
            </div>

            <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4">📈 Platform Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-green-50 rounded">
                  <p className="text-sm text-gray-600">Total Value Locked</p>
                  <p className="text-2xl font-bold text-green-600">
                    $1.2M
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded">
                  <p className="text-sm text-gray-600">Average APY</p>
                  <p className="text-2xl font-bold text-blue-600">
                    12.3%
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded">
                  <p className="text-sm text-gray-600">Active Strategies</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {state.strategies.filter(s => s.isActive).length}
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded">
                  <p className="text-sm text-gray-600">Safety Score</p>
                  <p className="text-2xl font-bold text-orange-600">
                    A+
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8">
              <h3 className="text-2xl font-bold mb-6 text-center">
                🚀 Why Choose Our Platform?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl mb-3">🛡️</div>
                  <h4 className="font-bold mb-2">Type-Safe Security</h4>
                  <p className="text-blue-100 text-sm">
                    Enterprise-grade TypeScript prevents costly DeFi errors
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-3">🔄</div>
                  <h4 className="font-bold mb-2">Auto-Optimization</h4>
                  <p className="text-blue-100 text-sm">
                    Intelligent yield routing across multiple protocols
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-3">💎</div>
                  <h4 className="font-bold mb-2">Professional Grade</h4>
                  <p className="text-blue-100 text-sm">
                    Audit-ready code with comprehensive testing
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>
            Built with ❤️ using TypeScript, React, and Solidity |{' '}
            <a href="#" className="text-blue-600 hover:text-blue-800">
              Documentation
            </a>{' '}
            |{' '}
            <a href="#" className="text-blue-600 hover:text-blue-800">
              GitHub
            </a>
          </p>
          <p className="mt-2">
            ⚠️ Testnet Only - Not for production use
          </p>
        </footer>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DeFiProvider>
      <DeFiApp />
    </DeFiProvider>
  );
};

export default App;
