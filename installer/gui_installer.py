#!/usr/bin/env python3
"""
StockPilot (Inventory Avengers) — GUI Installer Wizard
=======================================================
A standalone tkinter wizard that:
  1. Checks / installs Node.js LTS silently.
  2. Checks / installs MongoDB Community Server silently.
  3. Copies project files to the chosen install directory.
  4. Runs npm install (backend + frontend) and npm run build.
  5. Creates Desktop & Start Menu shortcuts.
  6. Launches the app on finish.

Build to a single EXE:
    build_exe.bat     (Windows, requires Python 3.8+)
  or manually:
    pyinstaller --onefile --windowed --name StockPilotSetup \
        --add-data "../backend;backend" \
        --add-data "../frontend;frontend" \
        --add-data "../.env.example;." \
        --add-data "start.bat;." \
        gui_installer.py
"""

import os
import sys
import shutil
import threading
import subprocess
import tempfile
import webbrowser
import urllib.request
import tkinter as tk
from tkinter import ttk, filedialog, scrolledtext, messagebox

# ── Configuration ─────────────────────────────────────────────────────────────
APP_NAME    = "StockPilot"
APP_FULL    = "StockPilot (Inventory Avengers)"
APP_VERSION = "1.0.0"
DEFAULT_DIR = os.path.join(
    os.environ.get("ProgramFiles", r"C:\Program Files"), APP_NAME
)
SERVER_URL  = "http://localhost:5000"

NODE_MSI_URL  = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
MONGO_MSI_URL = (
    "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.5-signed.msi"
)

# ── Colour palette ─────────────────────────────────────────────────────────────
BG        = "#1a1a2e"   # dark navy
BG2       = "#16213e"   # slightly lighter
ACCENT    = "#e94560"   # red-orange
FG        = "#eaeaea"   # near-white text
FG_DIM    = "#888888"   # muted text
LOG_BG    = "#0d0d1a"   # very dark
LOG_FG    = "#00e676"   # green log text
BTN_BG    = "#0f3460"   # dark-blue button
BTN_HOVER = "#e94560"


# ── Helpers ────────────────────────────────────────────────────────────────────

def resource_path(rel: str) -> str:
    """Resolve path to a file bundled by PyInstaller or next to the script."""
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, rel)


def _reg_key_exists(hive, path: str) -> bool:
    try:
        import winreg
        winreg.OpenKey(hive, path)
        return True
    except Exception:
        return False


def is_node_installed() -> bool:
    """Return True if node is runnable or found in the registry."""
    try:
        subprocess.run(
            ["node", "--version"],
            capture_output=True, check=True, timeout=8
        )
        return True
    except Exception:
        pass
    # Fallback: check well-known install paths
    for p in [
        r"C:\Program Files\nodejs\node.exe",
        r"C:\Program Files (x86)\nodejs\node.exe",
    ]:
        if os.path.isfile(p):
            return True
    return False


def is_mongo_installed() -> bool:
    """Return True if MongoDB is detected via registry or directory."""
    try:
        import winreg
        for hive, path in [
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\MongoDB\Server"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\MongoDB\Server"),
        ]:
            if _reg_key_exists(hive, path):
                return True
    except ImportError:
        pass
    return os.path.isdir(r"C:\Program Files\MongoDB\Server")


def find_npm() -> str:
    """Return a usable path to npm.cmd, or raise RuntimeError."""
    candidates = [
        "npm",
        "npm.cmd",
        r"C:\Program Files\nodejs\npm.cmd",
        r"C:\Program Files (x86)\nodejs\npm.cmd",
    ]
    for cand in candidates:
        try:
            subprocess.run(
                [cand, "--version"],
                capture_output=True, check=True, timeout=8
            )
            return cand
        except Exception:
            pass
    raise RuntimeError(
        "npm not found after Node.js installation.\n"
        "Please restart the installer or reboot Windows, then try again."
    )


def find_node() -> str:
    """Return a usable path to node.exe, or raise RuntimeError."""
    candidates = [
        "node",
        r"C:\Program Files\nodejs\node.exe",
        r"C:\Program Files (x86)\nodejs\node.exe",
    ]
    for cand in candidates:
        try:
            subprocess.run(
                [cand, "--version"],
                capture_output=True, check=True, timeout=8
            )
            return cand
        except Exception:
            pass
    raise RuntimeError("node not found. Please install Node.js and retry.")


# ── Custom widgets ─────────────────────────────────────────────────────────────

class FlatButton(tk.Button):
    """A simple flat-styled button matching the dark theme."""

    def __init__(self, parent, text, command, primary=True, **kw):
        bg = ACCENT if primary else BTN_BG
        kw.setdefault("font", ("Segoe UI", 10, "bold" if primary else "normal"))
        kw.setdefault("fg", "#ffffff")
        kw.setdefault("relief", "flat")
        kw.setdefault("bd", 0)
        kw.setdefault("padx", 18)
        kw.setdefault("pady", 8)
        kw.setdefault("cursor", "hand2")
        super().__init__(parent, text=text, command=command, bg=bg, **kw)
        self._bg = bg
        self.bind("<Enter>", self._on_enter)
        self.bind("<Leave>", self._on_leave)

    def _on_enter(self, _):
        self.configure(bg=BTN_HOVER)

    def _on_leave(self, _):
        self.configure(bg=self._bg)


# ── Main application ───────────────────────────────────────────────────────────

class InstallerApp(tk.Tk):

    def __init__(self):
        super().__init__()
        self.title(f"{APP_FULL} — Setup v{APP_VERSION}")
        self.geometry("640x500")
        self.resizable(False, False)
        self.configure(bg=BG)
        # Centre window
        self.update_idletasks()
        x = (self.winfo_screenwidth()  - 640) // 2
        y = (self.winfo_screenheight() - 500) // 2
        self.geometry(f"640x500+{x}+{y}")

        # State
        self.install_dir  = tk.StringVar(value=DEFAULT_DIR)
        self._frame       = None
        self._progress_lbl = None
        self._progress_bar = None
        self._log_box      = None
        self._finish_btn   = None

        self._show_welcome()

    # ── Frame plumbing ─────────────────────────────────────────────────────────

    def _clear(self) -> tk.Frame:
        if self._frame:
            self._frame.destroy()
        self._frame = tk.Frame(self, bg=BG)
        self._frame.pack(fill="both", expand=True)
        return self._frame

    def _header(self, parent: tk.Frame, title: str, sub: str = ""):
        tk.Label(
            parent, text=title,
            font=("Segoe UI", 20, "bold"),
            bg=BG, fg=ACCENT
        ).pack(pady=(22, 3))
        if sub:
            tk.Label(
                parent, text=sub,
                font=("Segoe UI", 10),
                bg=BG, fg=FG_DIM
            ).pack(pady=(0, 2))
        tk.Frame(parent, height=2, bg=ACCENT).pack(fill="x", padx=24, pady=(8, 0))

    def _btn_row(self, parent: tk.Frame) -> tk.Frame:
        row = tk.Frame(parent, bg=BG)
        row.pack(side="bottom", fill="x", padx=24, pady=12)
        return row

    # ── Step 1: Welcome ────────────────────────────────────────────────────────

    def _show_welcome(self):
        f = self._clear()
        self._header(f, f"Welcome to {APP_NAME}", f"Version {APP_VERSION}")

        body = tk.Frame(f, bg=BG)
        body.pack(fill="both", expand=True, padx=30, pady=10)

        info = (
            "This wizard installs StockPilot (Inventory Avengers) on your PC.\n\n"
            "What will happen:\n"
            "  ✦  Node.js LTS is installed automatically if not present\n"
            "  ✦  MongoDB Community is installed automatically if not present\n"
            "  ✦  Project files are copied to the folder you choose\n"
            "  ✦  npm dependencies are installed and the frontend is built\n"
            "  ✦  Desktop & Start Menu shortcuts are created\n\n"
            "An internet connection is required to download prerequisites.\n"
        )
        tk.Label(
            body, text=info,
            font=("Segoe UI", 10), bg=BG, fg=FG,
            justify="left", wraplength=570
        ).pack(anchor="w", pady=(4, 10))

        # Install directory picker
        dir_frame = tk.Frame(body, bg=BG)
        dir_frame.pack(fill="x", pady=4)

        tk.Label(
            dir_frame, text="Install location:",
            font=("Segoe UI", 10), bg=BG, fg=FG_DIM
        ).pack(side="left")

        tk.Entry(
            dir_frame, textvariable=self.install_dir, width=36,
            font=("Consolas", 9),
            bg=BTN_BG, fg=FG, insertbackground=FG,
            relief="flat", bd=4
        ).pack(side="left", padx=8)

        FlatButton(dir_frame, "Browse…", self._browse, primary=False).pack(side="left")

        # Buttons
        row = self._btn_row(f)
        FlatButton(row, "Cancel", self.destroy, primary=False).pack(side="left")
        FlatButton(row, "Install  →", self._on_install_click).pack(side="right")

    def _browse(self):
        d = filedialog.askdirectory(initialdir=self.install_dir.get())
        if d:
            self.install_dir.set(d.replace("/", "\\"))

    def _on_install_click(self):
        target = self.install_dir.get().strip()
        if not target:
            messagebox.showerror("Error", "Please choose an installation directory.")
            return
        self._show_installing()
        threading.Thread(target=self._install_worker, daemon=True).start()

    # ── Step 2: Installing ─────────────────────────────────────────────────────

    def _show_installing(self):
        f = self._clear()
        self._header(f, "Installing…", "Please wait — this may take several minutes.")

        body = tk.Frame(f, bg=BG)
        body.pack(fill="both", expand=True, padx=30, pady=8)

        self._progress_lbl = tk.Label(
            body, text="Preparing…",
            font=("Segoe UI", 10, "bold"), bg=BG, fg=ACCENT, anchor="w"
        )
        self._progress_lbl.pack(fill="x", pady=(4, 2))

        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure(
            "Green.Horizontal.TProgressbar",
            troughcolor=BTN_BG, background=ACCENT, darkcolor=ACCENT, lightcolor=ACCENT
        )
        self._progress_bar = ttk.Progressbar(
            body, style="Green.Horizontal.TProgressbar",
            mode="indeterminate", length=570
        )
        self._progress_bar.pack(fill="x", pady=(0, 6))
        self._progress_bar.start(10)

        self._log_box = scrolledtext.ScrolledText(
            body,
            height=14,
            font=("Consolas", 9),
            bg=LOG_BG, fg=LOG_FG,
            insertbackground=LOG_FG,
            state="disabled",
            relief="flat",
            bd=0,
        )
        self._log_box.pack(fill="both", expand=True)

        row = self._btn_row(f)
        self._finish_btn = FlatButton(row, "Please wait…", lambda: None, primary=False)
        self._finish_btn.configure(state="disabled")
        self._finish_btn.pack(side="right")

    def _log(self, msg: str):
        if not self._log_box:
            return
        self._log_box.configure(state="normal")
        self._log_box.insert("end", msg + "\n")
        self._log_box.see("end")
        self._log_box.configure(state="disabled")
        self.update_idletasks()

    def _set_status(self, msg: str):
        if self._progress_lbl:
            self._progress_lbl.configure(text=msg)
        self.update_idletasks()

    # ── Installation worker (background thread) ────────────────────────────────

    def _install_worker(self):
        try:
            install_dir = self.install_dir.get().strip()
            os.makedirs(install_dir, exist_ok=True)

            # ── 1. Node.js ────────────────────────────────────────────────────
            self._set_status("Checking Node.js…")
            self._log("═" * 50)
            self._log("► Checking Node.js…")
            if is_node_installed():
                self._log("  ✓ Node.js already installed — skipping.")
            else:
                self._log("  ✗ Not found — downloading Node.js LTS…")
                self._set_status("Downloading Node.js LTS…")
                msi = os.path.join(tempfile.gettempdir(), "node_installer.msi")
                self._download_file(NODE_MSI_URL, msi, "Node.js")
                self._log("  ● Installing Node.js silently (up to 5 min)…")
                self._set_status("Installing Node.js…")
                subprocess.run(
                    ["msiexec", "/i", msi, "/qn"],
                    check=True, timeout=300
                )
                self._log("  ✓ Node.js installed.")

            # ── 2. MongoDB ────────────────────────────────────────────────────
            self._set_status("Checking MongoDB…")
            self._log("═" * 50)
            self._log("► Checking MongoDB…")
            if is_mongo_installed():
                self._log("  ✓ MongoDB already installed — skipping.")
            else:
                self._log("  ✗ Not found — downloading MongoDB Community…")
                self._set_status("Downloading MongoDB Community…")
                msi = os.path.join(tempfile.gettempdir(), "mongo_installer.msi")
                self._download_file(MONGO_MSI_URL, msi, "MongoDB")
                self._log("  ● Installing MongoDB silently (up to 10 min)…")
                self._set_status("Installing MongoDB…")
                subprocess.run(
                    ["msiexec", "/i", msi, "/qn", "SHOULD_INSTALL_COMPASS=0"],
                    check=True, timeout=600
                )
                self._log("  ✓ MongoDB installed.")

            # ── 3. Copy project files ─────────────────────────────────────────
            self._set_status("Copying project files…")
            self._log("═" * 50)
            self._log(f"► Copying files → {install_dir}")
            self._copy_project(install_dir)
            self._log("  ✓ Project files copied.")

            # ── 4. Write .env ─────────────────────────────────────────────────
            self._write_env(install_dir)
            self._log("  ✓ .env configuration file created.")

            # ── 5. npm install — backend ──────────────────────────────────────
            self._set_status("Installing backend packages…")
            self._log("═" * 50)
            self._log("► npm install (backend)…")
            self._run_npm(
                os.path.join(install_dir, "backend"),
                ["install", "--no-audit", "--no-fund"]
            )
            self._log("  ✓ Backend packages installed.")

            # ── 6. npm install — frontend ─────────────────────────────────────
            self._set_status("Installing frontend packages…")
            self._log("═" * 50)
            self._log("► npm install (frontend)…")
            self._run_npm(
                os.path.join(install_dir, "frontend"),
                ["install", "--no-audit", "--no-fund"]
            )
            self._log("  ✓ Frontend packages installed.")

            # ── 7. npm run build — frontend ───────────────────────────────────
            self._set_status("Building frontend (Vite)…")
            self._log("═" * 50)
            self._log("► npm run build (frontend)…")
            self._run_npm(os.path.join(install_dir, "frontend"), ["run", "build"])
            self._log("  ✓ Frontend built successfully.")

            # ── 8. Write start.bat ────────────────────────────────────────────
            self._write_start_bat(install_dir)
            self._log("  ✓ Launcher script written.")

            # ── 9. Shortcuts ──────────────────────────────────────────────────
            self._set_status("Creating shortcuts…")
            self._log("═" * 50)
            self._log("► Creating shortcuts…")
            shortcut_ok = self._create_shortcuts(install_dir)
            if shortcut_ok:
                self._log("  ✓ Desktop & Start Menu shortcuts created.")
            else:
                self._log("  ⚠ Shortcuts skipped (pywin32 not bundled).")

            # ── Done ──────────────────────────────────────────────────────────
            self._log("")
            self._log("═" * 50)
            self._log("  ✅  Installation complete!")
            self._log("═" * 50)

            self._progress_bar.stop()
            self._progress_bar.configure(mode="determinate", value=100)
            self._set_status("Installation complete  ✅")
            self.after(0, self._show_finish)

        except Exception as exc:
            self._log("")
            self._log(f"  ❌  FAILED: {exc}")
            if self._progress_bar:
                self._progress_bar.stop()
            self._set_status("Installation failed  ❌")
            self.after(0, lambda: self._finish_btn.configure(
                text="Close", state="normal", command=self.destroy
            ))

    # ── Helpers used by worker ─────────────────────────────────────────────────

    def _download_file(self, url: str, dest: str, label: str):
        self._log(f"  ↓  {label}: {os.path.basename(url)}")

        def _progress(count, block_size, total_size):
            if total_size > 0:
                pct = min(100, count * block_size * 100 // total_size)
                self.after(0, lambda p=pct: self._set_status(
                    f"Downloading {label}… {p}%"
                ))

        urllib.request.urlretrieve(url, dest, reporthook=_progress)
        self._log(f"  ✓  {label} download complete.")

    def _copy_project(self, dest: str):
        for folder in ("backend", "frontend"):
            src = resource_path(folder)
            dst = os.path.join(dest, folder)
            if os.path.exists(dst):
                shutil.rmtree(dst)
            if os.path.isdir(src):
                shutil.copytree(src, dst)
            else:
                self._log(f"  ⚠  {folder} source not found — skipping copy.")

    def _write_env(self, install_dir: str):
        import secrets as _secrets
        env_dest = os.path.join(install_dir, ".env")
        if os.path.exists(env_dest):
            return
        env_src = resource_path(".env.example")
        if os.path.exists(env_src):
            shutil.copy2(env_src, env_dest)
        else:
            # Write a minimal default .env (secrets generated below)
            with open(env_dest, "w") as fh:
                fh.write(
                    "PORT=5000\n"
                    "MONGO_URI=mongodb://localhost:27017/inventory-avengers\n"
                    "JWT_SECRET=PLACEHOLDER\n"
                    "JWT_EXPIRES_IN=7d\n"
                    "REFRESH_TOKEN_SECRET=PLACEHOLDER\n"
                    "REFRESH_TOKEN_EXPIRES_IN=30d\n"
                    "OWNER_EMAIL=owner@inventoryavengers.com\n"
                    "OWNER_PASSWORD=OwnerSecure#2024\n"
                )

        # Read the file and patch values that need to be unique per install
        with open(env_dest, "r") as fh:
            lines = fh.read().splitlines()

        patched = []
        for line in lines:
            if line.startswith("MONGO_URI="):
                # Extract only the URI value (right of the = sign)
                uri_value = line.split("=", 1)[1].strip()
                # Use urlparse to check the host specifically (avoids false
                # positives from query parameters that happen to contain the domain)
                try:
                    from urllib.parse import urlparse as _urlparse
                    _host = _urlparse(uri_value).hostname or ""
                except Exception:
                    _host = ""
                if _host.endswith(".mongodb.net"):
                    # Replace Atlas placeholder with local URI
                    patched.append("MONGO_URI=mongodb://localhost:27017/inventory-avengers")
                else:
                    patched.append(line)
            elif line.startswith("JWT_SECRET=") and (
                "change-me" in line or "PLACEHOLDER" in line or "your_" in line
            ):
                # Generate a unique cryptographic secret for this installation
                patched.append(f"JWT_SECRET={_secrets.token_hex(32)}")
            elif line.startswith("REFRESH_TOKEN_SECRET=") and (
                "change-me" in line or "PLACEHOLDER" in line or "your_" in line
            ):
                patched.append(f"REFRESH_TOKEN_SECRET={_secrets.token_hex(32)}")
            else:
                patched.append(line)

        with open(env_dest, "w") as fh:
            fh.write("\n".join(patched) + "\n")

    def _run_npm(self, cwd: str, args: list):
        npm = find_npm()
        cmd = [npm] + args
        result = subprocess.run(
            cmd, cwd=cwd,
            capture_output=True, text=True, timeout=600,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0)
        )
        # Echo last 15 lines of stdout
        if result.stdout:
            for line in result.stdout.splitlines()[-15:]:
                if line.strip():
                    self._log(f"    {line}")
        if result.returncode != 0:
            tail = (result.stderr or "")[-800:]
            if tail:
                self._log(tail)
            raise RuntimeError(
                f"npm {' '.join(args)} failed (exit {result.returncode})"
            )

    def _write_start_bat(self, install_dir: str):
        dst = os.path.join(install_dir, "start.bat")
        src = resource_path("start.bat")
        if os.path.exists(src):
            shutil.copy2(src, dst)
            return
        # Fallback: write a minimal start.bat
        backend_dir = os.path.join(install_dir, "backend")
        content = (
            "@echo off\n"
            "setlocal\n"
            f'set "BACKEND_DIR={backend_dir}"\n'
            "sc query MongoDB >nul 2>&1\n"
            "if %ERRORLEVEL% EQU 0 sc start MongoDB >nul 2>&1\n"
            f'cd /d "%BACKEND_DIR%"\n'
            'start "StockPilot" /MIN node server.js\n'
            "timeout /t 4 /nobreak >nul\n"
            f'start "" "{SERVER_URL}"\n'
            "endlocal\n"
        )
        with open(dst, "w") as fh:
            fh.write(content)

    def _create_shortcuts(self, install_dir: str) -> bool:
        try:
            import winshell  # type: ignore
            from win32com.client import Dispatch  # type: ignore
        except ImportError:
            return False

        target = os.path.join(install_dir, "start.bat")

        locations = [
            os.path.join(winshell.desktop(), f"{APP_NAME}.lnk"),
            os.path.join(
                winshell.programs(), APP_NAME, f"{APP_NAME}.lnk"
            ),
        ]
        for lnk_path in locations:
            try:
                os.makedirs(os.path.dirname(lnk_path), exist_ok=True)
                shell = Dispatch("WScript.Shell")
                sc = shell.CreateShortcut(lnk_path)
                sc.TargetPath = target
                sc.WorkingDirectory = install_dir
                sc.Description = APP_FULL
                sc.save()
            except Exception:
                pass
        return True

    # ── Step 3: Finish ─────────────────────────────────────────────────────────

    def _show_finish(self):
        f = self._clear()
        self._header(f, "Installation Complete!", f"{APP_FULL} is ready.")

        body = tk.Frame(f, bg=BG)
        body.pack(fill="both", expand=True, padx=34, pady=14)

        tk.Label(
            body, text="✅  StockPilot has been installed successfully.",
            font=("Segoe UI", 12, "bold"), bg=BG, fg="#00e676"
        ).pack(anchor="w", pady=(0, 12))

        info = (
            f"Installed to:  {self.install_dir.get()}\n\n"
            "To launch StockPilot:\n"
            "  • Double-click the StockPilot shortcut on your Desktop\n"
            "  • Or open Start Menu → StockPilot\n"
            "  • Or run start.bat in the install folder\n\n"
            f"The application opens in your browser at:  {SERVER_URL}\n\n"
            "Note: MongoDB must be running for the app to work.\n"
            "If it was just installed, a system reboot may be needed."
        )
        tk.Label(
            body, text=info,
            font=("Segoe UI", 10), bg=BG, fg=FG,
            justify="left", wraplength=560
        ).pack(anchor="w")

        row = self._btn_row(f)
        FlatButton(row, "Close", self.destroy, primary=False).pack(side="left")
        FlatButton(
            row, "🚀  Launch StockPilot", self._launch
        ).pack(side="right")

    def _launch(self):
        start_bat = os.path.join(self.install_dir.get(), "start.bat")
        if os.path.exists(start_bat):
            subprocess.Popen(
                ["cmd", "/c", start_bat],
                cwd=self.install_dir.get(),
                creationflags=subprocess.CREATE_NEW_CONSOLE
            )
        else:
            webbrowser.open(SERVER_URL)
        self.destroy()


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app = InstallerApp()
    app.mainloop()
