# Terminate Spotify processes
Get-Process -Name Spotify, SpotifyWebHelper -ErrorAction SilentlyContinue | Stop-Process -Force

# Backup Spotify executable
$sp = spicetify config spotify_path
$sp += "\Spotify.exe"
Copy-Item $sp ($sp + ".backup")

# Byte operations
$bytes = [System.IO.File]::ReadAllBytes($sp)
$toRemove = [System.Text.Encoding]::UTF8.GetBytes("force-dark-mode")

# Progress setup
$sw = [System.Diagnostics.Stopwatch]::StartNew()
for ($i = 0; $i -lt $bytes.Length; $i++) {
    if ($i -eq 0 -or $sw.Elapsed.TotalMilliseconds -ge 2000) {
        Write-Progress -Activity "Enabling dark mode in Spotify.exe" -status "Patching binary file $i" -percentComplete ($i / $bytes.Length*100);
        $sw.Restart();
    }
    $found = $true
    for ($j = 0; $j -lt $toRemove.Length; $j++) {
        if ($bytes[$i + $j] -ne $toRemove[$j]) {
            $found = $false;
            break;
        }
    }

    if ($found -eq $true) {
        for ($j = 0; $j -lt $toRemove.Length; $j++) {
            $bytes[$i + $j] = [byte]65;
        }
        break;
    }
}

# Write patched bytes back
[System.IO.File]::WriteAllBytes($sp, $bytes)

# Display result
if ($found) {
    Write-Host "The patch is complete." -ForegroundColor "Green"
} else {
    Write-Host "Failed to patch the file." -ForegroundColor "Red"
}