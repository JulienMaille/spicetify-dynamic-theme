# DefaultDynamic for Spicetify
This is a tweaked version of the Default theme.
The main differences are the the light/dark toggle, the background cover and the dynamic highligh color, ie. it will match the current album art.

Requires spicetify-cli **v2.6 or newer**.

## Screenshots
![demo-base](./Dark.gif)

## How to install
Run these command:

### Windows
In **Powershell**:
```powershell
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/master/install.ps1" | Invoke-Expression
```
#### Hide Window Controls:
Windows user, please edit your Spotify shortcut and add flag `--transparent-window-controls` after the Spotify.exe
![hide-controls](./windows-shortcut-instruction.png)

### Linux and MacOS:
**Uninstall legacy themes with js**, especially Dribbblish or DribbblishDynamic: https://github.com/morpheusthewhite/spicetify-themes/tree/master/DribbblishDynamic#how-to-uninstall

In **Bash**:
```bash
curl -fsSL https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/master/install.sh | sh
```

# How to uninstall 
Remove the default-dynamic script with the following commands 

```
spicetify config extensions default-dynamic.js-
spicetify config extensions Vibrant.min.js-
spicetify apply
```
