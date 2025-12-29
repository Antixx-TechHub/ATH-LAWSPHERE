#!/bin/bash
# Team Development Setup & Commands

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.dev.local.yml"
CONTAINER_PREFIX="lawsphere"

# ============ Helper Functions ============

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✓ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}✗ $1${NC}"; }

check_docker() {
  if ! command -v docker &> /dev/null; then
    log_error "Docker not found. Install from https://www.docker.com/products/docker-desktop"
    exit 1
  fi
  log_success "Docker installed"
}

check_docker_compose() {
  if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose not found"
    exit 1
  fi
  log_success "Docker Compose installed"
}

# ============ Main Commands ============

show_menu() {
  echo ""
  echo -e "${BLUE}Lawsphere Team Development${NC}"
  echo "=================================="
  echo "1. 🚀 Start development environment"
  echo "2. 🛑 Stop all services"
  echo "3. 🔄 Restart services"
  echo "4. 📋 View logs"
  echo "5. 🗄️  Database shell"
  echo "6. 🤖 AI service shell"
  echo "7. 🌐 Web service shell"
  echo "8. ✨ Clean everything (hard reset)"
  echo "9. 🧪 Run tests"
  echo "10. 📊 Health check"
  echo "11. 🔍 Debug: Check service connectivity"
  echo "0. Exit"
  echo ""
}

start_dev() {
  log_info "Starting Lawsphere development environment..."
  
  # Check if .env.development exists
  if [ ! -f .env.development ]; then
    log_warning ".env.development not found, creating from template..."
    cp .env.example .env.development || true
  fi
  
  docker-compose -f $DOCKER_COMPOSE_FILE up -d
  
  log_success "Services starting..."
  sleep 3
  
  # Wait for services to be healthy
  log_info "Waiting for services to be ready..."
  
  for i in {1..30}; do
    if docker-compose -f $DOCKER_COMPOSE_FILE ps | grep "healthy"; then
      log_success "All services are healthy!"
      echo ""
      echo -e "${GREEN}Development environment ready:${NC}"
      echo "  🌐 Web:       http://localhost:3000"
      echo "  🤖 AI API:    http://localhost:8000"
      echo "  🗄️  Database: localhost:5432"
      echo "  📦 Redis:     localhost:6379"
      echo ""
      return 0
    fi
    echo -n "."
    sleep 1
  done
  
  log_warning "Timeout waiting for services. Check logs with: ./scripts/team-dev.sh"
}

stop_dev() {
  log_info "Stopping all services..."
  docker-compose -f $DOCKER_COMPOSE_FILE down
  log_success "All services stopped"
}

restart_services() {
  log_info "Restarting services..."
  docker-compose -f $DOCKER_COMPOSE_FILE restart
  log_success "Services restarted"
}

view_logs() {
  echo "Select service to view logs:"
  echo "1. All services"
  echo "2. Web frontend"
  echo "3. AI service"
  echo "4. Database"
  echo "5. Redis"
  read -p "Choice (1-5): " choice
  
  case $choice in
    1) docker-compose -f $DOCKER_COMPOSE_FILE logs -f ;;
    2) docker-compose -f $DOCKER_COMPOSE_FILE logs -f web ;;
    3) docker-compose -f $DOCKER_COMPOSE_FILE logs -f ai-service ;;
    4) docker-compose -f $DOCKER_COMPOSE_FILE logs -f postgres ;;
    5) docker-compose -f $DOCKER_COMPOSE_FILE logs -f redis ;;
    *) log_error "Invalid choice" ;;
  esac
}

db_shell() {
  log_info "Connecting to PostgreSQL..."
  docker-compose -f $DOCKER_COMPOSE_FILE exec postgres psql -U lawsphere -d lawsphere_dev
}

ai_shell() {
  log_info "Opening shell in AI service..."
  docker-compose -f $DOCKER_COMPOSE_FILE exec ai-service /bin/bash
}

web_shell() {
  log_info "Opening shell in Web service..."
  docker-compose -f $DOCKER_COMPOSE_FILE exec web /bin/bash
}

clean_all() {
  log_warning "This will remove all containers, volumes, and data!"
  read -p "Type 'yes' to confirm: " confirm
  
  if [ "$confirm" != "yes" ]; then
    log_info "Cancelled"
    return
  fi
  
  log_info "Removing everything..."
  docker-compose -f $DOCKER_COMPOSE_FILE down -v
  log_success "Environment cleaned"
}

run_tests() {
  log_info "Running tests..."
  
  # Web tests
  log_info "Testing web frontend..."
  docker-compose -f $DOCKER_COMPOSE_FILE exec -T web npm run lint || log_warning "Web lint failed"
  
  # AI tests
  log_info "Testing AI service..."
  docker-compose -f $DOCKER_COMPOSE_FILE exec -T ai-service python -m py_compile $(find . -name "*.py" -type f) || log_warning "AI syntax check failed"
  
  log_success "Tests completed"
}

health_check() {
  echo ""
  echo -e "${BLUE}Health Check${NC}"
  echo "=============="
  
  # Check Docker
  log_info "Checking services..."
  docker-compose -f $DOCKER_COMPOSE_FILE ps
  
  # Check endpoints
  echo ""
  log_info "Testing endpoints..."
  
  # Web
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    log_success "Web frontend responding"
  else
    log_error "Web frontend not responding"
  fi
  
  # AI API
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    log_success "AI service API responding"
  else
    log_error "AI service API not responding"
  fi
  
  # Database
  if docker-compose -f $DOCKER_COMPOSE_FILE exec -T postgres pg_isready -U lawsphere > /dev/null 2>&1; then
    log_success "PostgreSQL responding"
  else
    log_error "PostgreSQL not responding"
  fi
  
  # Redis
  if docker-compose -f $DOCKER_COMPOSE_FILE exec -T redis redis-cli ping > /dev/null 2>&1; then
    log_success "Redis responding"
  else
    log_error "Redis not responding"
  fi
}

debug_connectivity() {
  echo ""
  echo -e "${BLUE}Debugging Service Connectivity${NC}"
  echo "================================"
  
  log_info "Testing web → AI API connectivity..."
  docker-compose -f $DOCKER_COMPOSE_FILE exec -T web curl -v http://ai-service:8000/health 2>&1 | grep -E "^(< |Connected)"
  
  log_info "Testing AI → Database connectivity..."
  docker-compose -f $DOCKER_COMPOSE_FILE exec -T ai-service psql -h postgres -U lawsphere -d lawsphere_dev -c "SELECT version();"
  
  log_info "Testing AI → Redis connectivity..."
  docker-compose -f $DOCKER_COMPOSE_FILE exec -T ai-service redis-cli -h redis ping
  
  log_success "Connectivity tests completed"
}

# ============ Main Loop ============

check_docker
check_docker_compose

while true; do
  show_menu
  read -p "Select option (0-11): " option
  
  case $option in
    1) start_dev ;;
    2) stop_dev ;;
    3) restart_services ;;
    4) view_logs ;;
    5) db_shell ;;
    6) ai_shell ;;
    7) web_shell ;;
    8) clean_all ;;
    9) run_tests ;;
    10) health_check ;;
    11) debug_connectivity ;;
    0) log_info "Goodbye!"; exit 0 ;;
    *) log_error "Invalid option" ;;
  esac
done
