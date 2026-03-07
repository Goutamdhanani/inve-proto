; =============================================================================
; StockPilot (Inventory Avengers) — Inno Setup Script
; Produces: StockPilotSetup.exe
;
; Prerequisites required in installer\prereqs\ before compiling:
;   node_installer.msi  — Node.js LTS Windows x64 MSI installer
;   mongo_installer.msi — MongoDB Community Server MSI
;
; Compile with:
;   iscc installer.iss
; =============================================================================

#define AppName      "StockPilot"
#define AppFullName  "StockPilot (Inventory Avengers)"
#define AppVersion   "1.0.0"
#define AppPublisher "Inventory Avengers Team"
#define AppURL       "http://localhost:5000"
#define AppExeName   "start.bat"
#define AppIcon      ""

[Setup]
; Unique application identifier — regenerate if forking
AppId={{A3F7C2E1-4B6D-4A8E-9F0C-1D2E3B4A5C6D}
AppName={#AppFullName}
AppVersion={#AppVersion}
AppVerName={#AppFullName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=yes
; Output settings
OutputDir=dist
OutputBaseFilename=StockPilotSetup
; Compression
Compression=lzma2/ultra64
SolidCompression=yes
; Require admin rights (to write to Program Files and install services)
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
; UI
WizardStyle=modern
WizardSizePercent=120
ShowLanguageDialog=no
; Uninstaller
UninstallDisplayIcon={app}\start.bat
UninstallDisplayName={#AppFullName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon";   Description: "{cm:CreateDesktopIcon}";   GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startmenuicon"; Description: "Create a Start Menu shortcut"; GroupDescription: "{cm:AdditionalIcons}"

; =============================================================================
; Files
; =============================================================================
[Files]
; --- Project source files ---
Source: "..\backend\*";  DestDir: "{app}\backend";  Flags: recursesubdirs ignoreversion createallsubdirs
Source: "..\frontend\*"; DestDir: "{app}\frontend"; Flags: recursesubdirs ignoreversion createallsubdirs

; --- Batch scripts ---
Source: "start.bat";  DestDir: "{app}"; Flags: ignoreversion
Source: "setup.bat";  DestDir: "{app}"; Flags: ignoreversion

; --- .env.example (copied as .env so the app can start) ---
Source: "..\\.env.example"; DestDir: "{app}"; DestName: ".env"; Flags: ignoreversion onlyifdoesntexist

; --- Prerequisite installers (extracted to {tmp}, deleted after use) ---
Source: "prereqs\node_installer.msi"; DestDir: "{tmp}"; Flags: deleteafterinstall
Source: "prereqs\mongo_installer.msi"; DestDir: "{tmp}"; Flags: deleteafterinstall

; =============================================================================
; Icons / Shortcuts
; =============================================================================
[Icons]
; Start Menu
Name: "{group}\{#AppFullName}";       Filename: "{app}\start.bat"; WorkingDir: "{app}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 14
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"

; Desktop (optional task)
Name: "{autodesktop}\{#AppFullName}"; Filename: "{app}\start.bat"; WorkingDir: "{app}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 14; Tasks: desktopicon

; =============================================================================
; Registry — remember install path for the uninstaller
; =============================================================================
[Registry]
Root: HKLM; Subkey: "SOFTWARE\{#AppName}"; ValueType: string; ValueName: "InstallDir"; ValueData: "{app}"; Flags: uninsdeletekey

; =============================================================================
; Run entries — executed in order after files are copied
; =============================================================================
[Run]
; 1. Install Node.js silently if not already present
Filename: "msiexec.exe"; \
    Parameters: "/i ""{tmp}\node_installer.msi"" /qn"; \
    StatusMsg: "Installing Node.js LTS (this may take a minute)..."; \
    Flags: waituntilterminated; \
    Check: not IsNodeInstalled

; 2. Install MongoDB silently if not already present
Filename: "msiexec.exe"; \
    Parameters: "/i ""{tmp}\mongo_installer.msi"" /qn SHOULD_INSTALL_COMPASS=""0"""; \
    StatusMsg: "Installing MongoDB Community Server (this may take a minute)..."; \
    Flags: waituntilterminated; \
    Check: not IsMongoInstalled

; 3. Run npm install + frontend build
Filename: "{cmd}"; \
    Parameters: "/C ""{app}\setup.bat"" > ""{app}\install.log"" 2>&1"; \
    WorkingDir: "{app}"; \
    StatusMsg: "Installing dependencies and building the application..."; \
    Flags: waituntilterminated runhidden

; 4. Launch the application after installation (optional — user can untick)
Filename: "{app}\start.bat"; \
    Description: "Launch StockPilot now"; \
    WorkingDir: "{app}"; \
    Flags: postinstall nowait skipifsilent shellexec

; =============================================================================
; Pascal script — helper functions
; =============================================================================
[Code]

// ---------------------------------------------------------------------------
// IsNodeInstalled — checks registry for Node.js installation
// ---------------------------------------------------------------------------
function IsNodeInstalled: Boolean;
begin
  Result := RegKeyExists(HKEY_LOCAL_MACHINE, 'SOFTWARE\Node.js') or
            RegKeyExists(HKEY_LOCAL_MACHINE, 'SOFTWARE\WOW6432Node\Node.js');
end;

// ---------------------------------------------------------------------------
// IsMongoInstalled — checks registry for MongoDB service / installation
// ---------------------------------------------------------------------------
function IsMongoInstalled: Boolean;
begin
  Result := RegKeyExists(HKEY_LOCAL_MACHINE, 'SOFTWARE\MongoDB\Server') or
            RegKeyExists(HKEY_LOCAL_MACHINE, 'SOFTWARE\WOW6432Node\MongoDB\Server') or
            DirExists('C:\Program Files\MongoDB\Server');
end;

// ---------------------------------------------------------------------------
// InitializeSetup — show a warning if prerequisite installers are missing
// ---------------------------------------------------------------------------
function InitializeSetup: Boolean;
var
  MissingFiles: String;
begin
  MissingFiles := '';
  if not FileExists(ExpandConstant('{src}\prereqs\node_installer.msi')) then
    MissingFiles := MissingFiles + #13#10 + '  prereqs\node_installer.msi (Node.js LTS)';
  if not FileExists(ExpandConstant('{src}\prereqs\mongo_installer.msi')) then
    MissingFiles := MissingFiles + #13#10 + '  prereqs\mongo_installer.msi (MongoDB Community)';

  if MissingFiles <> '' then begin
    MsgBox('The following prerequisite files are missing from the installer\prereqs\ folder:'
      + MissingFiles + #13#10#13#10
      + 'See installer\prereqs\README.md for download links.'
      + #13#10 + 'Installation will continue, but Node.js / MongoDB may need to be installed manually.',
      mbInformation, MB_OK);
  end;

  Result := True;
end;
