#!/bin/bash
# Setup script for OpenCode Multi-Agent System
# Usage: ./setup.sh [--config PATH]

CONFIG_DIR="${HOME}/.config/opencode"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --config)
            CONFIG_DIR="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "Setting up OpenCode Multi-Agent System..."
echo "Config directory: ${CONFIG_DIR}"

# Check if OpenCode config exists
if [ ! -d "$CONFIG_DIR" ]; then
    echo "Error: OpenCode config directory not found at ${CONFIG_DIR}"
    echo "Please ensure OpenCode is installed first."
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Copy files
echo "Copying agents..."
cp -n "${SCRIPT_DIR}/agents/"* "${CONFIG_DIR}/agents/" 2>/dev/null || echo "  Some agents may already exist"

echo "Copying commands..."
cp -n "${SCRIPT_DIR}/commands/"* "${CONFIG_DIR}/commands/" 2>/dev/null || echo "  Some commands may already exist"

echo "Copying plugins..."
cp -n "${SCRIPT_DIR}/plugins/"* "${CONFIG_DIR}/plugins/"

echo "Copying memory..."
cp -n "${SCRIPT_DIR}/memory/"* "${CONFIG_DIR}/memory/" 2>/dev/null || mkdir -p "${CONFIG_DIR}/memory"

echo "Merging config..."
# Merge opencode.json - preserve existing settings, add new ones
# Simple approach: backup and replace (for clean setup)
if [ -f "${CONFIG_DIR}/opencode.json" ]; then
    echo "  Backing up existing config..."
    cp "${CONFIG_DIR}/opencode.json" "${CONFIG_DIR}/opencode.json.backup"
fi
cp "${SCRIPT_DIR}/opencode.json" "${CONFIG_DIR}/opencode.json"

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Restart OpenCode: opencode"
echo "  2. Initialize a project: cd your-project && /init"
echo "  3. Invoke agents: @advisor, @builder, @reviewer"
echo ""
echo "For help, see: ${SCRIPT_DIR}/README.md"