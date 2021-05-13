# DefaultDynamic for Spicetify
This is a tweaked version of the Default theme. The main difference is that the highligh color is dynamic, ie. it will match the current album art colours (note: local files are excluded).

## More
Requires spicetify-cli **v2.0 or newer**.

## Screenshots

#### Dark
![demo-dark](./Dark.gif)

### How to install
Run these command:

#### Linux and MacOS:
In **Bash**:
```bash
cd "$(dirname "$(spicetify -c)")/Themes/DefaultDynamic"
mkdir -p ../../Extensions
cp default-dynamic.js ../../Extensions/.
spicetify config extensions default-dynamic.js
spicetify config current_theme DefaultDynamic color_scheme dark
spicetify config inject_css 1 replace_colors 1
spicetify apply
```

#### Windows
In **Powershell**:
```powershell
cd "$(spicetify -c | Split-Path)\Themes\DefaultDynamic"
Copy-Item default-dynamic.js ..\..\Extensions
spicetify config extensions default-dynamic.js
spicetify config current_theme DefaultDynamic color_scheme dark
spicetify config inject_css 1 replace_colors 1
spicetify apply
```

# How to uninstall 

Remove the default-dynamic script with the following commands 

```
spicetify config extensions default-dynamic.js-
spicetify apply
```