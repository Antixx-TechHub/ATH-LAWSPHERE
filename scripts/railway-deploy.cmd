@echo off
REM Railway Deployment Helper for Windows
REM Simplifies deployment and management of Lawsphere on Railway

setlocal enabledelayedexpansion

REM Check if Railway CLI is installed
where railway >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ Railway CLI not found
    echo Install it with: npm install -g @railway/cli
    pause
    exit /b 1
)

echo ✅ Railway CLI is installed
echo.

:menu
cls
echo.
echo ==========================================
echo Lawsphere Railway Deployment Helper
echo ==========================================
echo.
echo 1. Check Railway Login
echo 2. Deploy Current Branch
echo 3. SSH into Container
echo 4. View Service Logs
echo 5. Pull Ollama Model
echo 6. Check Service Health
echo 7. View Environment Variables
echo 8. Set Environment Variable
echo 9. Restart Services
echo 10. View Database Status
echo 11. Exit
echo.
set /p choice="Select option (1-11): "

if "!choice!"=="1" goto check_login
if "!choice!"=="2" goto deploy_branch
if "!choice!"=="3" goto ssh_container
if "!choice!"=="4" goto view_logs
if "!choice!"=="5" goto pull_ollama
if "!choice!"=="6" goto check_health
if "!choice!"=="7" goto view_env
if "!choice!"=="8" goto set_env
if "!choice!"=="9" goto restart_services
if "!choice!"=="10" goto check_database
if "!choice!"=="11" goto exit_script

echo Invalid selection
timeout /t 2 >nul
goto menu

:check_login
cls
echo.
echo ==========================================
echo Checking Railway Login
echo ==========================================
echo.
railway status
echo.
pause
goto menu

:deploy_branch
cls
echo.
echo ==========================================
echo Deploying to Railway
echo ==========================================
echo.
set /p env="Enter environment (staging/production) [staging]: "
if "!env!"=="" set "env=staging"

set /p push="Push changes to git before deploy? (y/n) [y]: "
if "!push!"=="" set "push=y"

if "!push!"=="y" (
    echo.
    echo Pushing to git...
    git add .
    set /p message="Enter commit message: "
    git commit -m "!message!"
    git push
)

echo.
echo Deploying to !env!...
railway up

echo.
pause
goto menu

:ssh_container
cls
echo.
echo ==========================================
echo SSH into Railway Container
echo ==========================================
echo.
echo Available services:
echo 1. web (Next.js frontend)
echo 2. ai-service (FastAPI backend)
echo 3. ollama (LLM service)
echo 4. postgres (Database)
echo 5. redis (Cache)
echo.
set /p service_num="Select service (1-5): "

if "!service_num!"=="1" (
    set "service=web"
) else if "!service_num!"=="2" (
    set "service=ai-service"
) else if "!service_num!"=="3" (
    set "service=ollama"
) else if "!service_num!"=="4" (
    set "service=postgres"
) else if "!service_num!"=="5" (
    set "service=redis"
) else (
    echo Invalid selection
    timeout /t 2 >nul
    goto menu
)

echo.
echo Connecting to !service!...
railway shell --service !service!

echo.
pause
goto menu

:view_logs
cls
echo.
echo ==========================================
echo View Service Logs
echo ==========================================
echo.
echo Available services:
echo 1. web (Next.js frontend)
echo 2. ai-service (FastAPI backend)
echo 3. ollama (LLM service)
echo.
set /p service_num="Select service (1-3): "

if "!service_num!"=="1" (
    set "service=web"
) else if "!service_num!"=="2" (
    set "service=ai-service"
) else if "!service_num!"=="3" (
    set "service=ollama"
) else (
    echo Invalid selection
    timeout /t 2 >nul
    goto menu
)

echo.
echo Showing logs for !service! (last 100 lines)...
echo.
railway logs --service !service! --tail 100

echo.
pause
goto menu

:pull_ollama
cls
echo.
echo ==========================================
echo Pull Ollama Model
echo ==========================================
echo.
echo Available models:
echo 1. qwen2 (7B) - RECOMMENDED
echo 2. qwen2:3b (3B) - Fast, lightweight
echo 3. qwen2:14b (14B) - Larger, slower
echo 4. llama2 (7B) - Good alternative
echo 5. mistral (7B) - Code/reasoning
echo 6. Custom model
echo.
set /p model_num="Select model (1-6): "

if "!model_num!"=="1" (
    set "model=qwen2"
) else if "!model_num!"=="2" (
    set "model=qwen2:3b"
) else if "!model_num!"=="3" (
    set "model=qwen2:14b"
) else if "!model_num!"=="4" (
    set "model=llama2"
) else if "!model_num!"=="5" (
    set "model=mistral"
) else if "!model_num!"=="6" (
    set /p model="Enter model name: "
) else (
    echo Invalid selection
    timeout /t 2 >nul
    goto menu
)

echo.
echo Pulling model: !model!
echo This may take 5-15 minutes...
echo.

railway shell --service ollama <<EOF
ollama pull !model!
EOF

echo.
echo ✅ Model pulled: !model!
pause
goto menu

:check_health
cls
echo.
echo ==========================================
echo Checking Service Health
echo ==========================================
echo.

echo Checking web service...
railway shell --service web <<EOF
curl -s http://localhost:3000
EOF

echo.
echo Checking ai-service...
railway shell --service ai-service <<EOF
curl -s http://localhost:8000/health
EOF

echo.
echo Checking ollama...
railway shell --service ollama <<EOF
curl -s http://localhost:11434/api/tags
EOF

echo.
pause
goto menu

:view_env
cls
echo.
echo ==========================================
echo Environment Variables
echo ==========================================
echo.
railway variables

echo.
pause
goto menu

:set_env
cls
echo.
echo ==========================================
echo Set Environment Variable
echo ==========================================
echo.
set /p var_name="Enter variable name: "
set /p var_value="Enter variable value: "

railway variables set !var_name! !var_value!

echo.
echo ✅ Variable set: !var_name!
pause
goto menu

:restart_services
cls
echo.
echo ==========================================
echo Restart Services
echo ==========================================
echo.
echo Available services:
echo 1. All services
echo 2. web only
echo 3. ai-service only
echo 4. ollama only
echo.
set /p choice="Select (1-4): "

if "!choice!"=="1" (
    echo Restarting all services...
    railway restart
) else if "!choice!"=="2" (
    echo Restarting web...
    railway shell --service web <<EOF
kill 1
EOF
) else if "!choice!"=="3" (
    echo Restarting ai-service...
    railway shell --service ai-service <<EOF
kill 1
EOF
) else if "!choice!"=="4" (
    echo Restarting ollama...
    railway shell --service ollama <<EOF
kill 1
EOF
) else (
    echo Invalid selection
)

echo.
echo ✅ Restart initiated
pause
goto menu

:check_database
cls
echo.
echo ==========================================
echo Database Status
echo ==========================================
echo.

railway shell --service postgres <<EOF
psql -c "\l" | grep lawsphere
psql -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" lawsphere
EOF

echo.
pause
goto menu

:exit_script
echo.
echo ✅ Goodbye!
echo.
endlocal
exit /b 0
