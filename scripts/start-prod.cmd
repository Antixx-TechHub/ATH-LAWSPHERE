@echo off
echo ========================================
echo Starting Lawsphere Production Stack
echo ========================================

cd /d "%~dp0.."

REM Check if required environment variables are set
if "%GROQ_API_KEY%"=="" (
    echo WARNING: GROQ_API_KEY not set in environment!
    echo The AI service may not work correctly without an API key.
    echo.
)

echo.
echo [1/3] Starting infrastructure (Postgres, Redis)...
docker compose -f docker-compose.prod.yml up -d postgres redis

echo.
echo [2/3] Waiting for services to be healthy...
timeout /t 15

echo.
echo [3/3] Starting AI Service and Web App...
docker compose -f docker-compose.prod.yml up -d ai-service web

echo.
echo ========================================
echo Production Stack Started!
echo ========================================
echo.
echo Services:
echo   - Web App:     http://localhost:3000
echo   - AI Service:  http://localhost:8000
echo   - Postgres:    localhost:5432
echo   - Redis:       localhost:6379
echo.
echo Note: Production uses environment variables (not .env.local)
echo Make sure GROQ_API_KEY is set in your system environment.
echo.
