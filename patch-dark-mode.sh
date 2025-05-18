#!/bin/bash

# Ensure Spicetify is in PATH
if ! command -v spicetify &> /dev/null; then
    echo "Error: spicetify not found. Ensure it is installed and available in your PATH."
    exit 1
fi

# Find where the Spotify binary is located
spotify_path=$(spicetify config spotify_path)

# Check for spicetify errors
if [[ $spotify_path == error* ]]; then
    echo "Failed to patch the file. $spotify_path"
    exit 1
fi

# Assemble the binary's path
if [[ "$OSTYPE" == "darwin"* ]]; then
    _spotify_path=$(dirname "$spotify_path")
    path="${_spotify_path}/MacOS/Spotify"
else
    path="${spotify_path}/spotify"
fi

# Validate the path to ensure it exists and is a file
if [[ ! -f "$path" ]]; then
    echo "Error: The Spotify binary was not found at the expected path: $path"
    exit 1
fi

# Patch the binary
if LC_CTYPE=C sed -i.bak 's/force-dark-mode/xxxxx-xxxx-xxxx/' "$path"; then
    echo "Patch applied successfully."
else
    echo "Unable to apply patch!"
    exit 1
fi

# Resign for macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    if codesign --force --deep --sign - /Applications/Spotify.app; then
       echo "Resigned app successfully."
    else
       echo "Unable to resign app!"
       exit 1
    fi
fi 

echo "The patch is complete. You may now restart Spotify."
