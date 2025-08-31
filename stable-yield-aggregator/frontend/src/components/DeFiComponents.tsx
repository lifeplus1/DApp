import React from 'react';
import { useDeFi } from '../contexts/DeFiContext';
import { formatTokenAmount, truncateAddress } from '../utils/web3';

interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  onRemove: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({ id, type, message, onRemove }) => {
  const bgColor = type === 'success' ? 'bg-green-500' :
                  type === 'error' ? 'bg-red-500' :
                  'bg-blue-500';

  return (
    <div className={`${bgColor} text-white px-4 py-3 rounded mb-2 flex justify-between items-center`}>
      <span>{message}</span>
      <button onClick={() => onRemove(id)} className="ml-4 text-white hover:text-gray-200">
        ×
      </button>
    </div>
  );
};

const NotificationCenter: React.FC = () => {
  const { state, actions } = useDeFi();

  if (state.notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      {state.notifications.map(notification => (
        <Notification
          key={notification.id}
          id={notification.id}
          type={notification.type}
          message={notification.message}
          onRemove={actions.removeNotification}
        />
      ))}
    </div>
  );
};

export const WalletConnector: React.FC = () => {
  const { state, actions } = useDeFi();

  if (!state.account) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
        <p className="text-gray-600 mb-6">
          Connect your wallet to start earning optimized yields on your stablecoins
        </p>
        <button
          onClick={actions.connectWallet}
          disabled={state.isConnecting}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50"
        >
          {state.isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
        {state.error && (
          <p className="text-red-500 mt-4">{state.error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-100 rounded-lg p-4 mb-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">Connected Wallet</p>
          <p className="font-mono font-bold">{truncateAddress(state.account)}</p>
          <p className="text-sm text-gray-600">Sepolia Testnet</p>
        </div>
        <button
          onClick={actions.disconnect}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
};

export const BalanceCard: React.FC = () => {
  const { state, actions } = useDeFi();

  if (!state.account) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">💰 Your Balances</h3>
        <button
          onClick={actions.refreshBalances}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          🔄 Refresh
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">mUSDC Balance</p>
          <p className="text-xl font-bold text-green-600">
            {formatTokenAmount(state.balances.usdc)}
          </p>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">Vault Shares</p>
          <p className="text-xl font-bold text-blue-600">
            {formatTokenAmount(state.balances.vault)}
          </p>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">ETH Balance</p>
          <p className="text-xl font-bold text-purple-600">
            {parseFloat(formatTokenAmount(state.balances.eth, 18)).toFixed(4)}
          </p>
        </div>
      </div>
    </div>
  );
};

interface ActionCardProps {
  title: string;
  description: string;
  buttonText: string;
  buttonColor: string;
  onSubmit: (amount: string) => Promise<void>;
  disabled?: boolean;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  buttonText,
  buttonColor,
  onSubmit,
  disabled = false
}) => {
  const [amount, setAmount] = React.useState('');
  const { state } = useDeFi();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && !state.loading) {
      await onSubmit(amount);
      setAmount('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      
      <form onSubmit={handleSubmit}>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          className="w-full p-3 border border-gray-300 rounded mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={state.loading || disabled}
          step="0.000001"
          min="0"
        />
        <button
          type="submit"
          disabled={!amount || state.loading || disabled}
          className={`w-full ${buttonColor} text-white font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {state.loading ? 'Processing...' : buttonText}
        </button>
      </form>
    </div>
  );
};

export const StrategyGrid: React.FC = () => {
  const { state, actions } = useDeFi();

  if (state.strategies.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4">📊 Available Strategies</h3>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Loading strategies...</p>
          <button
            onClick={actions.refreshStrategies}
            className="text-blue-600 hover:text-blue-800"
          >
            Refresh Strategies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">📊 Available Strategies</h3>
        <button
          onClick={actions.refreshStrategies}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          🔄 Refresh
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.strategies.map((strategy) => (
          <div key={strategy.address} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-sm">{strategy.name}</h4>
              <span className={`px-2 py-1 rounded text-xs ${
                strategy.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {strategy.isActive ? '✅ Active' : '❌ Inactive'}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">APR:</span>
                <span className="font-bold text-green-600">
                  {Number(strategy.apr) / 100}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">TVL:</span>
                <span className="font-bold">
                  ${formatTokenAmount(strategy.tvl)}
                </span>
              </div>
              
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-mono">
                  {truncateAddress(strategy.address)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminPanel: React.FC = () => {
  const { state, actions } = useDeFi();
  
  // This would typically check if user is owner
  const [isOwner, setIsOwner] = React.useState(false);

  React.useEffect(() => {
    // Check if connected account is the owner
    // For demo purposes, we'll show admin panel
    setIsOwner(true);
  }, [state.account]);

  if (!state.account || !isOwner) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center">
        ⚙️ Admin Functions
        <span className="ml-2 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded">
          OWNER
        </span>
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={actions.harvest}
          disabled={state.loading}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
        >
          {state.loading ? 'Processing...' : '🌾 Harvest Yields'}
        </button>
        
        <button
          onClick={actions.refreshStrategies}
          disabled={state.loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
        >
          📊 Update Strategies
        </button>
      </div>
    </div>
  );
};

export { NotificationCenter };
