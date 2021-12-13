Get-Process -Name Spotify -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name SpotifyWebHelper -ErrorAction SilentlyContinue | Stop-Process -Force

$sp = "$env:APPDATA\Spotify\Spotify.exe"
Copy-Item $sp ($sp + ".backup")

$bytes = [System.IO.File]::ReadAllBytes($sp);
$toRemove = [System.Text.Encoding]::UTF8.GetBytes("force-dark-mode");

$sw = [System.Diagnostics.Stopwatch]::StartNew()
for ($i = 0; $i -lt $bytes.Length; $i++) {
    if ($sw.Elapsed.TotalMilliseconds -ge 1000) {
        Write-Progress -Activity "Eanbling dark mode in Spotify.exe" -status "Patching binary file $i" -percentComplete ($i / $bytes.Length*100);
        $sw.Reset();
        $sw.Start();
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

[System.IO.File]::WriteAllBytes($sp, $bytes);
if ( $found ) {
    Write-Host "The patch is complete." -ForegroundColor "Green"
} else {
    Write-Host "Failed to patch the file." -ForegroundColor "Red"
} 
