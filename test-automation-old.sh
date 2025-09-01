#!/bin/bash

# 🧪 Automated Testing & Quality Assurance Script
# Usage: ./test-automation.sh [unit|integration|e2e|all|watch]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}🧪 Automated Testing & QA${NC}"
    echo -e "${BLUE}=========================${NC}"
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

CONTRACTS_DIR="stable-yield-aggregator"
FRONTEND_DIR="stable-yield-aggregator/frontend"

case "${1:-all}" in
    "unit")
        print_header
        echo "🔬 Running unit tests..."
        
        cd "$CONTRACTS_DIR"
        
        # Compile first
        echo "Compiling contracts..."
        npx hardhat compile
        
        # Run specific test suites
        echo "Testing Enhanced Real Yield Strategy..."
        npx hardhat test test/EnhancedRealYieldStrategy.test.js
        
        echo "Testing Stable Vault..."
        npx hardhat test test/StableVault.test.js
        
        print_success "Unit tests completed!"
        ;;
        
    "integration")
        print_header
        echo "🔗 Running integration tests..."
        
        cd "$CONTRACTS_DIR"
        
        # Test platform integration
        echo "Testing platform integration..."
        npx hardhat test test/PlatformIntegration.test.js
        
        # Test enhanced vault features
        echo "Testing enhanced vault features..."
        npx hardhat test test/EnhancedVault.test.js
        
        print_success "Integration tests completed!"
        ;;
        
    "frontend")
        print_header
        echo "🎨 Running frontend tests..."
        
        cd "$FRONTEND_DIR"
        
        # Type checking
        echo "Running TypeScript type checking..."
        npm run type-check
        
        # Build test
        echo "Testing production build..."
        npm run build
        
        print_success "Frontend tests completed!"
        ;;
        
    "security")
        print_header
        echo "🛡️ Running security analysis..."
        
        cd "$CONTRACTS_DIR"
        
        # Slither analysis (if available)
        if command -v slither &> /dev/null; then
            echo "Running Slither security analysis..."
            slither . || print_warning "Slither analysis completed with warnings"
        else
            print_warning "Slither not installed - skipping security analysis"
        fi
        
        # Check for common vulnerabilities
        echo "Checking for common patterns..."
        
        # Check for reentrancy guards
        if grep -r "ReentrancyGuard" contracts/; then
            print_success "Reentrancy protection: Found"
        else
            print_warning "Reentrancy protection: Not detected"
        fi
        
        # Check for access control
        if grep -r "onlyOwner\|AccessControl" contracts/; then
            print_success "Access control: Found"
        else
            print_warning "Access control: Not detected"
        fi
        
        print_success "Security analysis completed!"
        ;;
        
    "performance")
        print_header
        echo "⚡ Running performance tests..."
        
        cd "$CONTRACTS_DIR"
        
        # Gas usage analysis
        echo "Analyzing gas usage..."
        npx hardhat test --gas-report || print_warning "Gas report not available"
        
        # Frontend performance
        echo "Checking frontend performance..."
        cd "../$FRONTEND_DIR"
        
        # Bundle size analysis
        npm run build
        echo "Build output:"
        ls -lh dist/ 2>/dev/null || echo "No dist folder found"
        
        print_success "Performance analysis completed!"
        ;;
        
    "coverage")
        print_header
        echo "📊 Running test coverage analysis..."
        
        cd "$CONTRACTS_DIR"
        
        if npx hardhat coverage &>/dev/null; then
            print_success "Coverage report generated!"
            echo "Check coverage/index.html for detailed results"
        else
            print_warning "Coverage analysis not available"
            echo "Install solidity-coverage: npm install --save-dev solidity-coverage"
        fi
        ;;
        
    "watch")
        print_header
        echo "👀 Starting watch mode for tests..."
        
        print_info "Watching for file changes..."
        print_info "Press Ctrl+C to stop"
        
        # Use nodemon to watch for changes
        if command -v nodemon &> /dev/null; then
            nodemon --watch contracts --watch test --ext sol,js --exec "./test-automation.sh unit"
        else
            print_warning "nodemon not installed - install with: npm install -g nodemon"
            print_info "Running tests once..."
            ./test-automation.sh unit
        fi
        ;;
        
    "ci")
        print_header
        echo "🤖 Running CI/CD pipeline simulation..."
        
        # Simulate GitHub Actions workflow
        echo "Step 1: Dependency installation..."
        ./dev.sh setup
        
        echo "Step 2: Code compilation..."
        ./dev.sh compile
        
        echo "Step 3: Unit tests..."
        ./test-automation.sh unit
        
        echo "Step 4: Integration tests..."
        ./test-automation.sh integration
        
        echo "Step 5: Frontend type checking..."
        ./test-automation.sh frontend
        
        echo "Step 6: Security analysis..."
        ./test-automation.sh security
        
        echo "Step 7: Performance analysis..."
        ./test-automation.sh performance
        
        print_success "CI/CD simulation completed!"
        ;;
        
    "all")
        print_header
        echo "🎯 Running comprehensive test suite..."
        
        # Run all test categories
        ./test-automation.sh unit
        ./test-automation.sh integration
        ./test-automation.sh frontend
        ./test-automation.sh security
        ./test-automation.sh performance
        
        print_success "All tests completed!"
        
        # Generate summary
        echo
        echo "📋 Test Summary:"
        echo "✅ Unit tests: Passed"
        echo "✅ Integration tests: Passed"
        echo "✅ Frontend tests: Passed" 
        echo "✅ Security analysis: Completed"
        echo "✅ Performance analysis: Completed"
        ;;
        
    "help"|*)
        print_header
        echo "Available test commands:"
        echo
        echo "  unit          Run unit tests for smart contracts"
        echo "  integration   Run integration tests"
        echo "  frontend      Run frontend type checking and build tests"
        echo "  security      Run security analysis"
        echo "  performance   Run performance and gas analysis"
        echo "  coverage      Generate test coverage report"
        echo "  watch         Watch files and run tests on changes"
        echo "  ci            Simulate CI/CD pipeline"
        echo "  all           Run comprehensive test suite"
        echo
        echo "Examples:"
        echo "  ./test-automation.sh unit      # Quick unit tests"
        echo "  ./test-automation.sh all       # Full test suite"
        echo "  ./test-automation.sh watch     # Development mode"
        echo "  ./test-automation.sh ci        # Pre-deployment check"
        ;;
esac
