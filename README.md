# DefaultDynamic for [Spicetify](https://github.com/spicetify/cli)

[![Release](https://img.shields.io/github/release/JulienMaille/spicetify-dynamic-theme/all.svg)](https://github.com/JulienMaille/spicetify-dynamic-theme/releases/latest)
[![License](https://img.shields.io/github/license/JulienMaille/spicetify-dynamic-theme)](LICENSE)
[![Spicetify CLI](https://img.shields.io/github/release/spicetify/cli/all.svg?label=Spicetify)](https://github.com/spicetify/cli/releases/latest)
[![Marketplace](https://img.shields.io/github/v/release/spicetify/marketplace?label=Marketplace)](https://github.com/spicetify/marketplace/wiki/Installation#auto-install)

A modern, feature-rich theme for Spicetify that dynamically adapts to your music. This enhanced version of the Default theme includes automated light/dark mode switching, animated album art backgrounds, and dynamic color extraction that matches the current album artwork.

## ✨ Features

- 🎨 **Dynamic Colors**: Automatically extracts and applies colors from album artwork
- 🌓 **Smart Theme Switching**: Seamless light/dark mode toggle with a single click
- 🎭 **Animated Backgrounds**: Beautiful, subtle animations using album art
- 📱 **Responsive Design**: Optimized for all screen sizes
- 🎵 **Enhanced UI**: Improved lyrics display, track info, and visual elements
- 🔔 **Update Notifications**: Built-in update checker for the latest theme versions
- ⚡ **Performance Optimized**: Efficient color extraction and smooth transitions

## 🖼️ Preview

![demo-base](./preview.gif)

## 🚀 Installation

> [!IMPORTANT]
> **Prerequisites**: Ensure you're using the latest versions of [Spicetify CLI](https://github.com/spicetify/cli/releases/latest) and [Spotify](https://www.spotify.com/us/download/other/)
> 
> **Recommended**: Install via [Spicetify Marketplace](https://github.com/spicetify/marketplace/wiki/Installation#auto-install) for the easiest experience

### Quick Install (Recommended)

#### Windows (PowerShell)
```powershell
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/main/install.ps1" | Invoke-Expression
```

#### Linux/macOS (Bash)
```bash
curl -fsSL https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/main/install.sh | sh
```

### Manual Installation

1. **Download**: Get the latest [Source code (zip)](https://github.com/JulienMaille/spicetify-dynamic-theme/releases/latest)
2. **Extract**: Unzip to your Spicetify Themes folder and rename to `DefaultDynamic`
3. **Copy Extensions**: Move `default-dynamic.js` and `Vibrant.min.js` to your Spicetify Extensions folder
4. **Configure**:
   ```bash
   spicetify config extensions default-dynamic.js extensions Vibrant.min.js
   spicetify config current_theme DefaultDynamic
   spicetify config color_scheme base
   spicetify config inject_css 1 replace_colors 1
   spicetify apply
   ```

> 📁 **Folder Locations**:
> - **Themes**: `<Spicetify Config>/Themes/DefaultDynamic`
> - **Extensions**: `<Spicetify Config>/Extensions/`
> - **Config**: Run `spicetify -c` to find your config directory

## ⚙️ Configuration

### Theme Settings
- **Light/Dark Mode**: Toggle between themes using the moon icon in the top bar or via Spicetify settings
- **Background Animation**: Enable/disable animated backgrounds by changing the color scheme in Spicetify settings
- **Color Scheme**: Choose from various preset color schemes

### Advanced Options
The theme includes several CSS custom properties that can be customized:

```css
:root {
    --blur-amount: 50px;           /* Background blur intensity */
    --contrast-amount: 3;          /* Background contrast */
    --saturation-amount: 1.5;      /* Background saturation */
    --animation-duration: 45s;      /* Animation speed */
}
```

## 🗑️ Uninstallation

### Automated Uninstall

#### Windows (PowerShell)
```powershell
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/main/uninstall.ps1" | Invoke-Expression
```

#### Linux/macOS (Bash)
```bash
curl -fsSL https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/main/uninstall.sh | sh
```

### Manual Uninstall
```bash
spicetify config current_theme " " extensions default-dynamic.js- extensions Vibrant.min.js-
spicetify apply
```

Then manually delete:
- `<Spicetify Config>/Themes/DefaultDynamic/`
- `<Spicetify Config>/Extensions/default-dynamic.js`
- `<Spicetify Config>/Extensions/Vibrant.min.js`

## 🛠️ Development

### Project Structure
```
spicetify-dynamic-theme/
├── default-dynamic.js    # Main theme logic and color extraction
├── user.css            # CSS styling and animations
├── color.ini           # Color scheme definitions
├── manifest.json       # Theme metadata for Marketplace
├── install.sh          # Linux/macOS installation script
├── install.ps1         # Windows installation script
├── uninstall.sh        # Linux/macOS uninstallation script
├── uninstall.ps1       # Windows uninstallation script
└── Vibrant.min.js      # Color extraction library
```

### Building & Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

The project uses modern JavaScript (ES2021+) and follows best practices for maintainability and performance.

## 🐛 Troubleshooting

### Common Issues

**Theme not applying:**
- Ensure Spicetify CLI is up to date
- Run `spicetify restore backup apply` and try again
- Check that all files are in the correct directories

**Colors not updating:**
- Verify `default-dynamic.js` is properly installed in Extensions
- Check browser console for errors
- Try refreshing Spotify

**Installation script fails:**
- Ensure you have proper permissions
- Check your internet connection
- Try manual installation as a fallback

### Getting Help
- [GitHub Issues](https://github.com/JulienMaille/spicetify-dynamic-theme/issues) - Report bugs and request features
- [Spicetify Discord](https://discord.gg/VneaGqxw) - Community support
- [Spicetify Docs](https://spicetify.app/docs/) - Official documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Credits

- [Spicetify](https://github.com/spicetify/cli) - Amazing Spotify customization tool
- [Vibrant.js](https://jariz.github.io/vibrant.js/) - Color extraction library
- [Spicetify Marketplace](https://github.com/spicetify/marketplace) - Theme distribution platform

---

**Enjoy your enhanced Spotify experience! 🎵**