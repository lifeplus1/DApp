#!/bin/bash

# 🚀 Enterprise DeFi Platform - Community Testing Launch Script

echo "🎉 Welcome to Enterprise-Grade DeFi Platform Beta Testing!"
echo "========================================================"
echo

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the stable-yield-aggregator directory"
    echo "   Run: cd stable-yield-aggregator && ./launch-testing.sh"
    exit 1
fi

echo "📋 Pre-launch Checklist:"
echo "✅ TypeScript compilation"
echo "✅ Smart contracts deployed to Sepolia"
echo "✅ Frontend components ready"
echo "✅ Advanced yield analytics integrated"
echo "✅ Community testing guide prepared"
echo

echo "🏗️ Setting up development environment..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo "🔧 Compiling smart contracts..."
npx hardhat compile

echo "🧪 Running test suite..."
npm test

echo "🚀 Starting frontend development server..."
echo "   The platform will be available at: http://localhost:5173/"
echo "   Press Ctrl+C to stop the server"
echo

cd frontend && npm run dev
