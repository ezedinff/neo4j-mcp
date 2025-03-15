import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import neo4jService from "./services/neo4jService";
import { isErrorResponse } from "./utils/errorHandler";
import type { Neo4jConfig, QueryRequest } from "./types";

// Create an MCP server instance
const server = new McpServer({
  name: "neo4j-mcp",
  version: "1.0.0",
});

// Register Neo4j Connect tool with explicit credentials
server.tool(
  "Connect",
  "Connect to a Neo4j database with explicit credentials",
  {
    uri: z.string().describe("Neo4j database URI (e.g., neo4j://localhost:7687)"),
    username: z.string().describe("Neo4j database username"),
    password: z.string().describe("Neo4j database password"),
    database: z.string().optional().describe("Neo4j database name (optional)")
  },
  async (params) => {
    const config: Neo4jConfig = {
      uri: params.uri,
      username: params.username,
      password: params.password,
      database: params.database
    };
    
    const result = await neo4jService.connect(config);
    
    if (result && isErrorResponse(result)) {
      return {
        content: [
          {
            type: "text",
            text: `Error connecting to Neo4j: ${result.error}`,
          },
        ],
      };
    }
    
    return {
      content: [
        {
          type: "text",
          text: "Successfully connected to Neo4j database",
        },
      ],
    };
  }
);

// Register Neo4j Connect with Environment Variables tool
server.tool(
  "ConnectWithEnv",
  "Connect to Neo4j using environment variables",
  {},
  async () => {
    const result = await neo4jService.connect();
    
    if (result && isErrorResponse(result)) {
      return {
        content: [
          {
            type: "text",
            text: `Error connecting to Neo4j: ${result.error}`,
          },
        ],
      };
    }
    
    const config = neo4jService.getDefaultConfig();
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully connected to Neo4j database at ${config.uri}`,
        },
        {
          type: "text",
          text: `Using database: ${config.database || 'default'}`,
        },
      ],
    };
  }
);

// Register Neo4j Query tool
server.tool(
  "Query",
  "Execute a Cypher query against the Neo4j database",
  {
    query: z.string().describe("Cypher query to execute"),
    params: z.record(z.any()).optional().describe("Query parameters (optional)")
  },
  async (params) => {
    const queryRequest: QueryRequest = {
      query: params.query,
      params: params.params
    };
    
    const result = await neo4jService.executeQuery(queryRequest);
    
    if (isErrorResponse(result)) {
      return {
        content: [
          {
            type: "text",
            text: `Error executing query: ${result.error}`,
          },
        ],
      };
    }
    
    // Format the records for display
    const formattedRecords = JSON.stringify(result.records, null, 2);
    
    return {
      content: [
        {
          type: "text",
          text: `Query executed successfully. Found ${result.records.length} records.`,
        },
        {
          type: "resource",
          resource: {
            text: "Query Results",
            uri: `data:application/json;base64,${Buffer.from(formattedRecords).toString('base64')}`,
            mimeType: "application/json"
          }
        },
        {
          type: "text",
          text: `Query time: ${result.summary.resultAvailableAfter}ms`,
        },
      ],
    };
  }
);

// Register Neo4j Disconnect tool
server.tool(
  "Disconnect",
  "Disconnect from the Neo4j database",
  {},
  async () => {
    await neo4jService.disconnect();
    
    return {
      content: [
        {
          type: "text",
          text: "Disconnected from Neo4j database",
        },
      ],
    };
  }
);

// Start the server using stdio transport
async function main() {
  try {
    // Load environment variables
    require('dotenv').config();
    
    console.error("Starting Neo4j MCP Server...");
    
    const transport = new StdioServerTransport();
    
    console.error("Connecting to transport...");
    await server.connect(transport);
    console.error("Neo4j MCP Server running on stdio");
    
    // Keep the process alive
    process.stdin.resume();
    
    // Handle process errors
    process.on('uncaughtException', (error: Error) => {
      console.error("Uncaught exception:", error);
    });
    
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      console.error("Unhandled rejection at:", promise, "reason:", reason);
    });
  } catch (error) {
    console.error("Error in main:", error);
  }
}

export { server, main }; 