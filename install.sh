#!/bin/sh

set -e

echo "Patching (1/3)"

# Determine correct patch target based on available xpui files
spicetify_config_dir="$(dirname "$(spicetify -c)")"
spotify_path=$(grep "^spotify_path\s*=" "$spicetify_config_dir/config-xpui.ini" | sed 's/^spotify_path\s*=\s*//' | xargs)
patch_target="xpui.js"
if [ -n "$spotify_path" ] && [ -f "$spotify_path/Apps/xpui/xpui-modules.js" ]; then
    patch_target="xpui-modules.js"
elif [ -n "$spotify_path" ] && [ -f "$spotify_path/Apps/xpui/xpui-snapshot.js" ]; then
    patch_target="xpui-snapshot.js"
fi

PATCH="[Patch]
${patch_target}_find_8008 = ,(\\\\w+=)32,
${patch_target}_repl_8008 = ,\\\${1}28,"
cd "$spicetify_config_dir"
if cat config-xpui.ini | grep -o '\[Patch\]'; then
    while true; do
        read -p "Existing Spicetify patches will be overwritten. Do you wish to continue? [y/n] " yn </dev/tty
        case $yn in
        [Yy]*) break ;;
        [Nn]*) exit ;;
        *) echo "Please answer yes or no." ;;
        esac
    done

    perl -i -0777 -pe "s/\[Patch\].*?($|(\r*\n){2})/${PATCH}\n\n/s" config-xpui.ini
else
    echo "\n${PATCH}" >>config-xpui.ini
fi

echo "Downloading (2/3)"
# Setup directories to download to
theme_dir="$(dirname "$(spicetify -c)")/Themes/DefaultDynamic"
ext_dir="$(dirname "$(spicetify -c)")/Extensions"

# Make directories if needed
mkdir -p "${theme_dir}"
mkdir -p "${ext_dir}"

# Download latest files from main branch
curl --progress-bar --output "${theme_dir}/color.ini" "https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/refs/heads/main/color.ini"
curl --progress-bar --output "${theme_dir}/user.css" "https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/refs/heads/main/user.css"
curl --progress-bar --output "${ext_dir}/default-dynamic.js" "https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/refs/heads/main/default-dynamic.js"
curl --progress-bar --output "${ext_dir}/Vibrant.min.js" "https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme/refs/heads/main/Vibrant.min.js"

echo "Applying theme (3/3)"
spicetify config extensions dribbblish.js- extensions dribbblish-dynamic.js-
spicetify config extensions default-dynamic.js extensions Vibrant.min.js
spicetify config current_theme DefaultDynamic color_scheme base
spicetify config inject_css 1 replace_colors 1
spicetify apply

echo "All done!"
