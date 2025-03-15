#!/bin/bash
# Wrapper script to run the MCP server with Bun

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Log for debugging
echo "Starting MCP wrapper script" > /tmp/mcp-wrapper.log
echo "Current directory: $DIR" >> /tmp/mcp-wrapper.log
echo "Bun path: /Users/ezedinfedlu/.bun/bin/bun" >> /tmp/mcp-wrapper.log
echo "Script path: $DIR/dist/index.js" >> /tmp/mcp-wrapper.log

# Run the MCP server with Bun
exec "/Users/ezedinfedlu/.bun/bin/bun" "$DIR/dist/index.js" 2>> /tmp/mcp-wrapper.log 