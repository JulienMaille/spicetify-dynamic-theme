# DefaultDynamic for Spicetify
This is a tweaked version of the Default theme.
The main differences are the the light/dark toggle, the background cover and the dynamic highligh color, ie. it will match the current album art (note: local files are excluded).

Requires spicetify-cli **v2.2 or newer**.

## Screenshots
![demo-base](./Dark.gif)

## How to install
Run these command:

#### Windows
In **Powershell**:
```powershell
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/master/install.ps1" | Invoke-Expression
```

#### Linux and MacOS:
**Uninstall legacy themes**, especially Dribbblish or DribbblishDynamic: https://github.com/morpheusthewhite/spicetify-themes/tree/master/DribbblishDynamic#how-to-uninstall

In **Bash**:
```bash
cd "$(dirname "$(spicetify -c)")/Themes/DefaultDynamic"
mkdir -p ../../Extensions
cp default-dynamic.js ../../Extensions/.
spicetify config extensions default-dynamic.js
spicetify config current_theme DefaultDynamic
spicetify config inject_css 1 replace_colors 1 overwrite_assets 1
spicetify apply
```

# How to uninstall 
Remove the default-dynamic script with the following commands 

```
spicetify config extensions default-dynamic.js-
spicetify apply
```
