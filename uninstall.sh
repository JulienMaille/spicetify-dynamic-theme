#!/bin/sh

set -e

cd "$(dirname "$(spicetify -c)")"

echo "Unpatching (1/3)"
if cat config-xpui.ini | grep -o '\[Patch\]'; then
    while true; do
        read -p "All Spicetify custom patches will be deleted. Is this ok? [y/n] " yn </dev/tty
        case $yn in
        [Yy]*) break ;;
        [Nn]*) exit ;;
        *) echo "Please answer yes or no." ;;
        esac
    done
    perl -i -0777 -pe "s/\[Patch\].*?($|(\r*\n){2})//s" config-xpui.ini
fi

echo "Uninstalling (2/3)"
cd "$(dirname "$(spicetify -c)")"
spicetify config current_theme "SpicetifyDefault" color_scheme "green-dark" extensions default-dynamic.js- extensions Vibrant.min.js-

echo "Deleting (3/3)"
while true; do
    read -p "Do you wish to delete theme files? [y/n] " yn </dev/tty
    case $yn in
    [Yy]*)
        theme_dir="$(dirname "$(spicetify -c)")/Themes/DefaultDynamic"
        ext_dir="$(dirname "$(spicetify -c)")/Extensions"
        rm -rf "$theme_dir"
        # Use -f to ignore if missing
        rm -f "$ext_dir/default-dynamic.js"
        rm -f "$ext_dir/Vibrant.min.js"
        break
        ;;
    [Nn]*)
        echo "Skipping deletion."
        break
        ;;
    *) echo "Please answer yes or no." ;;
    esac
done

spicetify apply
