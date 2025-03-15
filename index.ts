#!/usr/bin/env node
// Load environment variables
import 'dotenv/config';
import { main } from './src/mcpNeo4jServer';

// Start the MCP server
main().catch((error) => {
  console.error("Fatal error:", error);
  // Don't exit the process on error, just log it
  // process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down MCP server...');
  process.exit(0);
});

// Keep the process alive
process.stdin.resume();