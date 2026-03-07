# Building the StockPilot Windows Installer

## Overview

This folder contains everything needed to produce a single-file Windows
installer: **`StockPilotSetup.exe`**.

The installer:
- Silently installs **Node.js LTS** and **MongoDB Community Server** if they
  are not already present on the target machine.
- Copies the full project to `C:\Program Files\StockPilot`.
- Runs `npm install` in the backend and frontend.
- Runs `npm run build` (Vite) to produce `frontend/dist`.
- Creates a **Desktop shortcut** and a **Start Menu** entry.
- Launches the application on first run and opens
  `http://localhost:5000` in the default browser.

---

## Folder Structure

```
installer/
├── installer.iss          ← Inno Setup script (edit version/metadata here)
├── setup.bat              ← npm install + frontend build (run at install time)
├── start.bat              ← Launch script (copied to the install dir)
├── prereqs/
│   ├── README.md          ← Download instructions for bundled installers
│   ├── node_installer.msi ← Node.js LTS x64 MSI (YOU must download this)
│   └── mongo_installer.msi← MongoDB Community MSI (YOU must download this)
└── README-installer.md    ← This file
```

---

## Step-by-step Build Instructions

### 1 — Install Inno Setup

Download and install **Inno Setup 6** (free) from:  
<https://jrsoftware.org/isdl.php>

### 2 — Download the prerequisite installers

Follow the instructions in [`prereqs/README.md`](prereqs/README.md), or run
the PowerShell helper provided there.

The two files must be placed at exactly these paths relative to `installer.iss`:

```
installer/prereqs/node_installer.exe
installer/prereqs/mongo_installer.msi
```

### 3 — Compile the installer

**Option A — GUI:**
1. Open `installer.iss` in the Inno Setup Compiler IDE.
2. Press `F9` or click **Build → Compile**.
3. The output file is written to `installer/dist/StockPilotSetup.exe`.

**Option B — Command line (CI/CD):**
```bat
iscc installer\installer.iss
```

The `iscc.exe` compiler is located in the Inno Setup installation directory
(typically `C:\Program Files (x86)\Inno Setup 6\iscc.exe`).

---

## End-user Experience

1. User downloads `StockPilotSetup.exe` and double-clicks it.
2. The installer wizard opens (modern style, UAC prompt for admin rights).
3. It silently installs Node.js and MongoDB if needed.
4. Project files are copied to `C:\Program Files\StockPilot`.
5. `setup.bat` runs `npm install` (backend & frontend) and `npm run build`.
6. A Desktop shortcut and Start Menu entry are created.
7. The user clicks **Finish** → the backend server starts and the browser
   opens at `http://localhost:5000`.

---

## Configuration (``.env``)

The installer copies `.env.example` to `C:\Program Files\StockPilot\.env`
(only if `.env` does not already exist).  
The user should edit this file to set:

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string (default: local) |
| `JWT_SECRET` | Secret key for JWT tokens |
| `OWNER_EMAIL` / `OWNER_PASSWORD` | Initial owner credentials |

For a local MongoDB installation the URI is typically:
```
MONGO_URI=mongodb://localhost:27017/inventory-avengers
```

---

## Uninstall

The installer registers a standard Windows uninstaller.  
Use **Settings → Apps** or **Control Panel → Programs and Features** to
uninstall **StockPilot (Inventory Avengers)**.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm` not found during installation | Node.js installer may still be setting `PATH`; reboot and re-run `setup.bat` manually |
| MongoDB service not starting | Ensure the MongoDB service is registered: run `net start MongoDB` as admin |
| Port 5000 already in use | Edit `.env` and change `PORT`, then restart via `start.bat` |
| `install.log` shows build errors | Check `C:\Program Files\StockPilot\install.log` for full npm output |
