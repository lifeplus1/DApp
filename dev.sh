#!/bin/bash

# 🚀 Enhanced DeFi Platform - Unified Development Script
# Usage: ./dev.sh [command]

set -e

PROJECT_ROOT="/Users/Chris/Projects/DApp"
CONTRACTS_DIR="$PROJECT_ROOT/stable-yield-aggregator"
FRONTEND_DIR="$PROJECT_ROOT/stable-yield-aggregator/frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}🚀 Enhanced DeFi Platform Dev${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Change to project root
cd "$PROJECT_ROOT"

case "${1:-help}" in
    "setup"|"install")
        print_header
        echo "📦 Installing all dependencies..."
        
        # Install contract dependencies
        echo "Installing smart contract dependencies..."
        cd "$CONTRACTS_DIR"
        npm install
        
        # Install frontend dependencies  
        echo "Installing frontend dependencies..."
        cd "$FRONTEND_DIR"
        npm install
        
        print_success "All dependencies installed!"
        ;;
        
    "compile")
        print_header
        echo "🔧 Compiling smart contracts..."
        cd "$CONTRACTS_DIR"
        npx hardhat clean
        npx hardhat compile
        print_success "Contracts compiled successfully!"
        ;;
        
    "test")
        print_header
        echo "🧪 Running comprehensive test suite..."
        cd "$CONTRACTS_DIR"
        npm run test
        print_success "All tests passed!"
        ;;
        
    "test-enhanced")
        print_header
        echo "🧪 Testing Enhanced Real Yield Strategy..."
        cd "$CONTRACTS_DIR"
        npx hardhat test test/EnhancedRealYieldStrategy.test.js
        ;;
        
    "deploy-local")
        print_header
        echo "🚀 Deploying to local hardhat network..."
        cd "$CONTRACTS_DIR"
        npx hardhat run scripts/deploy-enhanced-strategy.js
        print_success "Deployed to local network!"
        ;;
        
    "deploy-sepolia")
        print_header
        echo "🌐 Deploying to Sepolia testnet..."
        cd "$CONTRACTS_DIR"
        npx hardhat run scripts/deploy-enhanced-strategy.js --network sepolia
        print_success "Deployed to Sepolia!"
        ;;
        
    "frontend"|"dev")
        print_header
        echo "🎨 Starting frontend development server..."
        echo "Available at: http://localhost:5173"
        cd "$FRONTEND_DIR"
        npm run dev
        ;;
        
    "type-check")
        print_header
        echo "🔍 Running TypeScript type checking..."
        cd "$FRONTEND_DIR"
        npm run type-check
        print_success "No type errors found!"
        ;;
        
    "build")
        print_header
        echo "🏗️ Building production frontend..."
        cd "$FRONTEND_DIR"
        npm run build
        print_success "Frontend build completed!"
        ;;
        
    "full-dev")
        print_header
        echo "🚀 Full development workflow..."
        
        # Compile contracts
        echo "Step 1: Compiling contracts..."
        cd "$CONTRACTS_DIR"
        npx hardhat compile
        
        # Run tests
        echo "Step 2: Running tests..."
        npm run test
        
        # Type check frontend
        echo "Step 3: Type checking frontend..."
        cd "$FRONTEND_DIR"
        npm run type-check
        
        # Start frontend
        echo "Step 4: Starting development server..."
        npm run dev
        ;;
        
    "clean")
        print_header
        echo "🧹 Cleaning build artifacts..."
        cd "$CONTRACTS_DIR"
        npx hardhat clean
        cd "$FRONTEND_DIR"
        rm -rf dist
        print_success "Cleaned successfully!"
        ;;
        
    "status")
        print_header
        echo "📊 Project Status:"
        echo
        
        # Check if dependencies are installed
        if [ -d "$CONTRACTS_DIR/node_modules" ]; then
            print_success "Contract dependencies: Installed"
        else
            print_warning "Contract dependencies: Not installed (run ./dev.sh setup)"
        fi
        
        if [ -d "$FRONTEND_DIR/node_modules" ]; then
            print_success "Frontend dependencies: Installed"
        else
            print_warning "Frontend dependencies: Not installed (run ./dev.sh setup)"
        fi
        
        # Check if contracts are compiled
        if [ -d "$CONTRACTS_DIR/artifacts" ]; then
            print_success "Contracts: Compiled"
        else
            print_warning "Contracts: Not compiled (run ./dev.sh compile)"
        fi
        
        echo
        echo "🔗 Quick Links:"
        echo "   Frontend: http://localhost:5173"
        echo "   Docs: /docs/current/PLATFORM-OVERVIEW.md"
        echo "   Tests: /stable-yield-aggregator/test/"
        ;;
        
    "help"|*)
        print_header
        echo "Available commands:"
        echo
        echo "  setup          Install all dependencies"
        echo "  compile        Compile smart contracts"
        echo "  test           Run all tests"
        echo "  test-enhanced  Test Enhanced Real Yield Strategy"
        echo "  deploy-local   Deploy to local network"
        echo "  deploy-sepolia Deploy to Sepolia testnet"
        echo "  frontend       Start frontend dev server"
        echo "  dev            Alias for frontend"
        echo "  type-check     Run TypeScript checking"
        echo "  build          Build for production"
        echo "  full-dev       Complete development workflow"
        echo "  clean          Clean build artifacts"
        echo "  status         Show project status"
        echo "  help           Show this help"
        echo
        echo "Examples:"
        echo "  ./dev.sh setup         # Initial setup"
        echo "  ./dev.sh full-dev      # Compile, test, and start dev server"
        echo "  ./dev.sh deploy-sepolia # Deploy to testnet"
        echo "  ./dev.sh frontend      # Just start frontend"
        ;;
esac
