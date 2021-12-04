$sp = "$env:APPDATA\Spotify\Spotify.exe"
Copy-Item $sp ($sp + ".backup")

$bytes = [System.IO.File]::ReadAllBytes($sp);
$toRemove = [System.Text.Encoding]::UTF8.GetBytes("force-dark-mode");

for ($i = 0; $i -lt $bytes.Length; $i++) {
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