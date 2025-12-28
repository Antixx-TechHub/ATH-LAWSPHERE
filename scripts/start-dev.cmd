@echo off
echo ========================================
echo Starting Lawsphere Development Stack
echo ========================================

cd /d "%~dp0"

echo.
echo [1/3] Starting infrastructure (Postgres, Redis)...
docker compose -f docker-compose.dev.yml up -d postgres redis

echo.
echo [2/3] Waiting for services to be healthy...
timeout /t 10

echo.
echo [3/3] Starting AI Service and Web App...
docker compose -f docker-compose.dev.yml up -d ai-service web

echo.
echo ========================================
echo Development Stack Started!
echo ========================================
echo.
echo Services:
echo   - Web App:     http://localhost:3000
echo   - AI Service:  http://localhost:8000
echo   - Postgres:    localhost:5432
echo   - Redis:       localhost:6379
echo.
echo Note: Ollama should be running on your host machine.
echo Make sure: ollama serve
echo.
echo View logs:
echo   docker compose -f docker-compose.dev.yml logs -f ai-service
echo   docker compose -f docker-compose.dev.yml logs -f web
echo.
pause
