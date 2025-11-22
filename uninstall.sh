#!/bin/bash

set -euo pipefail

# Configuration
readonly THEME_NAME="DefaultDynamic"
readonly DEFAULT_THEME="SpicetifyDefault"
readonly DEFAULT_SCHEME="green-dark"

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
    if ! command_exists spicetify; then
        log_error "Spicetify is not installed or not in PATH"
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
    local default="${2:-n}"  # Default to 'no' for safety
    
    while true; do
        if [ "$default" = "y" ]; then
            read -p "${message} [Y/n] " -r yn </dev/tty
            case $yn in
                [Nn]* ) return 1 ;;
                "" | [Yy]* ) return 0 ;;
                * ) echo "Please answer yes or no." ;;
            esac
        else
            read -p "${message} [y/N] " -r yn </dev/tty
            case $yn in
                [Yy]* ) return 0 ;;
                "" | [Nn]* ) return 1 ;;
                * ) echo "Please answer yes or no." ;;
            esac
        fi
    done
}

# Remove Spicetify patches
unpatch_spicetify() {
    log_info "Removing Spicetify patches (1/3)"
    
    local config_dir
    config_dir=$(get_spicetify_config_dir)
    cd "$config_dir"
    
    local config_file="config-xpui.ini"
    
    if grep -q '\[Patch\]' "$config_file"; then
        if ! prompt_confirmation "All Spicetify custom patches will be deleted. Continue?"; then
            log_warn "Uninstallation cancelled by user."
            exit 0
        fi
        
        # Backup before modifying
        cp "$config_file" "${config_file}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Remove patch section
        perl -i -0777 -pe "s/\[Patch\].*?($|(\r*\n){2})//s" "$config_file"
        log_info "Patches removed successfully."
    else
        log_info "No patches found to remove."
    fi
}

# Reset Spicetify configuration
reset_spicetify_config() {
    log_info "Resetting Spicetify configuration (2/3)"
    
    local config_dir
    config_dir=$(get_spicetify_config_dir)
    cd "$config_dir"
    
    # Reset to default theme and remove extensions
    spicetify config current_theme "$DEFAULT_THEME" \
        color_scheme "$DEFAULT_SCHEME" \
        extensions default-dynamic.js- \
        extensions Vibrant.min.js-
    
    log_info "Spicetify configuration reset to defaults."
}

# Delete theme files
delete_theme_files() {
    log_info "Managing theme files (3/3)"
    
    if prompt_confirmation "Delete theme files? This will remove all theme-related files."; then
        local config_dir
        config_dir=$(get_spicetify_config_dir)
        
        local theme_dir="${config_dir}/Themes/${THEME_NAME}"
        local ext_dir="${config_dir}/Extensions"
        
        # Remove theme directory
        if [ -d "$theme_dir" ]; then
            rm -rf "$theme_dir"
            log_info "Theme directory removed: $theme_dir"
        else
            log_warn "Theme directory not found: $theme_dir"
        fi
        
        # Remove extension files
        local files_removed=false
        for file in "default-dynamic.js" "Vibrant.min.js"; do
            if [ -f "${ext_dir}/${file}" ]; then
                rm -f "${ext_dir}/${file}"
                log_info "Extension removed: ${ext_dir}/${file}"
                files_removed=true
            fi
        done
        
        if [ "$files_removed" = false ]; then
            log_warn "No extension files found to remove."
        fi
    else
        log_info "Skipping file deletion as requested."
    fi
}

# Apply changes
apply_changes() {
    log_info "Applying changes..."
    
    if spicetify apply; then
        log_info "Changes applied successfully."
    else
        log_error "Failed to apply changes."
        exit 1
    fi
}

# Main uninstallation function
main() {
    log_info "Starting Spicetify Dynamic Theme uninstallation..."
    
    check_dependencies
    unpatch_spicetify
    reset_spicetify_config
    delete_theme_files
    apply_changes
    
    log_info "Uninstallation completed successfully!"
    log_info "Spicetify has been reset to default configuration."
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
