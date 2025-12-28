@echo off
setlocal enabledelayedexpansion

:: Lawsphere - Start All Services Script for Windows
:: Usage: scripts\start-all.cmd [--no-infra] [--web-only] [--ai-only]

title Lawsphere - Starting Services

set "PROJECT_ROOT=%~dp0.."
set "START_INFRA=1"
set "START_WEB=1"
set "START_AI=1"

:: Parse arguments
:parse_args
if "%~1"=="" goto :main
if "%~1"=="--no-infra" set "START_INFRA=0"
if "%~1"=="--web-only" (
    set "START_AI=0"
    set "START_INFRA=0"
)
if "%~1"=="--ai-only" (
    set "START_WEB=0"
    set "START_INFRA=0"
)
if "%~1"=="--help" goto :show_help
shift
goto :parse_args

:show_help
echo Usage: %~nx0 [options]
echo.
echo Options:
echo   --no-infra    Skip starting infrastructure (Podman containers)
echo   --web-only    Only start the web application
echo   --ai-only     Only start the AI service
echo   --help        Show this help message
exit /b 0

:main
echo.
echo ===============================================================
echo                     LAWSPHERE STARTUP
echo                Legal-Tech AI Platform
echo ===============================================================
echo.

cd /d "%PROJECT_ROOT%"

:: Start infrastructure
if "%START_INFRA%"=="1" call :start_infrastructure

:: Start web application
if "%START_WEB%"=="1" call :start_web

:: Start AI service  
if "%START_AI%"=="1" call :start_ai

echo.
echo ===============================================================
echo  All services started!
echo.
echo  Service URLs:
echo  - Web App:       http://localhost:3000
echo  - AI Service:    http://localhost:8000
echo  - MinIO Console: http://localhost:9001
echo  - API Docs:      http://localhost:8000/docs
echo ===============================================================
echo.
echo Press any key to stop all services...
pause >nul
call "%~dp0stop-all.cmd"
exit /b 0

:start_infrastructure
echo [INFO] Starting infrastructure services with docker-compose...

:: Check Docker
where docker >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed!
    exit /b 1
)

:: Start PostgreSQL and Redis using docker-compose
echo [INFO] Starting PostgreSQL and Redis...
docker-compose up -d postgres redis

:: Wait for services
echo [INFO] Waiting for services to be healthy...
timeout /t 5 /nobreak >nul

:: Verify services are running
docker ps | findstr "lawsphere-postgres" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Failed to start PostgreSQL
    exit /b 1
) else (
    echo [SUCCESS] PostgreSQL is running
)

docker ps | findstr "lawsphere-redis" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Failed to start Redis
    exit /b 1
) else (
    echo [SUCCESS] Redis is running
)
            pgvector/pgvector:pg16
    ) else (
        echo [INFO] Starting existing PostgreSQL container...
        podman start lawsphere-postgres
    )
) else (
    echo [INFO] PostgreSQL is already running
)

:: Start Redis
podman ps --format "{{.Names}}" | findstr "lawsphere-redis" >nul 2>&1
if errorlevel 1 (
    podman ps -a --format "{{.Names}}" | findstr "lawsphere-redis" >nul 2>&1
    if errorlevel 1 (
        echo [INFO] Creating Redis container...
        podman run -d --name lawsphere-redis ^
            --network lawsphere-network ^
            -p 6379:6379 ^
            redis:7-alpine redis-server --requirepass redis_secret
    ) else (
        echo [INFO] Starting existing Redis container...
        podman start lawsphere-redis
    )
) else (
    echo [INFO] Redis is already running
)

:: Start MinIO
podman ps --format "{{.Names}}" | findstr "lawsphere-minio" >nul 2>&1
if errorlevel 1 (
    podman ps -a --format "{{.Names}}" | findstr "lawsphere-minio" >nul 2>&1
    if errorlevel 1 (
        echo [INFO] Creating MinIO container...
        podman run -d --name lawsphere-minio ^
            --network lawsphere-network ^
            -e MINIO_ROOT_USER=lawsphere ^
            -e MINIO_ROOT_PASSWORD=lawsphere_secret ^
            -p 9000:9000 ^
            -p 9001:9001 ^
            -v lawsphere-minio-data:/data ^
            minio/minio:latest server /data --console-address ":9001"
    ) else (
        echo [INFO] Starting existing MinIO container...
        podman start lawsphere-minio
    )
) else (
    echo [INFO] MinIO is already running
)

echo [SUCCESS] Infrastructure services started!
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | findstr lawsphere
echo.
exit /b 0

:start_web
echo [INFO] Starting web application...
cd /d "%PROJECT_ROOT%\apps\web"

:: Copy .env if not exists
if not exist .env (
    echo [INFO] Copying .env file...
    copy "%PROJECT_ROOT%\.env" .env >nul 2>&1
)

:: Generate Prisma client
call npx prisma generate 2>nul

:: Start Next.js in new window
echo [INFO] Starting Next.js server on http://localhost:3000
start "Lawsphere Web" cmd /c "npm run dev"

cd /d "%PROJECT_ROOT%"
exit /b 0

:start_ai
echo [INFO] Starting AI service...
cd /d "%PROJECT_ROOT%\apps\ai-service"

:: Check for virtual environment
if not exist venv (
    if not exist .venv (
        echo [INFO] Creating Python virtual environment...
        python -m venv venv
    )
)

:: Start FastAPI in new window
echo [INFO] Starting FastAPI server on http://localhost:8000
if exist venv (
    start "Lawsphere AI" cmd /c "venv\Scripts\activate && pip install -r requirements.txt -q && python main.py"
) else if exist .venv (
    start "Lawsphere AI" cmd /c ".venv\Scripts\activate && pip install -r requirements.txt -q && python main.py"
) else (
    start "Lawsphere AI" cmd /c "pip install -r requirements.txt -q && python main.py"
)

cd /d "%PROJECT_ROOT%"
exit /b 0
