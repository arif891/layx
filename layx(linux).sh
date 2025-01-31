#!/bin/bash

# **********************
# * Configuration Zone *
# **********************
VERSION="0.1.0 alpha"
PROGRAM_DIR="/opt/layx/"
CONFIG_DIR="config/"
CONFIG_FILE="config.mjs"
IMAGES_DIR="assets/image/"
ARGS=""

# *********************
# * ANSI Color Codes  *
# *********************
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_CYAN='\033[0;36m'
COLOR_RESET='\033[0m'

# *********************
# * Error Messages    *
# *********************
STRING_NODE_FAIL="${COLOR_RED}Failed to execute Node.js. Please check the path and installation.${COLOR_RESET}"
STRING_DIR_ERROR="${COLOR_RED}Cannot perform this action in ${PWD}${COLOR_RESET}"

# *********************
# * Initialize Paths  *
# *********************
CURRENT_DIR="$(pwd)/"
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")/"
SCRIPT_PATH="$(readlink -f "$0")"

# Derive executable paths
NODE_EXE="${SCRIPT_DIR}${CONFIG_DIR}node"
WEBP_EXE="${SCRIPT_DIR}${CONFIG_DIR}webp"
AVIF_EXE="${SCRIPT_DIR}${CONFIG_DIR}avif"

# Snippets path
SNIPPETS_PATH="${SCRIPT_DIR}${CONFIG_DIR}syntax/layx.code-snippets"
SNIPPETS_DIR="$HOME/.config/Code/User/snippets/"




# *********************
# * Helper Functions  *
# *********************
validate_node() {
    if [ ! -f "$NODE_EXE" ]; then
        if command -v node &> /dev/null; then
            NODE_EXE="node"
            echo -e "${COLOR_CYAN}Program node.js not found. Using system Node.js installation${COLOR_RESET}"
        else
            echo -e "${COLOR_RED}Node.js not found!${COLOR_RESET}"
            return 1
        fi
    fi
    return 0
}

copy_safe() {
    local src="$1"
    local dst="$2"
    mkdir -p "$dst" || return 1
    cp -r "$src"* "$dst" 2>/dev/null
    return $?
}




# *********************
# * Main Functions    *
# *********************
build() {
    validate_node
    if [ "$CURRENT_DIR" != "$PROGRAM_DIR" ]; then
        "$NODE_EXE" "${SCRIPT_DIR}${CONFIG_DIR}${CONFIG_FILE}" build
    else
        echo -e "$STRING_DIR_ERROR"
    fi
}

unbuild() {
    validate_node
    if [ "$CURRENT_DIR" != "$PROGRAM_DIR" ]; then
        "$NODE_EXE" "${SCRIPT_DIR}${CONFIG_DIR}${CONFIG_FILE}" unbuild
    else
        echo -e "$STRING_DIR_ERROR"
    fi
}

create() {
    if [ ! -d "$PROGRAM_DIR" ]; then
        echo -e "${COLOR_YELLOW}LayX is not installed. Please install first.${COLOR_RESET}"
        return
    fi

    if [ -d "${CURRENT_DIR}layx" ]; then
        while true; do
            read -p "Existing LayX project found. Overwrite? (Y/N): " choice
            case $choice in
                [Yy]* ) echo -e "${COLOR_CYAN}Continuing...${COLOR_RESET}"; break;;
                [Nn]* ) return;;
                * ) continue;;
            esac
        done
    fi

    for item in "$PROGRAM_DIR"*; do
        base_name=$(basename "$item")
        if [ "$base_name" != "config" ] && [ "$base_name" != "layx.sh" ]; then
            if [ -d "$item" ]; then
                cp -r "$item" "${CURRENT_DIR}${base_name}"
            else
                cp "$item" "${CURRENT_DIR}${base_name}"
            fi
        fi
    done

    echo -e "${COLOR_GREEN}Project created successfully!${COLOR_RESET}"
}

optimize_images() {
    processed=0
    find "${CURRENT_DIR}${IMAGES_DIR}" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) | while read -r file; do
        echo "Processing $(basename "$file")"
        dir=$(dirname "$file")
        filename=$(basename "$file")
        name="${filename%.*}"
        
        mkdir -p "${dir}/original_images_dir"
        if mv "$file" "${dir}/original_images_dir/$filename"; then
            "$AVIF_EXE" $ARGS "${dir}/original_images_dir/$filename" -o "${dir}/${name}.avif"
            processed=1
        fi
    done

    if [ $processed -eq 1 ]; then
        echo -e "${COLOR_GREEN}Image optimization completed${COLOR_RESET}"
    else
        echo -e "${COLOR_YELLOW}No images found to process${COLOR_RESET}"
    fi
}

install() {
    if [ "$SCRIPT_DIR" = "$PROGRAM_DIR" ]; then
        echo -e "${COLOR_YELLOW}Already installed in $PROGRAM_DIR${COLOR_RESET}"
        return
    fi

    if [ "$EUID" -ne 0 ]; then
        echo -e "${COLOR_YELLOW}Elevating privileges...${COLOR_RESET}"
        sudo "$0" install
        return
    fi

    if [ -d "$PROGRAM_DIR" ]; then
        read -p "Existing installation found. Update or overwrite? (Y/N): " choice
        case $choice in
            [Yy]* ) ;;
            * ) return;;
        esac
    fi

    copy_safe "$SCRIPT_DIR" "$PROGRAM_DIR"

    # Set executable permissions
    echo -e "${COLOR_CYAN}Setting executable permissions...${COLOR_RESET}"
    chmod +x "${PROGRAM_DIR}layx.sh"
    chmod +x "${PROGRAM_DIR}${CONFIG_DIR}node"
    chmod +x "${PROGRAM_DIR}${CONFIG_DIR}webp"
    chmod +x "${PROGRAM_DIR}${CONFIG_DIR}avif"

    # Create alias
    echo -e "${COLOR_CYAN}Creating alias...${COLOR_RESET}"
    if ! grep -q "alias layx=" /etc/bash.aliases 2>/dev/null; then
        echo "alias layx='${PROGRAM_DIR}layx.sh'" >> /etc/bash.aliases
        # Also add to bashrc to ensure the alias is loaded
        if ! grep -q "source /etc/bash.aliases" /etc/bash.bashrc; then
            echo "if [ -f /etc/bash.aliases ]; then" >> /etc/bash.bashrc
            echo "    source /etc/bash.aliases" >> /etc/bash.bashrc
            echo "fi" >> /etc/bash.bashrc
        fi
    else
        echo -e "${COLOR_YELLOW}Alias 'layx' already exists${COLOR_RESET}"
    fi

    # Add to PATH if not already present
    if ! grep -q "$PROGRAM_DIR" /etc/environment; then
        echo "PATH=\$PATH:$PROGRAM_DIR" >> /etc/environment
        echo -e "${COLOR_GREEN}Added to system PATH${COLOR_RESET}"
    else
        echo -e "${COLOR_CYAN}Path already exists in system PATH${COLOR_RESET}"
    fi

    # Copy code snippets
    copy_safe "$SNIPPETS_PATH" "$SNIPPETS_DIR"

    # Set proper ownership for snippets directory
    chown -R $SUDO_USER:$SUDO_USER "$SNIPPETS_DIR"

    echo -e "${COLOR_GREEN}Installation completed successfully!${COLOR_RESET}"
    echo -e "${COLOR_CYAN}Please restart your terminal or run 'source /etc/bash.aliases' to use the 'layx' command${COLOR_RESET}"
}

uninstall() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${COLOR_YELLOW}Elevating privileges...${COLOR_RESET}"
        sudo "$0" uninstall
        return
    fi

    if [ -d "$PROGRAM_DIR" ]; then
        if rm -rf "$PROGRAM_DIR"; then
            # Remove alias
            sed -i '/alias layx=/d' /etc/bash.aliases 2>/dev/null
            # Remove from PATH
            sed -i "\|PATH=\$PATH:$PROGRAM_DIR|d" /etc/environment
            echo -e "${COLOR_GREEN}Uninstallation completed${COLOR_RESET}"
        else
            echo -e "${COLOR_RED}Failed to remove program directory${COLOR_RESET}"
        fi
    fi
}




# *********************
# * Main Execution    *
# *********************
echo "LayX version $VERSION"

if [ $# -gt 0 ]; then
    case "$1" in
        "build") build ;;
        "unbuild") unbuild ;;
        "create") create ;;
        "add") "$NODE_EXE" "${SCRIPT_DIR}${CONFIG_DIR}${CONFIG_FILE}" "$@" ;;
        "setup") 
            validate_node
            "$NODE_EXE" "create-setup.mjs"
            ;;
        "optimizeImages") optimize_images ;;
        "install") install ;;
        "uninstall") uninstall ;;
        *) echo -e "${COLOR_YELLOW}Invalid command. Valid options: build, unbuild, create, add, optimizeImages, install, uninstall${COLOR_RESET}" ;;
    esac
else
    while true; do
        echo -e "${COLOR_CYAN}Please choose an option:${COLOR_RESET}"
        echo "1. Build"
        echo "2. Unbuild"
        echo "3. Create"
        echo "4. Optimize Images"
        echo "5. Install"
        echo "6. Uninstall"
        echo "7. Exit"
        
        read -p "Enter your choice (1-7): " choice
        case $choice in
            1) build; break ;;
            2) unbuild; break ;;
            3) create; break ;;
            4) optimize_images; break ;;
            5) install; break ;;
            6) uninstall; break ;;
            7) break ;;
            *) echo -e "${COLOR_YELLOW}Invalid choice. Please try again.${COLOR_RESET}" ;;
        esac
    done
fi