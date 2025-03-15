import { serve } from 'bun';
import type { CommandDefinition } from './types';
import neo4jService from './services/neo4jService';

/**
 * MCP Server for Neo4j integration with Cursor
 */
class McpServer {
  private commands: Map<string, CommandDefinition> = new Map();
  private server: ReturnType<typeof serve> | null = null;

  constructor() {
    this.registerCommands();
  }

  /**
   * Register all available commands
   */
  private registerCommands() {
    // Connect to Neo4j database
    this.registerCommand({
      name: 'connect',
      description: 'Connect to a Neo4j database',
      handler: async (params) => {
        return await neo4jService.connect(params);
      }
    });

    // Execute a Cypher query
    this.registerCommand({
      name: 'query',
      description: 'Execute a Cypher query against the Neo4j database',
      handler: async (params) => {
        return await neo4jService.executeQuery(params);
      }
    });

    // Disconnect from Neo4j database
    this.registerCommand({
      name: 'disconnect',
      description: 'Disconnect from the Neo4j database',
      handler: async () => {
        await neo4jService.disconnect();
        return { success: true, message: 'Disconnected from Neo4j database' };
      }
    });
  }

  /**
   * Register a new command
   */
  private registerCommand(command: CommandDefinition) {
    this.commands.set(command.name, command);
  }

  /**
   * Start the MCP server
   */
  start(port: number = 3000) {
    this.server = serve({
      port,
      fetch: this.handleRequest.bind(this),
    });

    console.log(`MCP Neo4j server started on port ${port}`);
    return this.server;
  }

  /**
   * Stop the MCP server
   */
  stop() {
    if (this.server) {
      this.server.stop();
      this.server = null;
      console.log('MCP Neo4j server stopped');
    }
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(request: Request): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return this.createCorsResponse(new Response(null, { status: 204 }));
    }

    // Only accept POST requests for command execution
    if (request.method !== 'POST') {
      return this.createErrorResponse('Method not allowed', 405);
    }

    try {
      const url = new URL(request.url);
      const commandName = url.pathname.slice(1); // Remove leading slash

      // Check if command exists
      if (!this.commands.has(commandName)) {
        return this.createErrorResponse(`Unknown command: ${commandName}`, 404);
      }

      // Parse request body
      const body = await request.json();
      const command = this.commands.get(commandName)!;

      // Execute command
      const result = await command.handler(body);
      return this.createJsonResponse(result);
    } catch (error: any) {
      console.error('Error handling request:', error);
      return this.createErrorResponse(error.message || 'Internal server error', 500);
    }
  }

  /**
   * Create a JSON response with CORS headers
   */
  private createJsonResponse(data: any, status: number = 200): Response {
    const response = new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return this.createCorsResponse(response);
  }

  /**
   * Create an error response with CORS headers
   */
  private createErrorResponse(message: string, status: number = 400): Response {
    return this.createJsonResponse({ error: message }, status);
  }

  /**
   * Add CORS headers to a response
   */
  private createCorsResponse(response: Response): Response {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    
    // Create a new headers object with both original headers and CORS headers
    const headers: Record<string, string> = {};
    
    // Add original headers
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    // Add CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers[key] = value;
    });
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}

export default new McpServer(); 