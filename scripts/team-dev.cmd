@echo off
REM Team Development Setup & Commands for Windows

setlocal enabledelayedexpansion

set DOCKER_COMPOSE_FILE=docker-compose.dev.local.yml
set CONTAINER_PREFIX=lawsphere

:menu
cls
echo.
echo Lawsphere Team Development
echo ==================================
echo 1. 🚀 Start development environment
echo 2. 🛑 Stop all services
echo 3. 🔄 Restart services
echo 4. 📋 View logs
echo 5. 🗄️  Database shell
echo 6. 🤖 AI service shell
echo 7. 🌐 Web service shell
echo 8. ✨ Clean everything (hard reset)
echo 9. 🧪 Run tests
echo 10. 📊 Health check
echo 11. 🔍 Debug: Check service connectivity
echo 0. Exit
echo.
set /p option="Select option (0-11): "

if "%option%"=="1" goto start_dev
if "%option%"=="2" goto stop_dev
if "%option%"=="3" goto restart_services
if "%option%"=="4" goto view_logs
if "%option%"=="5" goto db_shell
if "%option%"=="6" goto ai_shell
if "%option%"=="7" goto web_shell
if "%option%"=="8" goto clean_all
if "%option%"=="9" goto run_tests
if "%option%"=="10" goto health_check
if "%option%"=="11" goto debug_connectivity
if "%option%"=="0" goto exit
echo Invalid option
goto menu

:start_dev
echo Starting Lawsphere development environment...
if not exist ".env.development" (
  echo Creating .env.development from template...
  copy .env.example .env.development >nul 2>&1
)
docker-compose -f %DOCKER_COMPOSE_FILE% up -d
echo Services starting...
timeout /t 3 /nobreak
echo.
echo Development environment ready:
echo   🌐 Web:       http://localhost:3000
echo   🤖 AI API:    http://localhost:8000
echo   🗄️  Database: localhost:5432
echo   📦 Redis:     localhost:6379
echo.
pause
goto menu

:stop_dev
echo Stopping all services...
docker-compose -f %DOCKER_COMPOSE_FILE% down
echo All services stopped
pause
goto menu

:restart_services
echo Restarting services...
docker-compose -f %DOCKER_COMPOSE_FILE% restart
echo Services restarted
pause
goto menu

:view_logs
echo Select service to view logs:
echo 1. All services
echo 2. Web frontend
echo 3. AI service
echo 4. Database
echo 5. Redis
set /p log_choice="Choice (1-5): "
if "%log_choice%"=="1" docker-compose -f %DOCKER_COMPOSE_FILE% logs -f
if "%log_choice%"=="2" docker-compose -f %DOCKER_COMPOSE_FILE% logs -f web
if "%log_choice%"=="3" docker-compose -f %DOCKER_COMPOSE_FILE% logs -f ai-service
if "%log_choice%"=="4" docker-compose -f %DOCKER_COMPOSE_FILE% logs -f postgres
if "%log_choice%"=="5" docker-compose -f %DOCKER_COMPOSE_FILE% logs -f redis
pause
goto menu

:db_shell
echo Connecting to PostgreSQL...
docker-compose -f %DOCKER_COMPOSE_FILE% exec postgres psql -U lawsphere -d lawsphere_dev
pause
goto menu

:ai_shell
echo Opening shell in AI service...
docker-compose -f %DOCKER_COMPOSE_FILE% exec ai-service cmd
pause
goto menu

:web_shell
echo Opening shell in Web service...
docker-compose -f %DOCKER_COMPOSE_FILE% exec web cmd
pause
goto menu

:clean_all
echo WARNING: This will remove all containers, volumes, and data!
set /p confirm="Type 'yes' to confirm: "
if not "%confirm%"=="yes" (
  echo Cancelled
  pause
  goto menu
)
echo Removing everything...
docker-compose -f %DOCKER_COMPOSE_FILE% down -v
echo Environment cleaned
pause
goto menu

:run_tests
echo Running tests...
echo Testing web frontend...
docker-compose -f %DOCKER_COMPOSE_FILE% exec -T web npm run lint
echo Testing AI service...
docker-compose -f %DOCKER_COMPOSE_FILE% exec -T ai-service python -m py_compile app/main.py
echo Tests completed
pause
goto menu

:health_check
echo.
echo Health Check
echo ============
docker-compose -f %DOCKER_COMPOSE_FILE% ps
echo.
echo Testing endpoints...
curl -s http://localhost:3000 >nul 2>&1
if !errorlevel! equ 0 (
  echo ✓ Web frontend responding
) else (
  echo ✗ Web frontend not responding
)
curl -s http://localhost:8000/health >nul 2>&1
if !errorlevel! equ 0 (
  echo ✓ AI service API responding
) else (
  echo ✗ AI service API not responding
)
pause
goto menu

:debug_connectivity
echo.
echo Debugging Service Connectivity
echo ================================
echo Testing web to AI API connectivity...
docker-compose -f %DOCKER_COMPOSE_FILE% exec -T web curl http://ai-service:8000/health
echo Testing AI to Database connectivity...
docker-compose -f %DOCKER_COMPOSE_FILE% exec -T ai-service psql -h postgres -U lawsphere -d lawsphere_dev -c "SELECT version();"
echo Connectivity tests completed
pause
goto menu

:exit
echo Goodbye!
endlocal
