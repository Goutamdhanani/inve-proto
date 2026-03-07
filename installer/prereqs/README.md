# Prerequisites — Bundled Installers

This folder must contain the following two files **before** compiling
`installer.iss` with Inno Setup.  They are not committed to the repository
because of their size (>200 MB combined).

| File | Where to download |
|------|-------------------|
| `node_installer.msi` | [Node.js LTS (Windows x64)](https://nodejs.org/en/download) — choose the **Windows Installer (.msi) 64-bit** file and save as `node_installer.msi` |
| `mongo_installer.msi` | [MongoDB Community Server](https://www.mongodb.com/try/download/community) — choose **MSI**, Windows, x64 and save as `mongo_installer.msi` |

## Recommended versions

| Software | Recommended |
|----------|-------------|
| Node.js  | 20 LTS (current LTS) |
| MongoDB  | 7.x Community |

## Notes

* The Inno Setup script performs a registry-based check before running each
  installer, so if the end-user already has Node.js or MongoDB installed they
  will **not** be reinstalled.
* Both installers are extracted to `{tmp}` and deleted automatically after
  use, so the installed size is not inflated.
* If the files are missing, `InitializeSetup()` in the `.iss` script will
  show a warning but will still allow the installation to proceed (the user
  would need to install the prerequisites manually).

## Download helper (PowerShell)

Run the following snippet in PowerShell from this `prereqs\` directory to
download both files automatically (requires internet access):

```powershell
# Node.js 20 LTS (x64 MSI)
$nodeUrl = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
Invoke-WebRequest -Uri $nodeUrl -OutFile "node_installer.msi"

# MongoDB 7 Community (Windows x64 MSI)
$mongoUrl = "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.5-signed.msi"
Invoke-WebRequest -Uri $mongoUrl -OutFile "mongo_installer.msi"
```

> **Tip:** Update the version numbers in the URLs above to use the latest
> available releases.
