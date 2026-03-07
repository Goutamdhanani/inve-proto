# Building the StockPilot Windows Installer

## Quick Start (Recommended — Python GUI)

The simplest way to produce `StockPilotSetup.exe` is the **Python + PyInstaller**
route. No Inno Setup required.

### 1 — Install Python (if needed)

Download Python 3.8+ from <https://python.org>.  
**Tick "Add Python to PATH"** during installation.

### 2 — Run the build script

From a Windows command prompt (or Explorer → double-click):

```bat
cd installer
build_exe.bat
```

The script will:
1. Install PyInstaller via `pip`
2. Bundle `backend/`, `frontend/`, `.env.example`, and `start.bat` into the exe
3. Write `installer\dist\StockPilotSetup.exe`

### 3 — Distribute

Give `StockPilotSetup.exe` to end users. They double-click it and get a
full GUI wizard:

| Step | What happens |
|------|--------------|
| Welcome screen | User can change the install folder |
| Node.js | Detected by running `node --version`; downloaded and silently installed if missing |
| MongoDB | Detected via registry; downloaded and silently installed if missing |
| Files | `backend/` and `frontend/` extracted to the chosen folder |
| npm | `npm install` runs in both `backend/` and `frontend/` |
| Build | `npm run build` (Vite) produces `frontend/dist/` |
| Shortcuts | Desktop + Start Menu entries created |
| Finish | "🚀 Launch StockPilot" button opens the app in the browser |

---

## Installer Files

```
installer/
├── gui_installer.py       ← Python tkinter GUI wizard  ← PRIMARY
├── build_exe.bat          ← Compiles gui_installer.py → StockPilotSetup.exe
├── installer.iss          ← Inno Setup 6 script (alternative path)
├── setup.bat              ← npm install + build (run at install time)
├── start.bat              ← Launcher (shortcut target in install dir)
├── prereqs/
│   └── README.md          ← Download links for Node.js + MongoDB MSIs
└── README-installer.md    ← This file
```

---

## Alternative: Inno Setup Path

If you prefer Inno Setup:

### 1 — Install Inno Setup 6

<https://jrsoftware.org/isdl.php>

### 2 — Download prerequisite MSIs

Follow `prereqs/README.md`, or run in PowerShell from `installer/prereqs/`:

```powershell
# Node.js 20 LTS (x64 MSI)
Invoke-WebRequest "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi" -OutFile node_installer.msi
# MongoDB 7 Community (x64 MSI)
Invoke-WebRequest "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.5-signed.msi" -OutFile mongo_installer.msi
```

### 3 — Compile

```bat
iscc installer\installer.iss
```

Output: `installer\dist\StockPilotSetup.exe`

---

## End-user Experience (both paths produce the same result)

1. User runs `StockPilotSetup.exe` as administrator.
2. Wizard guides through installation with a progress bar and live log.
3. After installation, app starts and browser opens at `http://localhost:5000`.

---

## Configuration (`.env`)

The installer writes a `.env` to the install folder on first run.  
Default values work with a local MongoDB installation:

| Variable | Default |
|----------|---------|
| `MONGO_URI` | `mongodb://localhost:27017/inventory-avengers` |
| `JWT_SECRET` | Auto-generated unique 64-char hex value per installation |
| `REFRESH_TOKEN_SECRET` | Auto-generated unique 64-char hex value per installation |
| `OWNER_PASSWORD` | `OwnerSecure#2024` |

---

## Uninstall

**Python GUI installer** — run the installer again and choose a different
directory, or delete the install folder manually.

**Inno Setup installer** — use **Settings → Apps** or
**Control Panel → Programs and Features**.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm not found` after silent Node.js install | Reboot Windows (PATH is updated on reboot) then re-run `start.bat` |
| MongoDB service not starting | Run `net start MongoDB` in an admin prompt |
| Port 5000 already in use | Edit `.env` → set `PORT=5001`, restart via `start.bat` |
| `install.log` shows build errors | Open `C:\Program Files\StockPilot\install.log` |
| PyInstaller build fails | Run `pip install --upgrade pyinstaller` then retry `build_exe.bat` |
