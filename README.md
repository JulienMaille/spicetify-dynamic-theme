# DefaultDynamic for [Spicetify](https://github.com/khanhas/spicetify-cli)

<a href="https://github.com/JulienMaille/spicetify-dynamic-theme/releases/latest"><img src="https://img.shields.io/github/release/JulienMaille/spicetify-dynamic-theme/all.svg"></a>

This is a tweaked version of the Default theme.
The main differences are the light/dark toggle, the background cover and the dynamic highlight color, ie. it will match the current album art.

## Preview

![demo-base](./Dark.gif)

## Install / Update

Make sure you are using latest releases of Spicetify and Spotify

### Windows (PowerShell)

```powershell
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/master/install.ps1" | Invoke-Expression
```

### Linux/MacOS (Bash)

```bash
curl -fsSL https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/master/install.sh | sh
```

### Manual Install

1. Download the latest [Source code (zip)](https://github.com/JulienMaille/spicetify-dynamic-theme/releases/latest)
2. Extract the files to your [Spicetify/Themes folder](https://spicetify.app/docs/development/customization#themes) (rename the zipped folder to `DefaultDynamic`)
3. Copy `default-dynamic.js` to your [Spicetify/Extensions folder](https://spicetify.app/docs/advanced-usage/extensions#installing)
4. Add the 2 lines in `[Patch]` section of the config file (see details below)
5. Run:
    ```
    spicetify config extensions default-dynamic.js extensions Vibrant.min.js
    spicetify config current_theme DefaultDynamic
    spicetify config color_scheme base
    spicetify config inject_css 1 replace_colors 1
    spicetify apply
    ```

## IMPORTANT!

From Spotify > v1.1.62, in sidebar, they use an adaptive render mechanic to actively show and hide items on scroll. It helps reducing number of items to render, hence there is significant performance boost if you have a large playlists collection. But the drawbacks is that item height is hard-coded, it messes up user interaction when we explicitly change, in CSS, playlist item height bigger than original value. So you need to add these 2 lines in Patch section in config file:

To patch the Spotify config file follow these steps:

- Run Spicetify and make sure the config file is created successfully. You can find the config file in `\spicetify` or in the installation folder returned by `spicetify -c`.
- Open the config file with a text editor and find the `[Patch]` section. Add these two lines at the end of the section:
  ```ini
   [Patch]
   xpui.js_find_8008 = ,(\w+=)32,
   xpui.js_repl_8008 = ,${1}28,
  ```
- Save the config file and run `spicetify backup apply` in the terminal or command prompt. This will back up and patch the Spotify files with your changes. If Everything is successful, youll see
  ```
  Patching:
  success "xpui.js_find_8008" is patched
  ```
- Restart Spotify and enjoy your Spicetify theme without the sidebar issue.

## Follow system dark/light theme (PowerShell)

Automatic dark mode is broken on MacOs and Linux.
From Spotify > v1.2.17, dark mode is forced in Windows builds. You will need to patch Spotify.exe using this script:

```powershell
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/master/patch-dark-mode.ps1" | Invoke-Expression
```
## Uninstall

### Windows (PowerShell)

```powershell
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/master/uninstall.ps1" | Invoke-Expression
```

### Linux/MacOS (Bash)

```bash
curl -fsSL https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/master/uninstall.sh | sh
```

### Manual Uninstall

1. Remove Patch lines you added in config file earlier.
2. Run:
    ```
    spicetify config current_theme " " color_scheme " " extensions default-dynamic.js- extensions Vibrant.min.js-
    spicetify apply
    ```
