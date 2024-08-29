#!/bin/bash

check_exists() { # Check if required tools are installed/accessible
    if ! command -v "$1" &> /dev/null; then
        echo "Error: $1 not found. Ensure it is installed and available in your PATH."
        exit 1
    fi
}

check_exists spicetify
check_exists sed

# Find where the Spotify binary is located
spotify_path=$(spicetify config spotify_path)

# Check for spicetify errors
if [[ $spotify_path == error* ]]; then
    echo "Failed to patch the file. $spotify_path"
    exit 1
fi

path="${spotify_path}/spotify"

# Backup the original binary
cp "$path" "${path}.bak"

# Patch binary
sed -i 's/force-dark-mode/\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00/' "$path"
echo "The patch is complete. You may now restart Spotify."
