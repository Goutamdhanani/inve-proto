@echo off
:: =============================================================================
:: build_exe.bat  —  Compile StockPilot GUI installer into a single EXE
::
:: Requirements (Windows only):
::   • Python 3.8 or newer  (https://python.org — tick "Add to PATH")
::
:: Output:
::   installer\dist\StockPilotSetup.exe
::
:: Usage:
::   Double-click this file, or run from an elevated command prompt:
::     cd installer
::     build_exe.bat
:: =============================================================================

setlocal EnableDelayedExpansion

:: ── Paths ─────────────────────────────────────────────────────────────────────
set "INSTALLER_DIR=%~dp0"
set "ROOT_DIR=%INSTALLER_DIR%.."
set "OUT_DIR=%INSTALLER_DIR%dist"
set "BUILD_TMP=%INSTALLER_DIR%_build_tmp"
set "SCRIPT=%INSTALLER_DIR%gui_installer.py"

echo.
echo  ============================================================
echo   StockPilot  —  Building StockPilotSetup.exe
echo  ============================================================
echo.

:: ── Verify Python ─────────────────────────────────────────────────────────────
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Python was not found on PATH.
    echo          Download Python 3.8+ from https://python.org
    echo          Make sure to tick "Add Python to PATH" during install.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('python --version 2^>^&1') do set "PYVER=%%v"
echo  [OK] Found: !PYVER!
echo.

:: ── Install / upgrade PyInstaller ─────────────────────────────────────────────
echo  [INFO] Installing / upgrading PyInstaller...
python -m pip install --upgrade pyinstaller --quiet
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] pip install pyinstaller failed.
    pause
    exit /b 1
)
echo  [OK] PyInstaller ready.
echo.

:: ── Install pywin32 + winshell (optional, for shortcut creation in the EXE) ───
echo  [INFO] Installing pywin32 and winshell (optional, for shortcuts)...
python -m pip install pywin32 winshell --quiet
echo  [OK] Done (errors above are non-fatal).
echo.

:: ── Verify project directories exist ─────────────────────────────────────────
if not exist "!ROOT_DIR!\backend" (
    echo  [ERROR] backend\ folder not found at !ROOT_DIR!\backend
    pause
    exit /b 1
)
if not exist "!ROOT_DIR!\frontend" (
    echo  [ERROR] frontend\ folder not found at !ROOT_DIR!\frontend
    pause
    exit /b 1
)

:: ── Clean previous build artifacts ────────────────────────────────────────────
if exist "!BUILD_TMP!" rmdir /s /q "!BUILD_TMP!"
if exist "!OUT_DIR!\StockPilotSetup.exe" del /f /q "!OUT_DIR!\StockPilotSetup.exe"

:: ── Run PyInstaller ───────────────────────────────────────────────────────────
echo  [INFO] Compiling StockPilotSetup.exe — this may take 1-3 minutes...
echo.

:: Note: --add-data uses semicolon on Windows:  source;destination_inside_bundle
python -m PyInstaller ^
    --onefile ^
    --windowed ^
    --name "StockPilotSetup" ^
    --distpath "!OUT_DIR!" ^
    --workpath "!BUILD_TMP!" ^
    --specpath "!BUILD_TMP!" ^
    --add-data "!ROOT_DIR!\backend;backend" ^
    --add-data "!ROOT_DIR!\frontend;frontend" ^
    --add-data "!ROOT_DIR!\.env.example;." ^
    --add-data "!INSTALLER_DIR!start.bat;." ^
    --clean ^
    "!SCRIPT!"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERROR] PyInstaller compilation failed. Review the output above.
    pause
    exit /b 1
)

:: ── Cleanup temp build files ──────────────────────────────────────────────────
if exist "!BUILD_TMP!" rmdir /s /q "!BUILD_TMP!"

:: ── Success ───────────────────────────────────────────────────────────────────
echo.
echo  ============================================================
echo   SUCCESS!
echo   Output: installer\dist\StockPilotSetup.exe
echo  ============================================================
echo.
echo   Distribute StockPilotSetup.exe to end users.
echo   They double-click it:
echo     1. Node.js + MongoDB are installed automatically if needed
echo     2. Project files are copied to Program Files\StockPilot
echo     3. npm install + npm run build run automatically
echo     4. Desktop and Start Menu shortcuts are created
echo     5. The app launches in the browser at http://localhost:5000
echo.

pause
endlocal
exit /b 0
