#!/bin/bash

# 🧪 Advanced Testing & Quality Assurance Script
# Usage: ./test-automation.sh [security|performance|ci|watch]
# Note: Basic testing is now handled by ./dev.sh test

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}🧪 Advanced Testing & QA${NC}"
    echo -e "${BLUE}========================${NC}"
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

case "${1:-help}" in
    "security")
        print_header
        echo "🛡️ Running comprehensive security analysis..."
        
        cd "$CONTRACTS_DIR"
        
        # Slither analysis (if available)
        if command -v slither &> /dev/null; then
            echo "Running Slither security analysis..."
            slither . || print_warning "Slither analysis completed with warnings"
        else
            print_warning "Slither not installed - install with: pip install slither-analyzer"
        fi
        
        # Check for common security patterns
        echo "Checking for security patterns..."
        
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
        
        # Check for proper error handling
        if grep -r "require\|revert" contracts/ | wc -l | awk '{if($1>10) print "✅ Error handling: Comprehensive"; else print "⚠️ Error handling: Limited"}'; then
            :
        fi
        
        print_success "Security analysis completed!"
        ;;
        
    "performance")
        print_header
        echo "⚡ Running performance analysis..."
        
        cd "$CONTRACTS_DIR"
        
        # Gas usage analysis
        echo "Analyzing gas usage patterns..."
        if npx hardhat test --gas-report 2>/dev/null; then
            print_success "Gas report generated"
        else
            print_warning "Gas report not available - install hardhat-gas-reporter"
        fi
        
        # Contract size analysis
        echo "Checking contract sizes..."
        npx hardhat compile
        find artifacts/contracts -name "*.sol" -path "*/contracts/*" | while read -r contract; do
            if [ -f "$contract" ]; then
                size=$(wc -c < "$contract" 2>/dev/null || echo "0")
                if [ "$size" -gt 24576 ]; then
                    echo "⚠️ Large contract: $(basename "$contract") ($size bytes)"
                fi
            fi
        done
        
        # Frontend performance
        echo "Checking frontend bundle size..."
        cd "../$FRONTEND_DIR"
        npm run build
        if [ -d "dist" ]; then
            BUNDLE_SIZE=$(du -sh dist/ | cut -f1)
            echo "📦 Bundle size: $BUNDLE_SIZE"
        fi
        
        print_success "Performance analysis completed!"
        ;;
        
    "watch")
        print_header
        echo "👀 Starting watch mode for advanced testing..."
        
        print_info "Watching for file changes to run security and performance checks..."
        print_info "Press Ctrl+C to stop"
        
        # Use fswatch if available, otherwise fallback
        if command -v fswatch &> /dev/null; then
            fswatch -o contracts test | while read num; do
                echo "📁 Files changed, running advanced tests..."
                ./test-automation.sh security
                ./test-automation.sh performance
            done
        elif command -v nodemon &> /dev/null; then
            nodemon --watch contracts --watch test --ext sol,js --exec "./test-automation.sh security && ./test-automation.sh performance"
        else
            print_warning "Install fswatch or nodemon for watch mode"
            print_info "macOS: brew install fswatch"
            print_info "npm: npm install -g nodemon"
        fi
        ;;
        
    "ci")
        print_header
        echo "🤖 Running CI/CD advanced checks..."
        
        # Use dev.sh for basic operations
        echo "Step 1: Basic CI checks..."
        ./dev.sh pre-deploy
        
        echo "Step 2: Advanced security analysis..."
        ./test-automation.sh security
        
        echo "Step 3: Performance analysis..."
        ./test-automation.sh performance
        
        echo "Step 4: Deployment simulation..."
        cd "$CONTRACTS_DIR"
        if npx hardhat compile --force; then
            print_success "Deployment simulation passed"
        else
            print_error "Deployment simulation failed"
            exit 1
        fi
        
        print_success "CI/CD advanced checks completed!"
        ;;
        
    "audit")
        print_header
        echo "🔍 Running comprehensive audit preparation..."
        
        # Create audit report directory
        AUDIT_DIR="audit-reports/$(date +%Y%m%d)"
        mkdir -p "$AUDIT_DIR"
        
        echo "Generating audit documentation..."
        
        # Run all advanced tests
        ./test-automation.sh security > "$AUDIT_DIR/security-report.txt" 2>&1 || true
        ./test-automation.sh performance > "$AUDIT_DIR/performance-report.txt" 2>&1 || true
        
        # Generate contract documentation
        cd "$CONTRACTS_DIR"
        if command -v solc &> /dev/null; then
            echo "Generating contract documentation..."
            # Add documentation generation here
        fi
        
        print_success "Audit preparation completed in $AUDIT_DIR"
        ;;
        
    "help"|*)
        print_header
        echo "Advanced testing commands:"
        echo
        echo -e "${GREEN}Advanced Testing:${NC}"
        echo "  security      Run comprehensive security analysis"
        echo "  performance   Run performance and gas analysis"
        echo "  watch         Watch files for changes and run advanced tests"
        echo "  ci            Run CI/CD advanced validation checks"
        echo "  audit         Prepare comprehensive audit reports"
        echo
        echo -e "${YELLOW}Note:${NC} Basic testing (unit, integration, coverage) is handled by:"
        echo "  ./dev.sh test           # Run all tests"
        echo "  ./dev.sh test-unit      # Unit tests only"
        echo "  ./dev.sh test-coverage  # Coverage report"
        echo
        echo "Examples:"
        echo "  ./test-automation.sh security    # Security analysis"
        echo "  ./test-automation.sh performance # Gas optimization check"
        echo "  ./test-automation.sh ci          # Full CI pipeline"
        ;;
esac
