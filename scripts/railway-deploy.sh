#!/bin/bash
# Railway Deployment Helper
# Simplifies deployment and management of Lawsphere on Railway

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

function print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function print_error() {
    echo -e "${RED}❌ $1${NC}"
}

function print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if Railway CLI is installed
function check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI not found"
        echo "Install it with: npm install -g @railway/cli"
        exit 1
    fi
    print_success "Railway CLI is installed"
}

function show_menu() {
    print_header "Lawsphere Railway Deployment Helper"
    echo ""
    echo "1. Check Railway Login"
    echo "2. Deploy Current Branch"
    echo "3. SSH into Container"
    echo "4. View Service Logs"
    echo "5. Pull Ollama Model"
    echo "6. Check Service Health"
    echo "7. View Environment Variables"
    echo "8. Set Environment Variable"
    echo "9. Restart Services"
    echo "10. View Database Status"
    echo "11. Exit"
    echo ""
    read -p "Select option (1-11): " choice
}

function check_login() {
    print_header "Checking Railway Login"
    railway status
    print_success "Login check complete"
}

function deploy_branch() {
    print_header "Deploying to Railway"
    
    read -p "Enter environment (staging/production) [staging]: " env
    env=${env:-staging}
    
    echo "Deploying to $env..."
    
    # Push code to git first
    read -p "Push changes to git before deploy? (y/n) [y]: " push
    push=${push:-y}
    
    if [ "$push" = "y" ]; then
        print_info "Pushing to git..."
        git add .
        read -p "Enter commit message: " message
        git commit -m "$message"
        git push
        print_success "Pushed to git"
    fi
    
    # Deploy via Railway
    railway up
    print_success "Deployment initiated"
}

function ssh_container() {
    print_header "SSH into Railway Container"
    
    echo "Available services:"
    echo "1. web (Next.js frontend)"
    echo "2. ai-service (FastAPI backend)"
    echo "3. ollama (LLM service)"
    echo "4. postgres (Database)"
    echo "5. redis (Cache)"
    
    read -p "Select service (1-5): " service_num
    
    case $service_num in
        1) service="web" ;;
        2) service="ai-service" ;;
        3) service="ollama" ;;
        4) service="postgres" ;;
        5) service="redis" ;;
        *) print_error "Invalid selection"; return ;;
    esac
    
    print_info "Connecting to $service..."
    railway shell --service "$service"
}

function view_logs() {
    print_header "View Service Logs"
    
    echo "Available services:"
    echo "1. web (Next.js frontend)"
    echo "2. ai-service (FastAPI backend)"
    echo "3. ollama (LLM service)"
    
    read -p "Select service (1-3): " service_num
    
    case $service_num in
        1) service="web" ;;
        2) service="ai-service" ;;
        3) service="ollama" ;;
        *) print_error "Invalid selection"; return ;;
    esac
    
    print_info "Showing logs for $service (last 100 lines)..."
    railway logs --service "$service" --tail 100
}

function pull_ollama_model() {
    print_header "Pull Ollama Model"
    
    echo "Available models:"
    echo "1. qwen2 (7B) - RECOMMENDED"
    echo "2. qwen2:3b (3B) - Fast, lightweight"
    echo "3. qwen2:14b (14B) - Larger, slower"
    echo "4. llama2 (7B) - Good alternative"
    echo "5. mistral (7B) - Code/reasoning"
    echo "6. Custom model"
    
    read -p "Select model (1-6): " model_num
    
    case $model_num in
        1) model="qwen2" ;;
        2) model="qwen2:3b" ;;
        3) model="qwen2:14b" ;;
        4) model="llama2" ;;
        5) model="mistral" ;;
        6) read -p "Enter model name: " model ;;
        *) print_error "Invalid selection"; return ;;
    esac
    
    print_info "Pulling model: $model"
    print_info "This may take 5-15 minutes..."
    
    railway shell --service ollama << EOF
ollama pull $model
EOF
    
    print_success "Model pulled: $model"
}

function check_health() {
    print_header "Checking Service Health"
    
    print_info "Checking web service..."
    railway shell --service web << EOF
curl -s http://localhost:3000 | head -20
EOF
    
    print_info "Checking ai-service..."
    railway shell --service ai-service << EOF
curl -s http://localhost:8000/health
EOF
    
    print_info "Checking ollama..."
    railway shell --service ollama << EOF
curl -s http://localhost:11434/api/tags
EOF
}

function view_env_vars() {
    print_header "Environment Variables"
    railway variables
}

function set_env_var() {
    print_header "Set Environment Variable"
    
    read -p "Enter variable name: " var_name
    read -p "Enter variable value: " var_value
    
    railway variables set "$var_name" "$var_value"
    print_success "Variable set: $var_name"
}

function restart_services() {
    print_header "Restart Services"
    
    echo "Available services:"
    echo "1. All services"
    echo "2. web only"
    echo "3. ai-service only"
    echo "4. ollama only"
    
    read -p "Select (1-4): " choice
    
    case $choice in
        1)
            print_info "Restarting all services..."
            railway restart
            ;;
        2)
            print_info "Restarting web..."
            railway shell --service web << EOF
kill 1
EOF
            ;;
        3)
            print_info "Restarting ai-service..."
            railway shell --service ai-service << EOF
kill 1
EOF
            ;;
        4)
            print_info "Restarting ollama..."
            railway shell --service ollama << EOF
kill 1
EOF
            ;;
        *)
            print_error "Invalid selection"
            ;;
    esac
    
    print_success "Restart initiated"
}

function check_database() {
    print_header "Database Status"
    
    railway shell --service postgres << EOF
psql -c "\l" | grep lawsphere
psql -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" lawsphere
EOF
}

# Main loop
check_railway_cli

while true; do
    show_menu
    
    case $choice in
        1) check_login ;;
        2) deploy_branch ;;
        3) ssh_container ;;
        4) view_logs ;;
        5) pull_ollama_model ;;
        6) check_health ;;
        7) view_env_vars ;;
        8) set_env_var ;;
        9) restart_services ;;
        10) check_database ;;
        11)
            print_success "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid selection"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done
