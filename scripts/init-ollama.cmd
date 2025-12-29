@echo off
REM Initialize Ollama by pulling default model on startup
REM This script ensures models are available when deployment starts

setlocal enabledelayedexpansion

REM Configuration
set "OLLAMA_HOST=%OLLAMA_HOST:http://localhost:11434%"
if "!OLLAMA_HOST!"=="" set "OLLAMA_HOST=http://localhost:11434"

set "OLLAMA_MODEL=%OLLAMA_MODEL:qwen2%"
if "!OLLAMA_MODEL!"=="" set "OLLAMA_MODEL=qwen2"

set "MAX_RETRIES=30"
set "RETRY_DELAY=2"

echo.
echo ==========================================
echo Ollama Model Initialization Script
echo ==========================================
echo Host: !OLLAMA_HOST!
echo Model: !OLLAMA_MODEL!
echo.

REM Wait for Ollama to be ready
echo [1/3] Waiting for Ollama service to be ready...
set /a RETRIES=0

:wait_loop
if !RETRIES! gtr !MAX_RETRIES! (
    echo.
    echo ❌ Ollama failed to start after !MAX_RETRIES! attempts
    exit /b 1
)

curl -s !OLLAMA_HOST!/api/tags >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✅ Ollama service is ready
    echo.
    goto check_model
)

set /a RETRIES=!RETRIES!+1
echo   ⏳ Attempt !RETRIES!/!MAX_RETRIES! - Waiting !RETRY_DELAY!s...
timeout /t !RETRY_DELAY! /nobreak >nul 2>&1
goto wait_loop

:check_model
echo [2/3] Checking if model '!OLLAMA_MODEL!' is available...

REM Check if model exists
curl -s !OLLAMA_HOST!/api/tags | findstr /i "\"name\":\"!OLLAMA_MODEL!\"" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✅ Model '!OLLAMA_MODEL!' is already available
    echo.
    goto list_models
)

echo ⏳ Pulling model '!OLLAMA_MODEL!' (this may take 5-15 minutes on first run)...

REM Pull the model using HTTP API
curl -X POST !OLLAMA_HOST!/api/pull ^
    -H "Content-Type: application/json" ^
    -d "{\"name\":\"!OLLAMA_MODEL!\"}" ^
    -s >nul 2>&1

if %ERRORLEVEL% equ 0 (
    echo ✅ Model '!OLLAMA_MODEL!' pulled successfully
    echo.
) else (
    echo ❌ Failed to pull model
    exit /b 1
)

:list_models
echo [3/3] Checking available models...
echo Available models:
for /f %%A in ('curl -s !OLLAMA_HOST!/api/tags ^| findstr "name"') do (
    echo   ✓ %%A
)
echo.

echo ==========================================
echo ✅ Ollama initialization complete!
echo ==========================================
echo.
echo Your AI service can now use local LLMs:
echo   - Model: !OLLAMA_MODEL!
echo   - Endpoint: !OLLAMA_HOST!
echo   - Cost: FREE ^(no API charges^)
echo.

endlocal
