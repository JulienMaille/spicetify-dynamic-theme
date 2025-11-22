# Copyright 2019 khanhas. GPL license.
# Edited from project Denoland install script (https://github.com/denoland/deno_install)
# Modernized with improved error handling and logging

param (
  [Parameter(Mandatory=$false)]
  [string] $Version,
  
  [Parameter(Mandatory=$false)]
  [string] $v
)

# Configuration
$PSMinVersion = 3
$RepoOwner = "JulienMaille"
$RepoName = "spicetify-dynamic-theme"
$ThemeName = "DefaultDynamic"

# Handle version parameter alias
if ($v) {
  $Version = $v
}

# Enhanced logging functions
function Write-Log {
  param(
    [Parameter(Mandatory=$true)]
    [string] $Message,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("Info", "Success", "Warning", "Error")]
    [string] $Level = "Info"
  )
  
  $timestamp = Get-Date -Format "HH:mm:ss"
  $prefix = switch ($Level) {
    "Info"    { "[INFO]" }
    "Success" { "[OK]" }
    "Warning" { "[WARN]" }
    "Error"   { "[ERROR]" }
  }
  
  $color = switch ($Level) {
    "Info"    { "White" }
    "Success" { "Green" }
    "Warning" { "Yellow" }
    "Error"   { "Red" }
  }
  
  Write-Host "${timestamp} ${prefix} " -NoNewline -ForegroundColor Gray
  Write-Host $Message -ForegroundColor $color
}

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

# Error handling
function Test-Prerequisites {
  try {
    if ($PSVersionTable.PSVersion.Major -lt $PSMinVersion) {
      throw "PowerShell version $PSMinVersion or higher is required. Current version: $($PSVersionTable.PSVersion.Major)"
    }
    
    # Check if spicetify is available
    $spicetifyCommand = Get-Command spicetify -ErrorAction Stop
    Write-Log "Found spicetify at: $($spicetifyCommand.Source)" "Success"
    
    # Enable TLS 1.2 for GitHub connections
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Write-Log "TLS 1.2 enabled for secure connections" "Success"
    
  }
  catch {
    Write-Log $_.Exception.Message "Error"
    
    if ($_.Exception.Message -like "*spicetify*") {
      Write-Log "Attempting to install spicetify-cli..." "Warning"
      try {
        Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/khanhas/spicetify-cli/master/install.ps1" | Invoke-Expression
        Write-Log "Spicetify-cli installed successfully" "Success"
      }
      catch {
        Write-Log "Failed to install spicetify-cli. Please install it manually." "Error"
        exit 1
      }
    }
    else {
      exit 1
    }
  }
}

# Main installation logic
function Install-DynamicTheme {
  try {
    Write-Log "Starting Spicetify Dynamic Theme installation..." "Info"
    
    # Test prerequisites
    Test-Prerequisites
    
    # Determine version to install
    $targetVersion = $Version
    if (-not $targetVersion) {
      Write-Log "Fetching latest release information..." "Info"
      $latestReleaseUri = "https://api.github.com/repos/${RepoOwner}/${RepoName}/releases/latest"
      Write-Part "DOWNLOADING    "; Write-Emphasized $latestReleaseUri;
      
      try {
        $latestReleaseJson = Invoke-WebRequest -Uri $latestReleaseUri -UseBasicParsing -ErrorAction Stop
        $releaseData = $latestReleaseJson | ConvertFrom-Json
        $targetVersion = $releaseData.tag_name -replace "v", ""
        Write-Log "Latest version found: $targetVersion" "Success"
        Write-Done
      }
      catch {
        Write-Log "Failed to fetch latest version from GitHub API" "Error"
        throw $_
      }
    } else {
      Write-Log "Installing specified version: $targetVersion" "Info"
    }
    
    # Download and extract theme
    $tempDir = "${env:TEMP}\spicetify-theme-${targetVersion}"
    $zipFile = "${tempDir}.zip"
    $downloadUri = "https://github.com/${RepoOwner}/${RepoName}/archive/refs/tags/${targetVersion}.zip"
    
    try {
      Write-Part "DOWNLOADING    "; Write-Emphasized $downloadUri;
      Invoke-WebRequest -Uri $downloadUri -UseBasicParsing -OutFile $zipFile -ErrorAction Stop
      Write-Done
      
      Write-Part "EXTRACTING     "; Write-Emphasized $zipFile;
      if (Test-Path $tempDir) {
        Remove-Item -Path $tempDir -Recurse -Force
      }
      Expand-Archive -Path $zipFile -DestinationPath $env:TEMP -Force
      Write-Done
      
      # Remove zip file
      Remove-Item -Path $zipFile -Force
    }
    catch {
      Write-Log "Failed to download or extract theme files" "Error"
      throw $_
    }
    
    # Get spicetify config directory
    $spicetifyConfig = spicetify -c | Split-Path
    $themeDir = Join-Path $spicetifyConfig "Themes" $ThemeName
    $extensionsDir = Join-Path $spicetifyConfig "Extensions"
    
    # Create directories if they don't exist
    if (-not (Test-Path $themeDir)) {
      Write-Part "MAKING FOLDER  "; Write-Emphasized $themeDir
      New-Item -Path $themeDir -ItemType Directory -Force | Out-Null
      Write-Done
    }
    
    if (-not (Test-Path $extensionsDir)) {
      Write-Part "MAKING FOLDER  "; Write-Emphasized $extensionsDir
      New-Item -Path $extensionsDir -ItemType Directory -Force | Out-Null
      Write-Done
    }
    
    # Copy theme files
    Write-Part "COPYING        "; Write-Emphasized $themeDir;
    $sourceDir = "${env:TEMP}\${RepoName}-${targetVersion}"
    Copy-Item -Path (Join-Path $sourceDir "*.css") -Destination $themeDir -Force
    Copy-Item -Path (Join-Path $sourceDir "*.ini") -Destination $themeDir -Force
    Copy-Item -Path (Join-Path $sourceDir "*.js") -Destination $extensionsDir -Force
    Write-Done
    
    # Configure spicetify
    Write-Log "Configuring spicetify..." "Info"
    try {
      # Remove conflicting extensions
      spicetify config extensions dribbblish-dynamic.js- extensions dribbblish.js- 2>$null
      
      # Add new extensions
      spicetify config extensions default-dynamic.js extensions Vibrant.min.js
      
      # Set theme
      spicetify config current_theme $ThemeName color_scheme base
      spicetify config inject_css 1 replace_colors 1
      
      Write-Log "Spicetify configuration updated" "Success"
    }
    catch {
      Write-Log "Failed to configure spicetify" "Error"
      throw $_
    }
    
    # Apply patches
    Apply-Patches $spicetifyConfig
    
    # Apply theme
    Apply-ThemeChanges $spicetifyConfig
    
    # Cleanup
    if (Test-Path $sourceDir) {
      Remove-Item -Path $sourceDir -Recurse -Force
    }
    
    Write-Log "Installation completed successfully!" "Success"
    Write-Log "Theme installed: $ThemeName v$targetVersion" "Success"
  }
  catch {
    Write-Log "Installation failed: $($_.Exception.Message)" "Error"
    exit 1
  }
}

function Apply-Patches {
  param([string] $ConfigPath)
  
  Write-Part "PATCHING       "; Write-Emphasized "$ConfigPath\config-xpui.ini";
  
  try {
    $configFile = Get-Content "$ConfigPath\config-xpui.ini" -Raw
    
    if ($configFile -notmatch "xpui.js_find_8008") {
      $patchContent = @"
[Patch]
xpui.js_find_8008=,(\w+=)32,
xpui.js_repl_8008=,`${1}28,
"@
      
      # Ensure Patch section exists
      if ($configFile -notmatch "\[Patch\]") {
        $configFile += "`n[Patch]`n"
      }
      
      # Replace existing Patch section
      $configFile = $configFile -replace "\[Patch\].*", $patchContent
      Set-Content "$ConfigPath\config-xpui.ini" $configFile -NoNewline
      
      Write-Log "Patches applied successfully" "Success"
    } else {
      Write-Log "Patches already exist, skipping" "Warning"
    }
    
    Write-Done
  }
  catch {
    Write-Log "Failed to apply patches" "Error"
    throw $_
  }
}

function Apply-ThemeChanges {
  param([string] $ConfigPath)
  
  Write-Part "APPLYING     ";
  
  try {
    $configFile = Get-Content "$ConfigPath\config-xpui.ini" -Raw
    $hasBackup = $configFile -match "^version"
    
    if ($hasBackup) {
      Write-Emphasized "restore backup apply";
      spicetify restore backup apply
    } else {
      Write-Emphasized "apply";
      spicetify apply
    }
    
    Write-Done
    Write-Log "Theme applied successfully" "Success"
  }
  catch {
    Write-Log "Failed to apply theme changes" "Error"
    throw $_
  }
}

# Main execution
if ($PSVersionTable.PSVersion.Major -ge $PSMinVersion) {
  $ErrorActionPreference = "Stop"
  Install-DynamicTheme
}
else {
  Write-Log "PowerShell version $PSMinVersion or higher is required. Current version: $($PSVersionTable.PSVersion.Major)" "Error"
  Write-Part "`nPlease update your PowerShell by downloading the "; Write-Emphasized "'Windows Management Framework'"; Write-Part " greater than "; Write-Emphasized "$PSMinVersion"
  exit 1
}
