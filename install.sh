#!/bin/bash

# 🎯 Enhanced DeFi Platform - One-Click Installation
# Usage: curl -sSL https://raw.githubusercontent.com/lifeplus1/DApp/main/install.sh | bash

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
    echo "║        🚀 ENHANCED DEFI PLATFORM INSTALLER 🚀           ║"
    echo "║            One-Click Setup & Deployment                  ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

check_requirements() {
    print_info "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is required but not installed"
        print_info "Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js 18+ is required (found v$NODE_VERSION)"
        exit 1
    fi
    print_success "Node.js $(node --version) detected"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is required but not installed"
        exit 1
    fi
    print_success "npm $(npm --version) detected"
    
    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git is required but not installed"
        print_info "Please install Git from https://git-scm.com/"
        exit 1
    fi
    print_success "Git $(git --version | cut -d' ' -f3) detected"
    
    # Check Python (for docs)
    if command -v python3 &> /dev/null; then
        print_success "Python 3 detected (docs server will work)"
    else
        print_warning "Python 3 not detected (docs server won't work)"
    fi
}

install_platform() {
    print_info "Installing Enhanced DeFi Platform..."
    
    # Clone or update repository
    if [ -d "DApp" ]; then
        print_info "Updating existing installation..."
        cd DApp
        git pull origin main
    else
        print_info "Cloning repository..."
        git clone https://github.com/lifeplus1/DApp.git
        cd DApp
    fi
    
    # Make scripts executable
    chmod +x *.sh
    # Configure git hooks
    if [ -d ".githooks" ]; then
        git config core.hooksPath .githooks || true
        chmod +x .githooks/* || true
        print_success "Git hooks configured"
    fi
    
    # Run setup
    print_info "Setting up dependencies..."
    ./dev.sh setup
    
    # Compile contracts
    print_info "Compiling smart contracts..."
    ./dev.sh compile
    
    # Run tests to verify
    print_info "Running verification tests..."
    ./test-automation.sh unit
    
    print_success "Installation completed successfully! 🎉"
}

show_next_steps() {
    echo
    echo -e "${PURPLE}🎯 Next Steps:${NC}"
    echo
    echo "1. 🎛️  Use the control dashboard:"
    echo -e "   ${BLUE}./control.sh${NC}"
    echo
    echo "2. 🚀  Start development:"
    echo -e "   ${BLUE}./dev.sh full-dev${NC}"
    echo
    echo "3. 🌐  Deploy to testnet:"
    echo -e "   ${BLUE}./dev.sh deploy-sepolia${NC}"
    echo
    echo "4. 📚  Browse documentation:"
    echo -e "   ${BLUE}./docs-automation.sh serve${NC}"
    echo
    echo -e "${GREEN}🚀 Platform Features:${NC}"
    echo "   ✅ 21% Dynamic APY yield strategies"
    echo "   ✅ Enterprise TypeScript architecture"
    echo "   ✅ Comprehensive automation suite"
    echo "   ✅ Live Sepolia testnet deployment"
    echo "   ✅ Professional React frontend"
    echo
    echo -e "${CYAN}🌐 Quick Links:${NC}"
    echo "   • Frontend: http://localhost:5173 (after running dev)"
    echo "   • Documentation: http://localhost:8080 (after running docs server)"
    echo "   • Repository: https://github.com/lifeplus1/DApp"
    echo
    print_success "Welcome to the future of DeFi development! 🚀"
}

main() {
    print_banner
    
    print_info "Starting Enhanced DeFi Platform installation..."
    echo
    
    check_requirements
    echo
    
    install_platform
    echo
    
    show_next_steps
}

# Run main function
main "$@"
