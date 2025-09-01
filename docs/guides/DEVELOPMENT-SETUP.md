# 🛠️ Development Setup Guide

## Prerequisites

### Required Software

- **Node.js**: v18+ (recommend v20 LTS)
- **npm**: v9+ (comes with Node.js)
- **Git**: Latest version
- **MetaMask**: Browser extension for wallet integration

### Recommended Tools

- **VS Code**: With TypeScript and Solidity extensions
- **Hardhat**: Smart contract development framework
- **Ethers.js**: Web3 library for blockchain interaction

## 🚀 Quick Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd DApp
```

### 2. Install Dependencies

```bash
# Install main project dependencies
cd stable-yield-aggregator
npm install

# Install frontend dependencies  
cd frontend
npm install
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Add your configuration:
# - PRIVATE_KEY: Your wallet private key for deployment
# - INFURA_PROJECT_ID: Infura API key for network access
# - ETHERSCAN_API_KEY: For contract verification
```

### 4. Start Development Server

```bash
# From frontend directory
npm run dev
# Server starts at http://localhost:5173
```

## 🔧 Development Environment

### TypeScript Configuration

The project uses strict TypeScript settings for maximum safety:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Vite Configuration

Modern build tooling with hot module replacement:

```javascript
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Tailwind CSS Setup

Professional styling with custom configuration:

```javascript
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
      }
    }
  }
}
```

## 📦 Project Structure

text
stable-yield-aggregator/
├── contracts/                 # Smart contracts
│   ├── StableVault.sol       # Main vault contract
│   ├── EnhancedRealYieldStrategy.sol  # 21% APY strategy
│   └── mocks/                # Mock contracts for testing
├── frontend/                 # React TypeScript application
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility libraries
│   │   ├── constants/       # Configuration constants
│   │   └── types/           # TypeScript type definitions
│   ├── public/              # Static assets
│   └── dist/                # Build output
├── scripts/                 # Deployment scripts
├── test/                   # Test files
├── typechain-types/        # Generated contract types
└── docs/                   # Documentation

```text

## 🧪 Testing Setup

### Smart Contract Testing

```bash
# Run all contract tests
npx hardhat test

# Run specific test file
npx hardhat test test/EnhancedRealYieldStrategy.test.js

# Test with gas reporting
npx hardhat test --gas-reporter
```

### Frontend Testing

```bash
# Type checking
npm run type-check

# Build verification
npm run build

# Development server
npm run dev
```

### Network Testing

```bash
# Deploy to local network
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost

# Deploy to Sepolia testnet
npx hardhat run scripts/deploy-enhanced-strategy.js --network sepolia
```

## 🔗 Blockchain Integration

### Network Configuration

```javascript
// hardhat.config.js
networks: {
  sepolia: {
    url: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    accounts: [process.env.PRIVATE_KEY],
    chainId: 11155111
  }
}
```

### Contract Deployment

```bash
# Deploy Enhanced Strategy to Sepolia
npx hardhat run scripts/deploy-enhanced-strategy.js --network sepolia

# Verify contracts on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## 🎨 Frontend Development

### Component Development

```typescript
// Type-safe component with props
interface ComponentProps {
  title: string;
  value: number;
  onChange: (value: number) => void;
}

const Component: React.FC<ComponentProps> = ({ title, value, onChange }) => {
  // Implementation with full TypeScript safety
};
```

### Hook Development

```typescript
// Custom hook with proper typing
export const useEnhancedStrategy = (options: UseEnhancedStrategyOptions) => {
  const [metrics, setMetrics] = useState<EnhancedStrategyMetrics | null>(null);
  
  // Type-safe implementation
  return { metrics, loading, error, actions };
};
```

### State Management

```typescript
// Type-safe state with reducers
interface AppState {
  user: UserState;
  strategy: StrategyState;
  ui: UIState;
}

const reducer = (state: AppState, action: ActionType): AppState => {
  // Type-safe state updates
};
```

## 🛡️ Security Best Practices

### Smart Contract Security

- Use OpenZeppelin contracts for standard implementations
- Implement comprehensive access controls
- Add reentrancy guards where necessary
- Use SafeMath for arithmetic operations

### Frontend Security

- Validate all user inputs
- Implement proper error boundaries
- Use environment variables for sensitive data
- Sanitize data before display

### Web3 Security

- Verify contract addresses before interaction
- Validate transaction parameters
- Implement transaction signing verification
- Handle wallet connection errors gracefully

## 🚀 Deployment Process

### Development Deployment

1. Start local Hardhat network
2. Deploy contracts to local network
3. Start frontend development server
4. Test all functionality locally

### Testnet Deployment

1. Configure Sepolia network credentials
2. Deploy contracts to Sepolia
3. Verify contracts on Etherscan
4. Update frontend contract addresses
5. Test with MetaMask on Sepolia

### Production Deployment

1. Complete security audit
2. Deploy to Ethereum mainnet
3. Verify all contracts
4. Deploy frontend to production
5. Update DNS and domain configuration

## 🔧 Troubleshooting

### Common Issues

#### TypeScript Errors

```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
npm run type-check
```

#### Contract Deployment Issues

```bash
# Check account balance
npx hardhat console --network sepolia
# > ethers.provider.getBalance("YOUR_ADDRESS")

# Increase gas price if needed
# Update hardhat.config.js gas settings
```

#### Frontend Build Issues

```bash
# Clear build cache
rm -rf dist node_modules/.vite
npm install
npm run build
```

### Development Server Issues

```bash
# Reset development server
pkill -f "vite"
npm run dev
```

## 📚 Additional Resources

### Documentation

- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org)
- [React TypeScript Documentation](https://react-typescript-cheatsheet.netlify.app)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Learning Resources

- [Solidity Documentation](https://docs.soliditylang.org)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [ERC-4626 Specification](https://eips.ethereum.org/EIPS/eip-4626)

---

**Ready to build the future of DeFi with type safety and professional architecture!**

#### Last Updated: August 31, 2025
