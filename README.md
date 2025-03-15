# Neo4j MCP Server for Cursor

A Cursor MCP (Model Context Protocol) server that enables seamless interaction with Neo4j databases directly from the Cursor IDE.

## Features

- Connect to Neo4j databases
- Execute Cypher queries and retrieve results
- Transform Neo4j-specific data types to standard JavaScript objects
- Uses the official MCP SDK with stdio transport for seamless integration with Cursor
- Support for environment variables for secure credential management
- Retrieve detailed database information and metrics
- Monitor connection status and diagnostics

## Prerequisites

- [Bun](https://bun.sh/) (v1.0.0 or higher)
- [Neo4j](https://neo4j.com/) database (local or remote)

## Running Neo4j with Docker Compose

This project includes a Docker Compose configuration to easily run Neo4j in a container:

1. Make sure you have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.

2. Start Neo4j using Docker Compose:
   ```bash
   docker-compose up -d
   ```

3. Access the Neo4j Browser at [http://localhost:7474](http://localhost:7474)
   - Default username: `neo4j`
   - Default password: `your_password` (as specified in the docker-compose.yml)

4. To stop Neo4j:
   ```bash
   docker-compose down
   ```

5. To stop Neo4j and remove all data:
   ```bash
   docker-compose down -v
   ```

> **Note**: The default password in docker-compose.yml is set to `your_password`. For production use, change this to a secure password and update your `.env` file accordingly.

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/neo4j-mcp.git
   cd neo4j-mcp
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory with your Neo4j credentials:
   ```
   NEO4J_URI=neo4j://localhost:7687
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=your_password
   NEO4J_DATABASE=neo4j
   NODE_ENV=development
   ```

## Usage

### Starting the Server

The server uses stdio transport for communication with Cursor, so it should be started by Cursor itself. However, you can test it manually:

```bash
# Run directly
bun run index.ts

# Run with logging using the provided script
./run-mcp-server.sh
```

### Available Tools

The MCP server exposes the following tools:

#### 1. Connect to Neo4j with Explicit Credentials

Connects to a Neo4j database with the provided credentials.

Parameters:
- `uri`: Neo4j database URI (e.g., neo4j://localhost:7687)
- `username`: Neo4j database username
- `password`: Neo4j database password
- `database`: (Optional) Neo4j database name

#### 2. Connect to Neo4j with Environment Variables

Connects to a Neo4j database using credentials from environment variables.

No parameters required.

#### 3. Execute a Cypher Query

Executes a Cypher query against the connected Neo4j database.

Parameters:
- `query`: Cypher query to execute
- `params`: (Optional) Query parameters

#### 4. Get Database Information

Retrieves detailed information about the connected Neo4j database, including:
- Neo4j version and edition
- Database name
- Node and relationship counts
- Available labels
- Relationship types

No parameters required.

#### 5. Get Connection Status

Retrieves the current connection status, including:
- Connection state (connected/disconnected)
- Connection details (URI, database)
- Connection time
- Last error (if any)

No parameters required.

#### 6. Disconnect from Neo4j

Disconnects from the Neo4j database.

No parameters required.

## Environment Variables

The following environment variables can be set in a `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| NEO4J_URI | Neo4j database URI | neo4j://localhost:7687 |
| NEO4J_USERNAME | Neo4j database username | neo4j |
| NEO4J_PASSWORD | Neo4j database password | (empty) |
| NEO4J_DATABASE | Neo4j database name | (default database) |
| NODE_ENV | Environment (development/production) | development |

## Integration with Cursor

This MCP server is designed to be used with Cursor's MCP integration. Cursor will automatically detect and use the tools provided by this server.

## Development

### Project Structure

- `index.ts` - Entry point that starts the MCP server
- `src/mcpNeo4jServer.ts` - MCP server implementation using the MCP SDK
- `src/services/neo4jService.ts` - Neo4j service for database operations
- `src/types/index.ts` - TypeScript type definitions
- `src/utils/errorHandler.ts` - Utility functions for error handling

### Building for Production

To build the server for production:

```bash
# Build the server
bun build index.ts --outdir ./dist

# Make the output file executable
chmod +x ./dist/index.js
```

The build process bundles all dependencies into a single JavaScript file, making it easy to distribute and run the server without installing dependencies.

### Running the Server

You can run the server using the provided shell script:

```bash
./run-mcp-server.sh
```

This script:
- Sets the working directory to the script's location
- Creates a logs directory if it doesn't exist
- Runs the server using Bun and logs output to `logs/mcp-server.log`

> **Note**: The script requires Bun to be installed and available in your PATH.

## License

MIT