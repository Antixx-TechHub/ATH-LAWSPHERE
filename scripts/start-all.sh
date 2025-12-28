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

# Check if Podman is available
check_podman() {
    if ! command -v podman &> /dev/null; then
        log_error "Podman is not installed. Please install Podman first."
        exit 1
    fi
    
    if ! podman machine list 2>/dev/null | grep -q "Currently running"; then
        log_warn "Podman machine is not running. Starting it..."
        podman machine start
    fi
}

# Start infrastructure services
start_infrastructure() {
    log_info "Starting infrastructure services..."
    
    NETWORK="lawsphere-network"
    
    # Create network if not exists
    podman network create $NETWORK 2>/dev/null || true
    
    # Start PostgreSQL
    if ! podman ps --format "{{.Names}}" | grep -q "lawsphere-postgres"; then
        if podman ps -a --format "{{.Names}}" | grep -q "lawsphere-postgres"; then
            log_info "Starting existing PostgreSQL container..."
            podman start lawsphere-postgres
        else
            log_info "Creating PostgreSQL container..."
            podman run -d --name lawsphere-postgres \
                --network $NETWORK \
                -e POSTGRES_USER=lawsphere \
                -e POSTGRES_PASSWORD=lawsphere_secret \
                -e POSTGRES_DB=lawsphere \
                -p 5432:5432 \
                -v lawsphere-postgres-data:/var/lib/postgresql/data \
                pgvector/pgvector:pg16
        fi
    else
        log_info "PostgreSQL is already running"
    fi
    
    # Start Redis
    if ! podman ps --format "{{.Names}}" | grep -q "lawsphere-redis"; then
        if podman ps -a --format "{{.Names}}" | grep -q "lawsphere-redis"; then
            log_info "Starting existing Redis container..."
            podman start lawsphere-redis
        else
            log_info "Creating Redis container..."
            podman run -d --name lawsphere-redis \
                --network $NETWORK \
                -p 6379:6379 \
                redis:7-alpine redis-server --requirepass redis_secret
        fi
    else
        log_info "Redis is already running"
    fi
    
    # Start MinIO
    if ! podman ps --format "{{.Names}}" | grep -q "lawsphere-minio"; then
        if podman ps -a --format "{{.Names}}" | grep -q "lawsphere-minio"; then
            log_info "Starting existing MinIO container..."
            podman start lawsphere-minio
        else
            log_info "Creating MinIO container..."
            podman run -d --name lawsphere-minio \
                --network $NETWORK \
                -e MINIO_ROOT_USER=lawsphere \
                -e MINIO_ROOT_PASSWORD=lawsphere_secret \
                -p 9000:9000 \
                -p 9001:9001 \
                -v lawsphere-minio-data:/data \
                minio/minio:latest server /data --console-address ":9001"
        fi
    else
        log_info "MinIO is already running"
    fi
    
    log_success "Infrastructure services started!"
    echo ""
    podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep lawsphere
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
        check_podman
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
