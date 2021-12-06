#!/bin/sh
# Copyright 2019 khanhas. GPL license.
# Edited from project Denoland install script (https://github.com/denoland/deno_install)

set -e

if [ $# -eq 0 ]; then
    latest_release_uri="https://api.github.com/repos/JulienMaille/spicetify-dynamic-theme/releases/latest"
    echo "DOWNLOADING    $latest_release_uri"
    version=$( command curl -sSf "$latest_release_uri" |
        command grep -Eo "tag_name\": .*" |
        command grep -Eo "[0-9.]+" )
    if [ ! "$version" ]; then exit 1; fi
else
    version="${1}"
fi

download_uri="https://github.com/JulienMaille/spicetify-dynamic-theme/archive/refs/tags/${version}.zip"

spicetify_install="${SPICETIFY_INSTALL:-$HOME/spicetify-cli/Themes}"

if [ ! -d "$spicetify_install" ]; then
    echo "MAKING FOLDER  $spicetify_install";
    mkdir -p "$spicetify_install"
fi

tar_file="$spicetify_install/${version}.zip"

echo "DOWNLOADING    v$version  $download_uri"
curl --fail --location --progress-bar --output "$tar_file" "$download_uri"
cd "$spicetify_install"

echo "EXTRACTING     $tar_file"
unzip "$tar_file"

echo "REMOVING       $tar_file"
rm "$tar_file"

# Check ~\.spicetify.\Themes directory already exists
sp_dot_dir="$(dirname "$(spicetify -c)")/Themes/DefaultDynamic"
if [ ! -d "$sp_dot_dir" ]; then
    echo "MAKING FOLDER  $sp_dot_dir";
    mkdir -p "$sp_dot_dir"
fi

echo "COPYING"
cp -rf "$spicetify_install/spicetify-dynamic-theme-${version}/." "$sp_dot_dir"

echo "INSTALLING"
cd "$(dirname "$(spicetify -c)")/Themes/DefaultDynamic"
mkdir -p ../../Extensions
cp default-dynamic.js ../../Extensions/.
cp Vibrant.min.js ../../Extensions/.
spicetify config extensions dribbblish.js- extensions dribbblish-dynamic.js-
spicetify config extensions default-dynamic.js extensions Vibrant.min.js
spicetify config current_theme DefaultDynamic color_scheme base
spicetify config inject_css 1 replace_colors 1 overwrite_assets 1

echo "PATCHING"
PATCH='[Patch]
xpui.js_find_8008 = ,(\\w+=)32,
xpui.js_repl_8008 = ,\${1}28,'
if cat config-xpui.ini | grep -o '\[Patch\]'; then
    perl -i -0777 -pe "s/\[Patch\].*?($|(\r*\n){2})/$PATCH\n\n/s" config-xpui.ini
else
    echo -e "\n$PATCH" >> config-xpui.ini
fi

echo "APPLYING"
spicetify apply