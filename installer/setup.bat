@echo off
:: =============================================================================
:: setup.bat — Run by the Inno Setup installer after files are copied.
:: Installs npm dependencies and builds the frontend.
:: Working directory: {app}  (C:\Program Files\StockPilot)
:: =============================================================================

setlocal EnableDelayedExpansion

:: ── Paths ────────────────────────────────────────────────────────────────────
set "APP_DIR=%~dp0"
set "BACKEND_DIR=%APP_DIR%backend"
set "FRONTEND_DIR=%APP_DIR%frontend"

echo ============================================================
echo  StockPilot — Installation Setup
echo ============================================================
echo.

:: ── Locate npm ───────────────────────────────────────────────────────────────
:: After a silent Node.js install the PATH update may not be visible yet in the
:: current process; look for npm in the common install location as a fallback.
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] npm not found in PATH, looking in default Node.js location...
    if exist "C:\Program Files\nodejs\npm.cmd" (
        set "NPM=C:\Program Files\nodejs\npm.cmd"
    ) else if exist "C:\Program Files (x86)\nodejs\npm.cmd" (
        set "NPM=C:\Program Files (x86)\nodejs\npm.cmd"
    ) else (
        echo [ERROR] npm not found. Please install Node.js manually from https://nodejs.org
        exit /b 1
    )
) else (
    set "NPM=npm"
)
echo [INFO] Using npm: !NPM!
echo.

:: ── Backend: npm install ──────────────────────────────────────────────────────
echo [STEP 1/3] Installing backend dependencies...
cd /d "!BACKEND_DIR!"
call "!NPM!" install --prefer-offline --no-audit --no-fund
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend npm install failed (exit code %ERRORLEVEL%).
    exit /b 1
)
echo [OK] Backend dependencies installed.
echo.

:: ── Frontend: npm install ─────────────────────────────────────────────────────
echo [STEP 2/3] Installing frontend dependencies...
cd /d "!FRONTEND_DIR!"
call "!NPM!" install --prefer-offline --no-audit --no-fund
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend npm install failed (exit code %ERRORLEVEL%).
    exit /b 1
)
echo [OK] Frontend dependencies installed.
echo.

:: ── Frontend: npm run build ───────────────────────────────────────────────────
echo [STEP 3/3] Building frontend (Vite)...
call "!NPM!" run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed (exit code %ERRORLEVEL%).
    exit /b 1
)
echo [OK] Frontend built successfully.
echo.

echo ============================================================
echo  Setup complete! Use start.bat to launch StockPilot.
echo ============================================================
endlocal
exit /b 0
