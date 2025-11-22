# Spicetify Dynamic Theme Uninstaller
# Modernized with improved error handling and logging

# Configuration
$ThemeName = "DefaultDynamic"
$DefaultTheme = "SpicetifyDefault"
$DefaultScheme = "green-dark"

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

# Prompt user for confirmation
function Confirm-Action {
  param(
    [Parameter(Mandatory=$true)]
    [string] $Message,
    
    [Parameter(Mandatory=$false)]
    [bool] $DefaultToYes = $false
  )
  
  if ($DefaultToYes) {
    $title = "${Message} [Y/n]"
    $yes = 'Y'
    $no = 'N'
  } else {
    $title = "${Message} [y/N]"
    $yes = 'y'
    $no = 'N'
  }
  
  do {
    $response = Read-Host -Prompt $title
    if ([string]::IsNullOrEmpty($response)) {
      $response = if ($DefaultToYes) { 'Y' } else { 'N' }
    }
    
    $response = $response.ToLower()
    
    if ($response -eq $yes.ToLower()) {
      return $true
    }
    elseif ($response -eq $no.ToLower()) {
      return $false
    }
    else {
      Write-Host "Please answer yes or no." -ForegroundColor Yellow
    }
  } while ($true)
}

# Reset Spicetify configuration
function Reset-SpicetifyConfig {
  try {
    Write-Log "Resetting Spicetify configuration..." "Info"
    
    # Reset to default theme and remove extensions
    spicetify config current_theme $DefaultTheme extensions default-dynamic.js- Vibrant.min.js- 2>$null
    
    Write-Log "Spicetify configuration reset to defaults" "Success"
  }
  catch {
    Write-Log "Failed to reset Spicetify configuration: $($_.Exception.Message)" "Error"
    throw $_
  }
}

# Remove theme files
function Remove-ThemeFiles {
  try {
    $spicePath = spicetify -c | Split-Path
    $themeDir = Join-Path $spicePath "Themes" $ThemeName
    $extensionsDir = Join-Path $spicePath "Extensions"
    
    Write-Part "REMOVING FOLDER "; Write-Emphasized $themeDir
    
    if (Test-Path $themeDir) {
      Remove-Item -Path $themeDir -Recurse -Force -ErrorAction Stop
      Write-Done
      Write-Log "Theme directory removed: $themeDir" "Success"
    } else {
      Write-Log "Theme directory not found: $themeDir" "Warning"
    }
    
    # Remove extension files
    $extensionFiles = @("default-dynamic.js", "Vibrant.min.js")
    $filesRemoved = $false
    
    foreach ($file in $extensionFiles) {
      $filePath = Join-Path $extensionsDir $file
      if (Test-Path $filePath) {
        Remove-Item -Path $filePath -Force -ErrorAction Stop
        Write-Log "Extension removed: $filePath" "Success"
        $filesRemoved = $true
      }
    }
    
    if (-not $filesRemoved) {
      Write-Log "No extension files found to remove" "Warning"
    }
  }
  catch {
    Write-Log "Failed to remove theme files: $($_.Exception.Message)" "Error"
    throw $_
  }
}

# Remove patches from config
function Remove-Patches {
  try {
    $spicePath = spicetify -c | Split-Path
    $configFile = Join-Path $spicePath "config-xpui.ini"
    
    Write-Part "UNPATCHING      "; Write-Emphasized $configFile
    
    if (Test-Path $configFile) {
      $content = Get-Content $configFile -Raw -ErrorAction Stop
      
      # Remove patch lines
      $content = $content -replace "(?s)\[Patch\].*?(?=\r?\n\w|\r?\n$)", ""
      
      # Clean up extra newlines
      $content = $content -replace "(\r?\n){3,}", "`r`n`r`n"
      $content = $content.Trim()
      
      Set-Content $configFile $content -NoNewline -ErrorAction Stop
      Write-Done
      Write-Log "Patches removed successfully" "Success"
    } else {
      Write-Log "Config file not found: $configFile" "Warning"
    }
  }
  catch {
    Write-Log "Failed to remove patches: $($_.Exception.Message)" "Error"
    throw $_
  }
}

# Apply changes
function Apply-Changes {
  try {
    Write-Part "APPLYING      ";
    
    $spicePath = spicetify -c | Split-Path
    $configFile = Get-Content (Join-Path $spicePath "config-xpui.ini") -Raw
    $hasBackup = $configFile -match "^version"
    
    if ($hasBackup) {
      Write-Emphasized "restore backup apply";
      spicetify restore backup apply
    } else {
      Write-Emphasized "apply";
      spicetify apply
    }
    
    Write-Done
    Write-Log "Changes applied successfully" "Success"
  }
  catch {
    Write-Log "Failed to apply changes: $($_.Exception.Message)" "Error"
    throw $_
  }
}

# Main uninstallation function
function Uninstall-DynamicTheme {
  try {
    Write-Log "Starting Spicetify Dynamic Theme uninstallation..." "Info"
    
    # Check if spicetify is available
    try {
      $spicetifyCommand = Get-Command spicetify -ErrorAction Stop
      Write-Log "Found spicetify at: $($spicetifyCommand.Source)" "Success"
    }
    catch {
      Write-Log "Spicetify not found in PATH" "Error"
      exit 1
    }
    
    # Confirm uninstallation
    if (-not (Confirm-Action "This will uninstall the Spicetify Dynamic Theme. Continue?")) {
      Write-Log "Uninstallation cancelled by user" "Warning"
      exit 0
    }
    
    # Perform uninstallation steps
    Reset-SpicetifyConfig
    Remove-ThemeFiles
    Remove-Patches
    Apply-Changes
    
    Write-Log "Uninstallation completed successfully!" "Success"
    Write-Log "Spicetify has been reset to default configuration" "Success"
  }
  catch {
    Write-Log "Uninstallation failed: $($_.Exception.Message)" "Error"
    exit 1
  }
}

# Main execution
try {
  $ErrorActionPreference = "Stop"
  Uninstall-DynamicTheme
}
catch {
  Write-Log "Fatal error during uninstallation: $($_.Exception.Message)" "Error"
  exit 1
}
