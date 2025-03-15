#!/bin/bash
# Wrapper script to run the MCP server with Bun

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Log for debugging
echo "Starting MCP wrapper script" > ./mcp-wrapper.log
echo "Current directory: $DIR" >> ./mcp-wrapper.log
echo "Bun path: /Users/ezedinfedlu/.bun/bin/bun" >> ./mcp-wrapper.log
echo "Script path: $DIR/dist/index.js" >> ./mcp-wrapper.log

# find bun path
BUN_PATH="/Users/ezedinfedlu/.bun/bin/bun"
echo "Bun path: $BUN_PATH"

# Run the MCP server with Bun
exec "$BUN_PATH" "$DIR/dist/index.js" 2>> ./mcp-wrapper.log 