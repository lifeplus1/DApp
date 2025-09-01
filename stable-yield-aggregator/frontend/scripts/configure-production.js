const fs = require('fs');

async function updateFrontendConfig() {
    console.log("🎨 Updating Frontend Configuration for Mainnet");
    console.log("=============================================");
    
    // Load deployment addresses
    const deploymentFile = '../deployments-mainnet.json';
    if (!fs.existsSync(deploymentFile)) {
        throw new Error("Deployment file not found. Please run deploy-mainnet.js first.");
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    console.log(`Using deployment from: ${deployment.deploymentDate}`);
    
    // Create production deployment configuration
    const productionConfig = {
        network: {
            chainId: 1,
            name: "mainnet",
            rpcUrl: "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID",
            explorerUrl: "https://etherscan.io"
        },
        contracts: deployment.contracts,
        features: {
            multiStrategy: true,
            intelligentAutomation: true,
            realTimeYield: true,
            emergencyControls: true,
            feeManagement: true
        },
        deployment: {
            date: deployment.deploymentDate,
            deployer: deployment.deployer,
            version: "6.5.0-production"
        }
    };
    
    // Write production config
    const configPath = './src/deployments.json';
    fs.writeFileSync(configPath, JSON.stringify(productionConfig, null, 2));
    console.log(`✅ Production config written to: ${configPath}`);
    
    // Create environment configuration
    const envConfig = `# Production Environment Configuration - Phase 6 Day 5
VITE_NETWORK=mainnet
VITE_CHAIN_ID=1
VITE_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
VITE_EXPLORER_URL=https://etherscan.io

# Contract Addresses - Mainnet Deployment ${deployment.deploymentDate}
VITE_PORTFOLIO_MANAGER=${deployment.contracts.PortfolioManagerV2}
VITE_AUTOMATION_ENGINE=${deployment.contracts.IntelligentAutomationEngine}
VITE_FEE_CONTROLLER=${deployment.contracts.FeeController}
VITE_DISTRIBUTION_SPLITTER=${deployment.contracts.DistributionSplitter}

# Strategy Addresses
VITE_AAVE_STRATEGY=${deployment.contracts.AaveV3Strategy}
VITE_CURVE_STRATEGY=${deployment.contracts.CurveStableStrategy}
VITE_COMPOUND_STRATEGY=${deployment.contracts.CompoundStrategy}
VITE_UNISWAP_STRATEGY=${deployment.contracts.LiveUniswapV3Strategy}

# Production Features
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_AUTOMATION=true
VITE_ENABLE_EMERGENCY_CONTROLS=true
VITE_PRODUCTION_MODE=true

# Performance Optimization
VITE_CACHE_DURATION=300000
VITE_BATCH_SIZE=10
VITE_POLLING_INTERVAL=30000
`;

    fs.writeFileSync('./.env.production', envConfig);
    console.log(`✅ Production environment config written to: .env.production`);
    
    // Update package.json build scripts for production
    const packageJsonPath = './package.json';
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    packageJson.scripts = {
        ...packageJson.scripts,
        'build:production': 'vite build --mode production',
        'preview:production': 'vite preview --mode production',
        'deploy:production': 'npm run build:production && npm run deploy:s3'
    };
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`✅ Updated package.json with production scripts`);
    
    console.log("\n🎯 Frontend Configuration Complete!");
    console.log("===================================");
    console.log("📋 Next Steps:");
    console.log("1. Update your Infura Project ID in .env.production");
    console.log("2. Run 'npm run build:production' to build for mainnet");
    console.log("3. Deploy to your hosting service (Vercel, Netlify, S3)");
    console.log("4. Test the production build with mainnet contracts");
    
    return productionConfig;
}

// Create production smoke test
async function createSmokeTest() {
    console.log("\n🧪 Creating Production Smoke Test");
    console.log("=================================");
    
    const smokeTestContent = `import { describe, it, expect } from 'vitest';
import { ethers } from 'ethers';

// Production Smoke Tests - Phase 6 Day 5
describe('Production Smoke Tests', () => {
    const MAINNET_RPC = 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID';
    let provider: ethers.JsonRpcProvider;
    
    beforeAll(() => {
        provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    });
    
    it('should connect to mainnet', async () => {
        const network = await provider.getNetwork();
        expect(network.chainId).toBe(1n);
        expect(network.name).toBe('mainnet');
    });
    
    it('should verify PortfolioManagerV2 deployment', async () => {
        const deployments = await import('./src/deployments.json');
        const address = deployments.contracts.PortfolioManagerV2;
        
        const code = await provider.getCode(address);
        expect(code).not.toBe('0x');
        expect(code.length).toBeGreaterThan(100);
    });
    
    it('should verify IntelligentAutomationEngine deployment', async () => {
        const deployments = await import('./src/deployments.json');
        const address = deployments.contracts.IntelligentAutomationEngine;
        
        const code = await provider.getCode(address);
        expect(code).not.toBe('0x');
    });
    
    it('should verify all strategy deployments', async () => {
        const deployments = await import('./src/deployments.json');
        
        const strategies = [
            deployments.contracts.AaveV3Strategy,
            deployments.contracts.CurveStableStrategy,
            deployments.contracts.CompoundStrategy,
            deployments.contracts.LiveUniswapV3Strategy
        ];
        
        for (const address of strategies) {
            const code = await provider.getCode(address);
            expect(code).not.toBe('0x');
        }
    });
    
    it('should verify fee management system', async () => {
        const deployments = await import('./src/deployments.json');
        
        const feeControllerCode = await provider.getCode(deployments.contracts.FeeController);
        const splitterCode = await provider.getCode(deployments.contracts.DistributionSplitter);
        
        expect(feeControllerCode).not.toBe('0x');
        expect(splitterCode).not.toBe('0x');
    });
});`;
    
    fs.writeFileSync('./tests/smoke.production.test.ts', smokeTestContent);
    console.log(`✅ Production smoke test created: ./tests/smoke.production.test.ts`);
}

async function main() {
    try {
        const config = await updateFrontendConfig();
        await createSmokeTest();
        
        console.log("\n🎉 FRONTEND CONFIGURATION COMPLETE!");
        console.log("===================================");
        console.log("🚀 Ready for Production Launch!");
        
        return config;
    } catch (error) {
        console.error("❌ Frontend configuration failed:", error);
        throw error;
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { updateFrontendConfig, createSmokeTest };
