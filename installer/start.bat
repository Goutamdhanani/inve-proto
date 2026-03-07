@echo off
:: =============================================================================
:: start.bat — Launch StockPilot (Inventory Avengers)
:: Place this file (or a shortcut to it) on the Desktop / Start Menu.
:: =============================================================================

setlocal EnableDelayedExpansion

set "APP_DIR=%~dp0"
set "BACKEND_DIR=%APP_DIR%backend"
set "ENV_FILE=%APP_DIR%.env"

echo ============================================================
echo  StockPilot (Inventory Avengers) — Starting...
echo ============================================================
echo.

:: ── Ensure .env exists ───────────────────────────────────────────────────────
if not exist "!ENV_FILE!" (
    echo [INFO] .env not found — copying from .env.example...
    copy /Y "!APP_DIR!.env.example" "!ENV_FILE!" >nul 2>&1
    echo [WARN] Please edit !ENV_FILE! and set MONGO_URI and JWT_SECRET before use.
    echo.
)

:: ── Locate node ──────────────────────────────────────────────────────────────
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "NODE=C:\Program Files\nodejs\node.exe"
    ) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
        set "NODE=C:\Program Files (x86)\nodejs\node.exe"
    ) else (
        echo [ERROR] Node.js not found. Please install it from https://nodejs.org
        pause
        exit /b 1
    )
) else (
    set "NODE=node"
)

:: ── Ensure backend dependencies are installed ─────────────────────────────────
if not exist "!BACKEND_DIR!\node_modules" (
    echo [INFO] Backend node_modules missing — running setup...
    call "!APP_DIR!setup.bat"
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Setup failed. Check !APP_DIR!install.log for details.
        pause
        exit /b 1
    )
)

:: ── Start MongoDB service (if installed as a Windows service) ─────────────────
sc query MongoDB >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    sc start MongoDB >nul 2>&1
    echo [INFO] MongoDB service started (or already running).
) else (
    :: Try to start mongod manually if it exists on PATH
    where mongod >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [INFO] Starting mongod in the background...
        if not exist "%USERPROFILE%\stockpilot-data" mkdir "%USERPROFILE%\stockpilot-data"
        start /B mongod --dbpath "%USERPROFILE%\stockpilot-data" >nul 2>&1
    ) else (
        echo [WARN] MongoDB service not found. Make sure MongoDB is running.
    )
)
echo.

:: ── Start the backend server ──────────────────────────────────────────────────
echo [INFO] Starting StockPilot backend on port 5000...
cd /d "!BACKEND_DIR!"
start "StockPilot Server" /MIN "!NODE!" server.js

:: ── Wait for the server to be ready (poll for up to 30 seconds) ──────────────
echo [INFO] Waiting for server to be ready...
set /a ATTEMPTS=0
:WAIT_LOOP
set /a ATTEMPTS+=1
if !ATTEMPTS! GTR 30 (
    echo [WARN] Server did not respond in 30 seconds. Opening browser anyway...
    goto OPEN_BROWSER
)
powershell -Command "try { (New-Object Net.WebClient).DownloadString('http://localhost:5000') | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto OPEN_BROWSER
timeout /t 1 /nobreak >nul
goto WAIT_LOOP

:: ── Open browser ─────────────────────────────────────────────────────────────
:OPEN_BROWSER
echo [INFO] Opening http://localhost:5000 in the default browser...
start "" "http://localhost:5000"

echo.
echo ============================================================
echo  StockPilot is running at http://localhost:5000
echo  Close the "StockPilot Server" window to stop the server.
echo ============================================================
endlocal
exit /b 0
