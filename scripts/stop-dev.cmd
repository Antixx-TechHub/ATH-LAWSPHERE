@echo off
echo ========================================
echo Stopping Lawsphere Development Stack
echo ========================================

cd /d "%~dp0"

docker compose -f docker-compose.dev.yml down

echo.
echo All services stopped.
pause
