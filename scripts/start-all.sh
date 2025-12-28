#!/bin/bash

# Lawsphere - Start All Services Script
# Usage: ./scripts/start-all.sh [--no-infra] [--web-only] [--ai-only]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Default flags
START_INFRA=true
START_WEB=true
START_AI=true

# Parse arguments
for arg in "$@"; do
    case $arg in
        --no-infra)
            START_INFRA=false
            ;;
        --web-only)
            START_AI=false
            START_INFRA=false
            ;;
        --ai-only)
            START_WEB=false
            START_INFRA=false
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --no-infra    Skip starting infrastructure (Podman containers)"
            echo "  --web-only    Only start the web application"
            echo "  --ai-only     Only start the AI service"
            echo "  --help        Show this help message"
            exit 0
            ;;
    esac
done

# Check if Docker/Podman is available
check_container_runtime() {
    if command -v docker &> /dev/null; then
        CONTAINER_CMD="docker"
        log_info "Using Docker"
    elif command -v podman &> /dev/null; then
        CONTAINER_CMD="podman"
        log_info "Using Podman"
        if ! podman machine list 2>/dev/null | grep -q "Currently running"; then
            log_warn "Podman machine is not running. Starting it..."
            podman machine start
        fi
    else
        log_error "Neither Docker nor Podman is installed. Please install one of them."
        exit 1
    fi
}

# Start infrastructure services using docker-compose
start_infrastructure() {
    log_info "Starting infrastructure services with docker-compose..."
    
    cd "$PROJECT_ROOT"
    
    # Start PostgreSQL and Redis using docker-compose
    docker-compose up -d postgres redis
    
    log_success "Waiting for services to be healthy..."
    sleep 5
    
    # Check if services are running
    if docker ps | grep -q "lawsphere-postgres"; then
        log_success "PostgreSQL is running"
    else
        log_error "Failed to start PostgreSQL"
        exit 1
    fi
    
    if docker ps | grep -q "lawsphere-redis"; then
        log_success "Redis is running"
    else
        log_error "Failed to start Redis"
        exit 1
    fi
    
    log_success "Infrastructure services started!"
    echo ""
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep lawsphere || true
    echo ""
}

# Start web application
start_web() {
    log_info "Starting web application..."
    cd "$PROJECT_ROOT/apps/web"
    
    # Check if .env exists
    if [ ! -f .env ]; then
        log_warn ".env file not found, copying from root..."
        cp "$PROJECT_ROOT/.env" .env 2>/dev/null || true
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ] || [ ! -d "../../node_modules" ]; then
        log_info "Installing dependencies..."
        cd "$PROJECT_ROOT"
        npm install
        cd "$PROJECT_ROOT/apps/web"
    fi
    
    # Generate Prisma client
    npx prisma generate 2>/dev/null || true
    
    log_info "Starting Next.js server on http://localhost:3000"
    npm run dev &
    WEB_PID=$!
    echo $WEB_PID > "$PROJECT_ROOT/.web.pid"
}

# Start AI service
start_ai() {
    log_info "Starting AI service..."
    cd "$PROJECT_ROOT/apps/ai-service"
    
    # Check if virtual environment exists
    if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
        log_info "Creating Python virtual environment..."
        python -m venv venv
    fi
    
    # Activate virtual environment
    if [ -d "venv" ]; then
        source venv/Scripts/activate 2>/dev/null || source venv/bin/activate
    elif [ -d ".venv" ]; then
        source .venv/Scripts/activate 2>/dev/null || source .venv/bin/activate
    fi
    
    # Install dependencies
    if [ -f "requirements.txt" ]; then
        log_info "Installing Python dependencies..."
        pip install -r requirements.txt -q
    fi
    
    log_info "Starting FastAPI server on http://localhost:8000"
    python main.py &
    AI_PID=$!
    echo $AI_PID > "$PROJECT_ROOT/.ai.pid"
}

# Main execution
main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                    LAWSPHERE STARTUP                      ║"
    echo "║               Legal-Tech AI Platform                      ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    
    cd "$PROJECT_ROOT"
    
    if [ "$START_INFRA" = true ]; then
        check_container_runtime
        start_infrastructure
    fi
    
    if [ "$START_WEB" = true ]; then
        start_web
    fi
    
    if [ "$START_AI" = true ]; then
        start_ai
    fi
    
    echo ""
    log_success "All services started!"
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║  Service URLs:                                            ║"
    echo "║  • Web App:      http://localhost:3000                    ║"
    echo "║  • AI Service:   http://localhost:8000                    ║"
    echo "║  • MinIO Console: http://localhost:9001                   ║"
    echo "║  • API Docs:     http://localhost:8000/docs               ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    echo "Press Ctrl+C to stop all services"
    
    # Wait for processes
    wait
}

main "$@"
