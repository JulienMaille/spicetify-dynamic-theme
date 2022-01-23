#!/bin/sh
# Copyright 2019 khanhas. GPL license.
# Edited from project Denoland install script (https://github.com/denoland/deno_install)

set -e

echo "UN-INSTALLING"
cd "$(dirname "$(spicetify -c)")"
spicetify config current_theme "SpicetifyDefault" extensions default-dynamic.js-

echo "UN-PATCHING"
if cat config-xpui.ini | grep -o '\[Patch\]'; then
    perl -i -0777 -pe "s/\[Patch\].*?($|(\r*\n){2})//s" config-xpui.ini
fi

spicetify apply
