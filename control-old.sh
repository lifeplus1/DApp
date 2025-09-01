#!/bin/bash

# 🎛️ Enhanced DeFi Platform - Master Control Dashboard
# Usage: ./control.sh [command] or just ./control.sh for interactive mode

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                🚀 ENHANCED DEFI PLATFORM 🚀             ║"
    echo "║                   Master Control Panel                   ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}$(echo "$1" | sed 's/./=/g')${NC}"
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

print_info() {
    echo -e "${CYAN}ℹ️ $1${NC}"
}

show_status() {
    print_header "📊 Platform Status Dashboard"
    echo
    
    # Git status
    echo -e "${PURPLE}🔄 Repository Status:${NC}"
    BRANCH=$(git branch --show-current)
    LAST_COMMIT=$(git log -1 --pretty=format:'%h - %s (%cr)')
    echo "   Branch: $BRANCH"
    echo "   Last commit: $LAST_COMMIT"
    
    # Check if repo is clean
    if git diff --quiet && git diff --staged --quiet; then
        print_success "   Working directory clean"
    else
        print_warning "   Uncommitted changes present"
    fi
    echo
    
    # Dependencies status
    echo -e "${PURPLE}📦 Dependencies:${NC}"
    if [ -d "stable-yield-aggregator/node_modules" ]; then
        print_success "   Smart contracts: Installed"
    else
        print_warning "   Smart contracts: Not installed"
    fi
    
    if [ -d "stable-yield-aggregator/frontend/node_modules" ]; then
        print_success "   Frontend: Installed"
    else
        print_warning "   Frontend: Not installed"
    fi
    echo
    
    # Build status
    echo -e "${PURPLE}🏗️ Build Status:${NC}"
    if [ -d "stable-yield-aggregator/artifacts" ]; then
        print_success "   Smart contracts: Compiled"
    else
        print_warning "   Smart contracts: Not compiled"
    fi
    
    if [ -d "stable-yield-aggregator/frontend/dist" ]; then
        print_success "   Frontend: Built"
    else
        print_info "   Frontend: Development mode"
    fi
    echo
    
    # Deployment status
    echo -e "${PURPLE}🌐 Deployment Status:${NC}"
    if [ -f "stable-yield-aggregator/deployments/sepolia-deployment.json" ]; then
        print_success "   Sepolia testnet: Deployed"
        STRATEGY_ADDR=$(grep -o '"EnhancedRealYieldStrategy":[^}]*"address":"[^"]*"' stable-yield-aggregator/deployments/sepolia-deployment.json | grep -o '0x[^"]*' | head -1)
        echo "   Strategy: $STRATEGY_ADDR"
    else
        print_info "   Sepolia testnet: Not deployed"
    fi
    echo
    
    # Documentation status
    echo -e "${PURPLE}📚 Documentation:${NC}"
    DOC_COUNT=$(find docs -name "*.md" | wc -l | xargs)
    echo "   Files: $DOC_COUNT markdown files"
    
    if [ -d "docs/current" ] && [ -d "docs/guides" ]; then
        print_success "   Structure: Organized"
    else
        print_warning "   Structure: Needs organization"
    fi
    echo
    
    # Quick metrics
    echo -e "${PURPLE}📈 Quick Metrics:${NC}"
    CONTRACTS=$(find stable-yield-aggregator/contracts -name "*.sol" | wc -l | xargs)
    TESTS=$(find stable-yield-aggregator/test -name "*.js" | wc -l | xargs)
    echo "   Smart contracts: $CONTRACTS files"
    echo "   Test files: $TESTS files"
    echo
}

show_menu() {
    print_banner
    show_status
    
    print_header "🎛️ Available Commands"
    echo
    echo -e "${GREEN}📦 Setup & Dependencies:${NC}"
    echo "  1)  setup           Install all dependencies"
    echo "  2)  clean           Clean build artifacts"
    echo
    echo -e "${BLUE}🔧 Development:${NC}"
    echo "  3)  dev             Start frontend development"
    echo "  4)  dev:full        Full development workflow"
    echo "  5)  compile         Compile smart contracts"
    echo "  6)  type-check      Run TypeScript checking"
    echo
    echo -e "${YELLOW}🧪 Testing:${NC}"
    echo "  7)  test            Run all tests"
    echo "  8)  test:unit       Run unit tests only"
    echo "  9)  test:watch      Watch mode testing"
    echo "  10) test:coverage   Generate coverage report"
    echo
    echo -e "${PURPLE}🌐 Deployment:${NC}"
    echo "  11) deploy:local    Deploy to local network"
    echo "  12) deploy:sepolia  Deploy to Sepolia testnet"
    echo "  13) verify          Verify deployment"
    echo
    echo -e "${CYAN}📚 Documentation:${NC}"
    echo "  14) docs:serve      Start docs server"
    echo "  15) docs:update     Update documentation"
    echo "  16) docs:check      Check docs quality"
    echo
    echo -e "${RED}🔄 Git & Release:${NC}"
    echo "  17) git:status      Show git status"
    echo "  18) git:commit      Quick commit"
    echo "  19) git:release     Create release"
    echo
    echo -e "${GREEN}🎯 Quick Actions:${NC}"
    echo "  20) quick-start     First-time setup"
    echo "  21) pre-deploy      Pre-deployment check"
    echo "  22) health-check    Full system check"
    echo
    echo "  0)  exit            Exit control panel"
    echo
}

interactive_mode() {
    while true; do
        show_menu
        echo -n "Enter your choice [0-22]: "
        read -r choice
        echo
        
        case $choice in
            1) ./dev.sh setup ;;
            2) ./dev.sh clean ;;
            3) ./dev.sh dev ;;
            4) ./dev.sh full-dev ;;
            5) ./dev.sh compile ;;
            6) ./dev.sh type-check ;;
            7) ./test-automation.sh all ;;
            8) ./test-automation.sh unit ;;
            9) ./test-automation.sh watch ;;
            10) ./test-automation.sh coverage ;;
            11) ./dev.sh deploy-local ;;
            12) ./dev.sh deploy-sepolia ;;
            13) ./dev.sh status ;;
            14) ./docs-automation.sh serve ;;
            15) ./docs-automation.sh update ;;
            16) ./docs-automation.sh check ;;
            17) ./git-flow.sh status ;;
            18) 
                echo "Enter commit message:"
                read -r message
                ./git-flow.sh quick "$message"
                ;;
            19) 
                echo "Enter release version (e.g., v2.1.0):"
                read -r version
                ./git-flow.sh release "$version"
                ;;
            20) quick_start ;;
            21) pre_deployment_check ;;
            22) health_check ;;
            0) 
                print_info "Goodbye! 👋"
                exit 0 
                ;;
            *) 
                print_error "Invalid choice. Please try again."
                echo
                read -p "Press Enter to continue..."
                ;;
        esac
        
        echo
        read -p "Press Enter to continue..."
        clear
    done
}

quick_start() {
    print_header "🚀 Quick Start - First Time Setup"
    
    echo "Setting up your Enhanced DeFi Platform..."
    
    # Install dependencies
    print_info "Step 1: Installing dependencies..."
    ./dev.sh setup
    
    # Compile contracts
    print_info "Step 2: Compiling smart contracts..."
    ./dev.sh compile
    
    # Run tests
    print_info "Step 3: Running tests to verify setup..."
    ./test-automation.sh unit
    
    # Generate documentation
    print_info "Step 4: Generating documentation..."
    ./docs-automation.sh generate
    
    print_success "Quick start completed! 🎉"
    print_info "Next: Run './control.sh' and choose option 4 (dev:full) to start developing"
}

pre_deployment_check() {
    print_header "🔍 Pre-Deployment Check"
    
    echo "Running comprehensive pre-deployment checks..."
    
    # Run all tests
    print_info "Running full test suite..."
    ./test-automation.sh all
    
    # Type check frontend
    print_info "Type checking frontend..."
    ./dev.sh type-check
    
    # Security check
    print_info "Running security analysis..."
    ./test-automation.sh security
    
    # Documentation check
    print_info "Verifying documentation..."
    ./docs-automation.sh check
    
    print_success "Pre-deployment check completed!"
    print_info "Platform is ready for deployment 🚀"
}

health_check() {
    print_header "🏥 System Health Check"
    
    echo "Performing comprehensive system health check..."
    
    # Check Node.js version
    NODE_VERSION=$(node --version 2>/dev/null || echo "not installed")
    print_info "Node.js version: $NODE_VERSION"
    
    # Check npm version
    NPM_VERSION=$(npm --version 2>/dev/null || echo "not installed")
    print_info "npm version: $NPM_VERSION"
    
    # Check Git status
    if git --version &>/dev/null; then
        print_success "Git: Available"
    else
        print_error "Git: Not available"
    fi
    
    # Check Python (for docs server)
    if python3 --version &>/dev/null; then
        print_success "Python 3: Available"
    else
        print_warning "Python 3: Not available (docs server won't work)"
    fi
    
    # Check available disk space
    DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}')
    print_info "Disk usage: $DISK_USAGE"
    
    # Check network connectivity
    if ping -c 1 google.com &>/dev/null; then
        print_success "Network: Connected"
    else
        print_warning "Network: Limited connectivity"
    fi
    
    print_success "Health check completed!"
}

# Main execution
if [ $# -eq 0 ]; then
    # Interactive mode
    clear
    interactive_mode
else
    # Direct command execution
    case "$1" in
        "status") show_status ;;
        "quick-start") quick_start ;;
        "pre-deploy") pre_deployment_check ;;
        "health") health_check ;;
        "help")
            print_banner
            echo "Usage: ./control.sh [command]"
            echo
            echo "Available commands:"
            echo "  status      Show platform status"
            echo "  quick-start First-time setup"
            echo "  pre-deploy  Pre-deployment check"
            echo "  health      System health check"
            echo "  help        Show this help"
            echo
            echo "Run './control.sh' without arguments for interactive mode"
            ;;
        *)
            print_error "Unknown command: $1"
            print_info "Run './control.sh help' for available commands"
            exit 1
            ;;
    esac
fi
