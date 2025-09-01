import React, { useState } from 'react';
import './App.css';
import { DeFiProvider, useDeFi } from './contexts/DeFiContext';
import ProductionDeFiInterface from './components/ProductionDeFiInterface';
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
import Phase53LiveYieldDashboard from './components/Phase53LiveYieldDashboard';
import AdvancedAnalytics from './components/AdvancedAnalytics';

const DeFiApp: React.FC = () => {
  const { state, actions } = useDeFi();
  const [currentInterface, setCurrentInterface] = useState<string>('production');

  // Phase 6 Day 4: Production UI/UX Interface (Default)
  if (currentInterface === 'production') {
    return <ProductionDeFiInterface />;
  }

  // Phase 5.3: Advanced Analytics dashboard
  if (currentInterface === 'analytics') {
    return <AdvancedAnalytics />;
  }

  // Phase 5.3: Live yield dashboard
  if (currentInterface === 'live-yield') {
    return <Phase53LiveYieldDashboard />;
  }

  // Enhanced DeFi Platform
  if (currentInterface === 'enhanced') {
    return <EnhancedYieldApp />;
  }

  // Original Interface (Legacy)
  return (
    <div className="min-h-screen bg-gray-100">
      <NotificationCenter />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🏦 Enterprise DeFi Platform
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Phase 6 Day 4: Production UI/UX & Comprehensive Testing
          </p>
          
          {/* Platform Toggle */}
          <div className="flex justify-center mb-4 space-x-4 flex-wrap gap-2">
            <button
              onClick={() => setCurrentInterface('production')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center space-x-2"
            >
              <span className="text-xl">🎨</span>
              <span>Production Interface (Phase 6.4)</span>
            </button>
            
            <button
              onClick={() => setCurrentInterface('enhanced')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 flex items-center space-x-2"
            >
              <span className="text-xl">🚀</span>
              <span>Enhanced DeFi</span>
            </button>
            
            <button
              onClick={() => setCurrentInterface('live-yield')}
              className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-all duration-300 flex items-center space-x-2"
            >
              <span className="text-xl">⚡</span>
              <span>Live Yields</span>
            </button>
            
            <button
              onClick={() => setCurrentInterface('analytics')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 flex items-center space-x-2"
            >
              <span className="text-xl">📈</span>
              <span>Analytics</span>
            </button>

            <button
              onClick={() => setCurrentInterface('legacy')}
              className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-gray-600 hover:to-gray-700 transition-all duration-300 flex items-center space-x-2"
            >
              <span className="text-xl">🏛️</span>
              <span>Legacy View</span>
            </button>
          </div>
          
          <div className="mt-4 flex justify-center space-x-4 text-sm flex-wrap gap-2">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              🎨 Production UI/UX (Phase 6.4)
            </span>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
              ✅ Enterprise Portfolio Dashboard
            </span>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
              🏢 Institutional Analytics
            </span>
            <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
              � Mobile-Responsive Design
            </span>
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full">
              � Professional Trading Tools
            </span>
            <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
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
              {state.provider && <YieldAnalytics web3Provider={state.provider} />}
            </div>

            {/* Real Uniswap V3 Strategy Dashboard */}
            <div className="mt-8">
              <UniswapV3Dashboard />
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>
            Built with ❤️ using TypeScript, React, and Solidity |{' '}
            Phase 6 Day 4: Production UI/UX Complete
          </p>
          <p className="mt-2">
            🎨 Enterprise-grade interface with institutional features
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
