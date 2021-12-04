# DefaultDynamic for Spicetify
This is a tweaked version of the Default theme.
The main differences are the the light/dark toggle, the background cover and the dynamic highligh color, ie. it will match the current album art.

## Screenshots
![demo-base](./Dark.gif)

## Install / Update
Make sure you are using spicetify >= v2.6.0 and Spotify >= v1.1.67.

### Windows (Powershell)
```powershell
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/master/install.ps1" | Invoke-Expression
```
#### Hide Window Controls:
Windows user, please edit your Spotify shortcut and add flag `--transparent-window-controls` after the Spotify.exe

![hide-controls](./windows-shortcut-instruction.png)

### Linux and MacOS (Bash)
**Uninstall legacy themes with js**, especially Dribbblish or DribbblishDynamic: https://github.com/morpheusthewhite/spicetify-themes/tree/master/DribbblishDynamic#how-to-uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/master/install.sh | sh
```

# How to uninstall 
Remove the default-dynamic script with the following commands 

```
spicetify config extensions default-dynamic.js-
spicetify apply
```
