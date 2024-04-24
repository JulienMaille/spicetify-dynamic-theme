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

spicetify config current_theme " " extensions default-dynamic.js- Vibrant.min.js-

$spicePath = spicetify -c | Split-Path
$sp_dot_dir = "$spicePath\Themes\DefaultDynamic"
Write-Part "REMOVING FOLDER "; Write-Emphasized "$sp_dot_dir"
Remove-Item -Recurse -Force "$sp_dot_dir" -ErrorAction Ignore
Write-Done

# Add patch
Write-Part "UNPATCHING      "; Write-Emphasized "$spicePath\config-xpui.ini";
$configFile = Get-Content "$spicePath\config-xpui.ini"
$find = $configFile -match "xpui.js_find_8008"
if ($find) {
    $configFile = $configFile -replace [regex]::escape($find),""
}
$repl = $configFile -match "xpui.js_repl_8008"
if ($repl) {
    $configFile = $configFile -replace [regex]::escape($repl),""
}
Set-Content "$spicePath\config-xpui.ini" $configFile
Write-Done

Write-Part "APPLYING      ";
$backupVer = $configFile -match "^version"
$parts = $backupVer.Split("=")
if ($parts.Length -lt 2 -and $version.version.Length -gt 0) {
    Write-Emphasized "apply";
    spicetify apply
} else {
    Write-Emphasized "restore backup apply";
    spicetify restore  backup apply
}
Write-Done
