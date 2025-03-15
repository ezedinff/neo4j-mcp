import neo4j, { Driver, Session, Result, Record as Neo4jRecord, ResultSummary } from 'neo4j-driver';
import type { Neo4jConfig, QueryRequest, QueryResponse, ErrorResponse } from '../types';
import { createErrorResponse } from '../utils/errorHandler';

class Neo4jService {
  private driver: Driver | null = null;
  private config: Neo4jConfig | null = null;

  /**
   * Get default configuration from environment variables
   */
  getDefaultConfig(): Neo4jConfig {
    return {
      uri: process.env.NEO4J_URI || 'neo4j://localhost:7687',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || '',
      database: process.env.NEO4J_DATABASE
    };
  }

  /**
   * Initialize the Neo4j driver with the provided configuration
   * If no config is provided, use environment variables
   */
  async connect(config?: Neo4jConfig): Promise<void | ErrorResponse> {
    try {
      // Use provided config or default from environment variables
      this.config = config || this.getDefaultConfig();
      
      // Validate required fields
      if (!this.config.uri) return createErrorResponse('Neo4j URI is required');
      if (!this.config.username) return createErrorResponse('Neo4j username is required');
      if (!this.config.password) return createErrorResponse('Neo4j password is required');
      
      this.driver = neo4j.driver(
        this.config.uri,
        neo4j.auth.basic(this.config.username, this.config.password)
      );

      // Test the connection
      const session = this.driver.session();
      await session.close();
      
      console.log('Successfully connected to Neo4j database');
      return;
    } catch (error: any) {
      console.error('Failed to connect to Neo4j:', error);
      return {
        error: 'Failed to connect to Neo4j',
        code: error.code,
        stack: error.stack
      };
    }
  }

  /**
   * Execute a Cypher query against the Neo4j database
   */
  async executeQuery(request: QueryRequest): Promise<QueryResponse | ErrorResponse> {
    if (!this.driver) {
      return { error: 'Neo4j driver not initialized. Call connect() first.' };
    }

    const session: Session = this.driver.session({
      database: this.config?.database
    });

    try {
      const result = await session.run(request.query, request.params || {});

      // Transform records to a more usable format
      const records = result.records.map((record: Neo4jRecord) => {
        const obj: Record<string, any> = {};
        record.keys.forEach((key) => {
          obj[key.toString()] = this.transformValue(record.get(key));
        });
        return obj;
      });

      return {
        records,
        summary: {
          resultAvailableAfter: result.summary.resultAvailableAfter.toNumber(),
          resultConsumedAfter: result.summary.resultConsumedAfter.toNumber()
        }
      };
    } catch (error: any) {
      console.error('Error executing Neo4j query:', error);
      return {
        error: 'Error executing Neo4j query',
        code: error.code,
        stack: error.stack
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Disconnect from the Neo4j database
   */
  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      this.config = null;
      console.log('Disconnected from Neo4j database');
    }
  }

  /**
   * Transform Neo4j values to plain JavaScript objects
   */
  private transformValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Handle Neo4j Integer
    if (neo4j.isInt(value)) {
      return value.toNumber();
    }

    // Handle Neo4j Node
    if (value.constructor.name === 'Node') {
      const result: any = { ...value.properties };
      result.id = value.identity.toNumber();
      result.labels = value.labels;
      return result;
    }

    // Handle Neo4j Relationship
    if (value.constructor.name === 'Relationship') {
      const result: any = { ...value.properties };
      result.id = value.identity.toNumber();
      result.type = value.type;
      result.startNodeId = value.start.toNumber();
      result.endNodeId = value.end.toNumber();
      return result;
    }

    // Handle Neo4j Path
    if (value.constructor.name === 'Path') {
      return {
        segments: value.segments.map((segment: any) => ({
          start: this.transformValue(segment.start),
          relationship: this.transformValue(segment.relationship),
          end: this.transformValue(segment.end)
        }))
      };
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(item => this.transformValue(item));
    }

    // Handle objects
    if (typeof value === 'object') {
      const result: Record<string, any> = {};
      for (const key in value) {
        result[key] = this.transformValue(value[key]);
      }
      return result;
    }

    return value;
  }
}

export default new Neo4jService(); 