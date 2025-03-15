// Types for Neo4j MCP Server

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
}

export interface QueryRequest {
  query: string;
  params?: Record<string, any>;
}

export interface QueryResponse {
  records: Record<string, any>[];
  summary: {
    resultAvailableAfter: number;
    resultConsumedAfter: number;
  };
}

export interface ErrorResponse {
  error: string;
  code?: string;
  stack?: string;
}

export interface CommandDefinition {
  name: string;
  description: string;
  handler: (params: any) => Promise<any>;
}

export interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'error';
  config: {
    uri: string;
    username: string;
    database?: string;
  } | null;
  connectionTime: Date | null;
  lastError: string | null;
}

export interface DatabaseInfo {
  version: string;
  edition: string;
  database: string;
  nodeCount: number;
  relationshipCount: number;
  labels: string[];
  relationshipTypes: string[];
} 