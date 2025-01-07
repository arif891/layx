#!/bin/bash

VERSION="0.1.0 alpha"

# Error messages
STRING_NODE_FAIL="${COLOR_RED}Failed to execute Node.js. Please check the path and installation.${COLOR_RESET}"
STRING_DIR_ERROR="${COLOR_RED}Cannot perform this action here ${FR_CURRENT_DIR}${COLOR_RESET}"

# Directory settings
CURRENT_DIR="$(pwd)/"
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")/"
CONFIG_DIR="config/"
IMAGES_DIR="assets/image/"
NODE_EXE="${CURRENT_DIR}${CONFIG_DIR}node"
WEBP_EXE="${CURRENT_DIR}${CONFIG_DIR}webp"
AVIF_EXE="${CURRENT_DIR}${CONFIG_DIR}avif"
PROGRAM_DIR="/usr/local/LayX/"
FR_CURRENT_DIR="${CURRENT_DIR}"

# Color definitions
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_CYAN='\033[0;36m'
COLOR_RESET='\033[0m'

if [ "${SCRIPT_DIR}" == "${PROGRAM_DIR}" ]; then
    USE_DIR="${SCRIPT_DIR}"
else
    USE_DIR="${CURRENT_DIR}"
fi

echo "LayX version ${VERSION}"

# Check for Node.js
if [ ! -f "${NODE_EXE}" ]; then
    
    if [ -f "${PROGRAM_DIR}${CONFIG_DIR}node" ]; then
        NODE_EXE="${PROGRAM_DIR}${CONFIG_DIR}node"
        WEBP_EXE="${PROGRAM_DIR}${CONFIG_DIR}webp"
        AVIF_EXE="${PROGRAM_DIR}${CONFIG_DIR}avif"
    else
        echo "Program Node.js also not found."
        if ! command -v node &> /dev/null; then
            echo "Node.js is not installed."
        else
            echo "Node.js found globally."
            NODE_EXE="node"
        fi
    fi
fi

build() {
    echo "Building..."
    echo "Using Node: ${NODE_EXE}"
    if ! "${NODE_EXE}" -v; then
        echo "${STRING_NODE_FAIL}"
        exit 1
    fi

    if [ "${CURRENT_DIR}" != "${PROGRAM_DIR}" ]; then
        "${NODE_EXE}" "${USE_DIR}${CONFIG_DIR}config.mjs" "build"
    else
        echo "${STRING_DIR_ERROR}"
    fi
}

unbuild() {
    echo "Unbuilding..."
    echo "Using Node: ${NODE_EXE}"
    if ! "${NODE_EXE}" -v; then
        echo "${STRING_NODE_FAIL}"
        exit 1
    fi

    if [ "${CURRENT_DIR}" != "${PROGRAM_DIR}" ]; then
        "${NODE_EXE}" "${USE_DIR}${CONFIG_DIR}config.mjs" "unbuild"
    else
        echo "${STRING_DIR_ERROR}"
    fi
}

create() {
    if [ -d "${PROGRAM_DIR}" ]; then
        if [ "${CURRENT_DIR}" != "${PROGRAM_DIR}" ]; then
            if [ -d "${CURRENT_DIR}/layx" ]; then
                read -p "There may be an existing LayX project. Do you want to replace it? (Y/N): " choice
                case "${choice}" in
                    [Yy]* ) echo -e "${COLOR_CYAN}Continuing...${COLOR_RESET}";;
                    [Nn]* ) return;;
                    * ) echo -e "${COLOR_YELLOW}Please choose a valid option.${COLOR_RESET}"; create; return;;
                esac
            fi
            
            echo -e "${COLOR_CYAN}Copying LayX files...${COLOR_RESET}"
            cp -r "${PROGRAM_DIR}"* "${CURRENT_DIR}"
            
            if [ -d "${CURRENT_DIR}${CONFIG_DIR}" ]; then
                echo -e "${COLOR_CYAN}Cleaning up unnecessary files...${COLOR_RESET}"
                rm -rf "${CURRENT_DIR}${CONFIG_DIR}"
            fi
            
            if [ -f "${CURRENT_DIR}/layx.sh" ]; then
                rm "${CURRENT_DIR}/layx.sh"
            fi
            
            echo -e "${COLOR_GREEN}LayX project created in the current directory.${COLOR_RESET}"
        else
            echo -e "${COLOR_RED}Error: You are already in the LayX program directory. Please change to a different directory.${COLOR_RESET}"
        fi
    else
        echo -e "${COLOR_YELLOW}LayX is not installed. Please install it first.${COLOR_RESET}"
    fi
}

optimize_images() {
    echo -e "${COLOR_CYAN}Optimizing images in ${IMAGES_DIR}${COLOR_RESET}"
    
    ARGS="${@:2}"
    find "${CURRENT_DIR}${IMAGES_DIR}" -type f \( -name "*.png" -o -name "*.jpg" \) -not -path "*/orginal_images_dir/*" | while read -r image; do
        dir=$(dirname "${image}")
        name=$(basename "${image%.*}")
        ext=".avif"
        
        echo "Processing $(basename "${image}")"
        
        "${AVIF_EXE}" ${ARGS} "${image}" -o "${dir}/${name}${ext}"
        
        mkdir -p "${dir}/orginal_images_dir"
        mv "${image}" "${dir}/orginal_images_dir/"
        
        echo "Processed: $(basename "${image}") at ${dir}"
    done
}

install() {
    if [ "$EUID" -ne 0 ]; then
        if [ ! -f "${CURRENT_DIR}/layx.sh" ]; then
            echo -e "${COLOR_RED}layx.sh not found in the current directory.${COLOR_RESET}"
            exit 1
        fi
        
        echo -e "${COLOR_YELLOW}Requesting sudo privileges...${COLOR_RESET}"
        sudo "$0" install
        exit $?
    fi

    if [ -d "${PROGRAM_DIR}" ]; then
        if [ "${CURRENT_DIR}" == "${PROGRAM_DIR}" ]; then
            echo -e "${COLOR_YELLOW}Program already installed.${COLOR_RESET}"
            return
        fi

        read -p "Program directory already exists, would you like to update or replace? (Y/N): " choice
        case "${choice}" in
            [Yy]* ) echo -e "${COLOR_CYAN}Continuing...${COLOR_RESET}";;
            [Nn]* ) return;;
            * ) echo -e "${COLOR_YELLOW}Please choose a valid option.${COLOR_RESET}"; install; return;;
        esac
    fi

    echo -e "${COLOR_CYAN}Installing...${COLOR_RESET}"
    echo "Copying Files."
    mkdir -p "${PROGRAM_DIR}"
    cp -r "${SCRIPT_DIR}"* "${PROGRAM_DIR}"
    
    # VS Code snippets installation
    mkdir -p "/home/$SUDO_USER/.config/Code/User/snippets/"
    cp -r "${SCRIPT_DIR}${CONFIG_DIR}syntax/layx.code-snippets" "/home/$SUDO_USER/.config/Code/User/snippets/"
    
    # Set executable permissions
    echo -e "${COLOR_CYAN}Setting executable permissions...${COLOR_RESET}"
    chmod +x "${PROGRAM_DIR}layx.sh"
    chmod +x "${PROGRAM_DIR}${CONFIG_DIR}node"
    chmod +x "${PROGRAM_DIR}config/webp"
    chmod +x "${PROGRAM_DIR}config/avif"
    
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
    
    # Add to PATH
    if ! grep -q "${PROGRAM_DIR}" /etc/environment; then
        echo "PATH=\$PATH:${PROGRAM_DIR}" >> /etc/environment
        echo -e "${COLOR_CYAN}Added ${PROGRAM_DIR} to PATH${COLOR_RESET}"
    else
        echo -e "${COLOR_YELLOW}${PROGRAM_DIR} is already in the PATH${COLOR_RESET}"
    fi

    echo -e "${COLOR_GREEN}Installation completed.${COLOR_RESET}"
    echo -e "${COLOR_YELLOW}Note: Please restart your terminal or run 'source /etc/bash.aliases' to use the 'layx' command${COLOR_RESET}"
}

uninstall() {
    if [ ! -d "${PROGRAM_DIR}" ]; then
        echo -e "${COLOR_YELLOW}LayX is not installed on your system.${COLOR_RESET}"
        exit 1
    fi

    if [ "$EUID" -ne 0 ]; then
        echo -e "${COLOR_YELLOW}Requesting sudo privileges...${COLOR_RESET}"
        sudo "$0" uninstall
        exit $?
    fi

    echo -e "${COLOR_CYAN}Uninstalling...${COLOR_RESET}"
    
    if [ -d "${PROGRAM_DIR}" ]; then
        rm -rf "${PROGRAM_DIR}"
    else
        echo "${PROGRAM_DIR} not found."
    fi

    # Remove from PATH
    sed -i "\|PATH=\$PATH:${PROGRAM_DIR}|d" /etc/environment

    echo "Uninstallation completed."
}

show_options() {
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
        1) build ;;
        2) unbuild ;;
        3) create ;;
        4) optimize_images ;;
        5) install ;;
        6) uninstall ;;
        7) exit 0 ;;
        *) echo -e "${COLOR_YELLOW}Please choose a valid option.${COLOR_RESET}"; show_options ;;
    esac
}

# Main script execution
if [ $# -eq 0 ]; then
    show_options
else
    case "$1" in
        "build") build ;;
        "unbuild") unbuild ;;
        "create") create ;;
        "optimage") optimize_images ;;
        "install") install ;;
        "uninstall") uninstall ;;
        "add") "${NODE_EXE}" "${USE_DIR}${CONFIG_DIR}config.mjs" "$@" ;;
        *)
            echo -e "Available options are ${COLOR_YELLOW}\"build\"${COLOR_RESET}, ${COLOR_YELLOW}\"unbuild\"${COLOR_RESET}, ${COLOR_YELLOW}\"create\"${COLOR_RESET}, ${COLOR_YELLOW}\"add\"${COLOR_RESET}, ${COLOR_YELLOW}\"optimage\"${COLOR_RESET}, ${COLOR_YELLOW}\"install\"${COLOR_RESET} and ${COLOR_YELLOW}\"uninstall\"${COLOR_RESET}."
            if [ "${CURRENT_DIR}" != "${PROGRAM_DIR}" ]; then
                echo "Forwarding cmd to \"config.mjs\""
                "${NODE_EXE}" "${USE_DIR}${CONFIG_DIR}config.mjs" "$@"
            else
                echo "${STRING_DIR_ERROR}"
            fi
            ;;
    esac
fi