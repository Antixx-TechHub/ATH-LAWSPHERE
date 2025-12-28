@echo off
:: Lawsphere - Stop All Services Script for Windows

title Lawsphere - Stopping Services

echo.
echo Stopping Lawsphere services...
echo.

:: Kill Node.js processes (web app)
echo [INFO] Stopping web application...
taskkill /f /im node.exe 2>nul

:: Kill Python processes (AI service)  
echo [INFO] Stopping AI service...
taskkill /f /fi "WINDOWTITLE eq Lawsphere AI*" 2>nul

:: Stop Podman containers
echo [INFO] Stopping infrastructure containers...
podman stop lawsphere-postgres lawsphere-redis lawsphere-minio 2>nul

echo.
echo [SUCCESS] All services stopped!
echo.
