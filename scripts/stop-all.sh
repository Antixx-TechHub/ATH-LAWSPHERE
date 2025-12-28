#!/bin/bash

# Lawsphere - Stop All Services Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

echo ""
echo "Stopping Lawsphere services..."
echo ""

# Stop web app
if [ -f "$PROJECT_ROOT/.web.pid" ]; then
    WEB_PID=$(cat "$PROJECT_ROOT/.web.pid")
    if kill -0 $WEB_PID 2>/dev/null; then
        log_info "Stopping web application (PID: $WEB_PID)..."
        kill $WEB_PID 2>/dev/null || true
    fi
    rm "$PROJECT_ROOT/.web.pid"
fi

# Stop AI service
if [ -f "$PROJECT_ROOT/.ai.pid" ]; then
    AI_PID=$(cat "$PROJECT_ROOT/.ai.pid")
    if kill -0 $AI_PID 2>/dev/null; then
        log_info "Stopping AI service (PID: $AI_PID)..."
        kill $AI_PID 2>/dev/null || true
    fi
    rm "$PROJECT_ROOT/.ai.pid"
fi

# Kill any remaining node/python processes for this project
pkill -f "node server.js" 2>/dev/null || true
pkill -f "apps/ai-service/main.py" 2>/dev/null || true

# Stop Docker containers using docker-compose
log_info "Stopping infrastructure containers..."
cd "$PROJECT_ROOT"
docker-compose stop postgres redis 2>/dev/null || true

echo ""
log_success "All services stopped!"
echo ""
