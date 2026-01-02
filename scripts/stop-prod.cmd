@echo off
echo ========================================
echo Stopping Lawsphere Production Stack
echo ========================================

cd /d "%~dp0.."

docker compose -f docker-compose.prod.yml down

echo.
echo All production services stopped.
pause
