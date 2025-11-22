#!/bin/bash

set -euo pipefail

# Configuration
readonly PATCH='[Patch]
xpui.js_find_8008 = ,(\\w+=)32,
xpui.js_repl_8008 = ,\${1}28,'
readonly REPO_BASE_URL="https://raw.githubusercontent.com/JulienMaille/spicetify-dynamic-theme"
readonly API_RELEASES_URL="https://api.github.com/repos/JulienMaille/spicetify-dynamic-theme/releases/latest"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate dependencies
check_dependencies() {
    local missing_deps=()
    
    if ! command_exists spicetify; then
        missing_deps+=("spicetify")
    fi
    
    if ! command_exists curl; then
        missing_deps+=("curl")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        exit 1
    fi
}

# Get Spicetify config directory
get_spicetify_config_dir() {
    spicetify -c | xargs dirname
}

# Prompt user for confirmation
prompt_confirmation() {
    local message="$1"
    while true; do
        read -p "${message} [y/N] " -r yn </dev/tty
        case $yn in
            [Yy]* ) return 0 ;;
            [Nn]* | "" ) return 1 ;;
            * ) echo "Please answer yes or no." ;;
        esac
    done
}

# Apply Spicetify patches
apply_patches() {
    log_info "Patching Spicetify configuration (1/4)"
    
    local config_dir
    config_dir=$(get_spicetify_config_dir)
    cd "$config_dir"
    
    local config_file="config-xpui.ini"
    
    if grep -q '\[Patch\]' "$config_file"; then
        if ! prompt_confirmation "Existing Spicetify patches will be overwritten. Continue?"; then
            log_warn "Installation cancelled by user."
            exit 0
        fi
        
        # Backup original file
        cp "$config_file" "${config_file}.backup.$(date +%Y%m%d_%H%M%S)"
        
        perl -i -0777 -pe "s/\[Patch\].*?($|(\r*\n){2})/${PATCH}\n\n/s" "$config_file"
    else
        echo -e "\n${PATCH}" >> "$config_file"
    fi
    
    log_info "Patches applied successfully."
}

# Get latest version from GitHub API
get_latest_version() {
    local version="$1"
    
    if [ -n "$version" ]; then
        echo "$version"
        return
    fi
    
    log_info "Fetching latest version (2/4)"
    
    local api_response
    if ! api_response=$(curl -sSf "$API_RELEASES_URL"); then
        log_error "Failed to fetch latest version from GitHub API."
        exit 1
    fi
    
    local latest_version
    latest_version=$(echo "$api_response" | grep -Eo '"tag_name":\s*"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$latest_version" ]; then
        log_error "Could not determine latest version."
        exit 1
    fi
    
    echo "$latest_version"
}

# Download theme files
download_files() {
    local version="$1"
    
    log_info "Downloading v${version} (3/4)"
    
    local spicetify_dir
    spicetify_dir=$(get_spicetify_config_dir)
    
    local theme_dir="${spicetify_dir}/Themes/DefaultDynamic"
    local ext_dir="${spicetify_dir}/Extensions"
    
    # Create directories
    mkdir -p "$theme_dir" "$ext_dir"
    
    # Files to download
    declare -A files=(
        ["${theme_dir}/color.ini"]="color.ini"
        ["${theme_dir}/user.css"]="user.css"
        ["${ext_dir}/default-dynamic.js"]="default-dynamic.js"
        ["${ext_dir}/Vibrant.min.js"]="Vibrant.min.js"
    )
    
    local download_failed=false
    
    for local_path in "${!files[@]}"; do
        local remote_file="${files[$local_path]}"
        local url="${REPO_BASE_URL}/${version}/${remote_file}"
        
        if ! curl --progress-bar --output "$local_path" "$url"; then
            log_error "Failed to download: $url"
            download_failed=true
        fi
    done
    
    if [ "$download_failed" = true ]; then
        log_error "Some files failed to download. Installation incomplete."
        exit 1
    fi
}

# Apply theme configuration
apply_theme() {
    log_info "Applying theme configuration (4/4)"
    
    # Remove conflicting extensions
    spicetify config extensions dribbblish.js- extensions dribbblish-dynamic.js- || true
    
    # Add new extensions
    spicetify config extensions default-dynamic.js extensions Vibrant.min.js
    
    # Set theme
    spicetify config current_theme DefaultDynamic color_scheme base
    spicetify config inject_css 1 replace_colors 1
    
    # Apply changes
    if ! spicetify apply; then
        log_error "Failed to apply theme."
        exit 1
    fi
}

# Main installation function
main() {
    local version="${1:-}"
    
    log_info "Starting Spicetify Dynamic Theme installation..."
    
    check_dependencies
    apply_patches
    
    version=$(get_latest_version "$version")
    download_files "$version"
    apply_theme
    
    log_info "Installation completed successfully!"
    log_info "Theme installed: DefaultDynamic v${version}"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
