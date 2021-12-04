# DefaultDynamic for [Spicetify](https://github.com/khanhas/spicetify-cli)
<a href="https://github.com/JulienMaille/spicetify-dynamic-theme/releases/latest"><img src="https://img.shields.io/github/release/JulienMaille/spicetify-dynamic-theme/all.svg"></a>

This is a tweaked version of the Default theme.
The main differences are the light/dark toggle, the background cover and the dynamic highligh color, ie. it will match the current album art.

## Preview
![demo-base](./Dark.gif)

## Install / Update
Make sure you are using spicetify >= v2.6.0 and Spotify >= v1.1.67.

### Windows (PowerShell)
```powershell
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/master/install.ps1" | Invoke-Expression
```

### Linux/MacOS (Bash)
```bash
curl -fsSL https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/master/install.sh | sh
```

## Follow system dark/light theme (PowerShell)
Automatic dark mode should work on MacOs and Linux out of the box.
From Spotify > v1.1.70, dark mode is forced in Windows builds. You will need to patch Spotify.exe using this script:
```powershell
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/master/patch-dark-mode.ps1" | Invoke-Expression
```

## Hide Window Controls:
Windows user, please edit your Spotify shortcut and add flag `--transparent-window-controls` after the Spotify.exe

![hide-controls](./windows-shortcut-instruction.png)

## How to uninstall 
Remove the default-dynamic script with the following commands 

```
spicetify config extensions default-dynamic.js-
spicetify apply
```
