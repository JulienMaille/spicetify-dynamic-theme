# Copyright 2019 khanhas. GPL license.
# Edited from project Denoland install script (https://github.com/denoland/deno_install)
$PSMinVersion = 3

# Helper functions for pretty terminal output.
function Write-Part ([string] $Text) {
  Write-Host $Text -NoNewline
}

function Write-Emphasized ([string] $Text) {
  Write-Host $Text -NoNewLine -ForegroundColor "Cyan"
}

function Write-Done {
  Write-Host " > " -NoNewline
  Write-Host "OK" -ForegroundColor "Green"
}

if ($PSVersionTable.PSVersion.Major -gt $PSMinVersion) {
  $ErrorActionPreference = "Stop"

  # Enable TLS 1.2 since it is required for connections to GitHub.
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

  $checkSpice = Get-Command spicetify -ErrorAction Silent
  if ($null -eq $checkSpice) {
    Write-Host -ForegroundColor Red "Spicetify not found"
    Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/khanhas/spicetify-cli/master/install.ps1" | Invoke-Expression
  }

  # Check ~\spicetify-cli\Themes directory already exists
  $sp_dir = "${HOME}\spicetify-cli\Themes"
  if (-not (Test-Path $sp_dir)) {
    Write-Part "MAKING FOLDER  "; Write-Emphasized $sp_dir
    New-Item -Path $sp_dir -ItemType Directory | Out-Null
    Write-Done
  }

  # Download latest code from main branch.
  $zip_file = "${sp_dir}\main.zip"
  $download_uri = "https://github.com/JulienMaille/spicetify-dynamic-theme/archive/refs/heads/main.zip"
  Write-Part "DOWNLOADING    "; Write-Emphasized $download_uri;
  Invoke-WebRequest -Uri $download_uri -UseBasicParsing -OutFile $zip_file
  Write-Done

  # Extract theme from .zip file.
  Write-Part "EXTRACTING     "; Write-Emphasized $zip_file;
  Write-Part " into "; Write-Emphasized ${sp_dir};
  Expand-Archive -Path $zip_file -DestinationPath $sp_dir -Force
  Write-Done

  # Remove .zip file.
  Write-Part "REMOVING       "; Write-Emphasized $zip_file;
  Remove-Item -Path $zip_file
  Write-Done

  # Check ~\.spicetify.\Themes directory already exists
  $spicePath = spicetify -c | Split-Path
  $sp_dot_dir = "$spicePath\Themes\DefaultDynamic"
  if (-not (Test-Path $sp_dot_dir)) {
    Write-Part "MAKING FOLDER  "; Write-Emphasized $sp_dot_dir
    New-Item -Path $sp_dot_dir -ItemType Directory | Out-Null
    Write-Done
  }

  # Copy to .spicetify.
  Write-Part "COPYING        "; Write-Emphasized $sp_dot_dir;
  Copy-Item -Path "${sp_dir}\spicetify-dynamic-theme-main\*" -Destination $sp_dot_dir -Recurse -Force
  Write-Done

  # Installing.
  Write-Host "INSTALLING     ";
  cd $sp_dot_dir
  Copy-Item default-dynamic.js ..\..\Extensions
  Copy-Item Vibrant.min.js ..\..\Extensions
  spicetify config extensions dribbblish-dynamic.js- extensions dribbblish.js-
  spicetify config extensions default-dynamic.js extensions Vibrant.min.js
  spicetify config current_theme DefaultDynamic
  spicetify config inject_css 1 replace_colors 1
  Write-Done

  # Add patch
  Write-Part "PATCHING       "; Write-Emphasized "$spicePath\config-xpui.ini";
  $configFile = Get-Content "$spicePath\config-xpui.ini"
  $modified = $false

  # Determine the correct patch target file
  # xpui.js exists on older Spotify (<1.2.64), xpui-modules.js/xpui-snapshot.js on newer
  $patchTarget = "xpui.js"
  $spotCfg = Get-Content "$spicePath\config-xpui.ini" -Raw
  if ($spotCfg -match "(?m)^spotify_path\s*=\s*(.+?)$") {
    $xpuiDir = "$($Matches[1].Trim())\Apps\xpui"
    if (Test-Path "$xpuiDir\xpui-modules.js") {
      $patchTarget = "xpui-modules.js"
    } elseif (Test-Path "$xpuiDir\xpui-snapshot.js") {
      $patchTarget = "xpui-snapshot.js"
    }
  }

  # Remove stale patches for other target files
  $staleTargets = @("xpui.js", "xpui-snapshot.js", "xpui-modules.js") | Where-Object { $_ -ne $patchTarget }
  foreach ($stale in $staleTargets) {
    $staleFind = $configFile -match "${stale}_find_8008"
    if ($staleFind) {
      $configFile = $configFile -replace [regex]::escape($staleFind), ""
      $modified = $true
    }
    $staleRepl = $configFile -match "${stale}_repl_8008"
    if ($staleRepl) {
      $configFile = $configFile -replace [regex]::escape($staleRepl), ""
      $modified = $true
    }
  }

  # Add new patch if missing
  $findKey = "${patchTarget}_find_8008"
  if (-not ($configFile -match $findKey)) {
    $rep = @"
[Patch]
${patchTarget}_find_8008=,(\w+=)32,
${patchTarget}_repl_8008=,`${1}28,
"@
    # In case missing Patch section
    if (-not ($configFile -match "\[Patch\]")) {
      $configFile += "`n[Patch]`n"
    }
    $configFile = $configFile -replace "\[Patch\]",$rep
    $modified = $true
  }

  if ($modified) {
    Set-Content "$spicePath\config-xpui.ini" $configFile
  }
  Write-Done

  Write-Part "APPLYING     ";
  $backupVer = $configFile -match "^version"
  if ($backupVer -and $backupVer -match "version\s*=\s*(.+)") {
    Write-Emphasized "apply";
    spicetify apply
  } else {
    Write-Emphasized "restore backup apply";
    spicetify restore backup apply
  }
  Write-Done
}
else {
  Write-Part "`nYour Powershell version is less than "; Write-Emphasized "$PSMinVersion";
  Write-Part "`nPlease, update your Powershell downloading the "; Write-Emphasized "'Windows Management Framework'"; Write-Part " greater than "; Write-Emphasized "$PSMinVersion"
}
