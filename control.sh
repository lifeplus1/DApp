#!/bin/bash

# 🎛️ Enhanced DeFi Platform - Simplified Control Dashboard
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
    echo "║                  Simplified Control Panel                ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️ $1${NC}"
}

show_status() {
    echo -e "${PURPLE}📊 Platform Status Dashboard${NC}"
    echo
    
    # Quick status using dev.sh
    ./dev.sh status
}

show_menu() {
    print_banner
    show_status
    
    echo
    echo -e "${BLUE}🎛️ Quick Actions${NC}"
    echo
    echo -e "${GREEN}🚀 Development:${NC}"
    echo "  1)  🏁 First-time setup      (./dev.sh setup)"
    echo "  2)  💻 Start development     (./dev.sh full-dev)"
    echo "  3)  🎨 Frontend only         (./dev.sh frontend)"
    echo "  4)  🔧 Compile contracts     (./dev.sh compile)"
    echo
    echo -e "${YELLOW}🧪 Testing:${NC}"
    echo "  5)  🧪 Run all tests         (./dev.sh test)"
    echo "  6)  📊 Test coverage         (./dev.sh test-coverage)"
    echo "  7)  🔍 Pre-deploy checks     (./dev.sh pre-deploy)"
    echo
    echo -e "${PURPLE}🌐 Deployment:${NC}"
    echo "  8)  🏠 Deploy locally        (./dev.sh deploy-local)"
    echo "  9)  🌐 Deploy to Sepolia     (./dev.sh deploy-sepolia)"
    echo
    echo -e "${CYAN}📚 Documentation & Tools:${NC}"
    echo "  10) 📚 Documentation server  (./dev.sh docs)"
    echo "  11) 🧹 Clean artifacts       (./dev.sh clean)"
    echo "  12) 📊 Project status        (./dev.sh status)"
    echo
    echo "  0)  🚪 Exit"
    echo
}

interactive_mode() {
    while true; do
        clear
        show_menu
        echo -n "Enter your choice [0-12]: "
        read -r choice
        echo
        
        case $choice in
            1) ./dev.sh setup ;;
            2) ./dev.sh full-dev ;;
            3) ./dev.sh frontend ;;
            4) ./dev.sh compile ;;
            5) ./dev.sh test ;;
            6) ./dev.sh test-coverage ;;
            7) ./dev.sh pre-deploy ;;
            8) ./dev.sh deploy-local ;;
            9) ./dev.sh deploy-sepolia ;;
            10) ./dev.sh docs ;;
            11) ./dev.sh clean ;;
            12) ./dev.sh status ;;
            0) 
                print_info "Thanks for using Enhanced DeFi Platform! 👋"
                exit 0 
                ;;
            *) 
                echo -e "${RED}❌ Invalid choice. Please try again.${NC}"
                echo
                read -p "Press Enter to continue..."
                ;;
        esac
        
        if [ "$choice" != "0" ] && [ "$choice" != "2" ] && [ "$choice" != "3" ] && [ "$choice" != "10" ]; then
            echo
            read -p "Press Enter to continue..."
        fi
    done
}

# Main execution
if [ $# -eq 0 ]; then
    # Interactive mode
    interactive_mode
else
    # Direct command execution - delegate to dev.sh
    case "$1" in
        "status"|"help")
            ./dev.sh "$1"
            ;;
        *)
            echo -e "${BLUE}Enhanced DeFi Platform Control${NC}"
            echo "For direct commands, use: ./dev.sh [command]"
            echo "For interactive mode, run: ./control.sh"
            echo
            ./dev.sh help
            ;;
    esac
fi
