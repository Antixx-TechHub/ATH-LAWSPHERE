@echo off
echo ========================================
echo Viewing AI Service Logs
echo ========================================

cd /d "%~dp0"

docker compose -f docker-compose.dev.yml logs -f ai-service
