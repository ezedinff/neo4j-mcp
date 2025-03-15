#!/bin/bash

# Run Neo4j MCP Server
# This script runs the Neo4j MCP server and logs output to a file

# Set the directory of this script as the working directory
cd "$(dirname "$0")"

# Create logs directory if it doesn't exist
mkdir -p logs

# Run the server and log output
echo "Starting Neo4j MCP Server..."
echo "Logs will be written to logs/mcp-server.log"

# Run the development version with Bun
bun run index.ts 2>&1 | tee logs/mcp-server.log 