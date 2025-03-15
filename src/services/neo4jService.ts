import neo4j, { Driver, Session, Result, Record as Neo4jRecord, ResultSummary } from 'neo4j-driver';
import type { Neo4jConfig, QueryRequest, QueryResponse, ErrorResponse, DatabaseInfo } from '../types';
import { createErrorResponse } from '../utils/errorHandler';

class Neo4jService {
  private driver: Driver | null = null;
  private config: Neo4jConfig | null = null;
  private connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  private lastError: string | null = null;
  private connectionTime: Date | null = null;

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
   * Get current connection status
   */
  getStatus() {
    return {
      status: this.connectionStatus,
      config: this.config ? {
        uri: this.config.uri,
        username: this.config.username,
        database: this.config.database
      } : null,
      connectionTime: this.connectionTime,
      lastError: this.lastError
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
      
      console.log(`Connecting to Neo4j at ${this.config.uri} with username ${this.config.username}`);
      
      // Close existing driver if it exists
      if (this.driver) {
        console.log('Closing existing driver before reconnecting');
        await this.driver.close();
      }
      
      // Create new driver
      this.driver = neo4j.driver(
        this.config.uri,
        neo4j.auth.basic(this.config.username, this.config.password),
        {
          maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
        }
      );

      // Test the connection with a simple query
      const session = this.driver.session({
        database: this.config.database
      });
      
      try {
        console.log('Testing connection with a simple query...');
        const result = await session.run('RETURN 1 as test');
        console.log('Test query successful:', result?.records?.[0]?.get('test')?.toNumber() ?? 'No result');
        this.connectionStatus = 'connected';
        this.connectionTime = new Date();
        this.lastError = null;
      } catch (error: any) {
        console.error('Test query failed:', error);
        this.connectionStatus = 'error';
        this.lastError = error.message;
        return {
          error: `Connection test failed: ${error.message}`,
          code: error.code,
          stack: error.stack
        };
      } finally {
        await session.close();
      }
      
      console.log('Successfully connected to Neo4j database');
      return;
    } catch (error: any) {
      console.error('Failed to connect to Neo4j:', error);
      this.connectionStatus = 'error';
      this.lastError = error.message;
      return {
        error: `Failed to connect to Neo4j: ${error.message}`,
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
      console.error('Driver not initialized');
      return { error: 'Neo4j driver not initialized. Call connect() first.' };
    }

    if (this.connectionStatus !== 'connected') {
      console.error('Not connected to Neo4j');
      return { error: `Not connected to Neo4j. Current status: ${this.connectionStatus}` };
    }

    console.log(`Executing query: ${request.query}`);
    console.log(`With params: ${JSON.stringify(request.params || {})}`);

    const session: Session = this.driver.session({
      database: this.config?.database
    });

    try {
      console.log('Session created, running query...');
      const startTime = Date.now();
      const result = await session.run(request.query, request.params || {});
      const endTime = Date.now();
      console.log(`Query executed successfully in ${endTime - startTime}ms`);

      // Transform records to a more usable format
      const records = result.records.map((record: Neo4jRecord) => {
        const obj: Record<string, any> = {};
        record.keys.forEach((key) => {
          obj[key.toString()] = this.transformValue(record.get(key));
        });
        return obj;
      });

      console.log(`Found ${records.length} records`);

      return {
        records,
        summary: {
          resultAvailableAfter: result.summary.resultAvailableAfter.toNumber(),
          resultConsumedAfter: result.summary.resultConsumedAfter.toNumber()
        }
      };
    } catch (error: any) {
      console.error('Error executing Neo4j query:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        name: error.name
      });
      return {
        error: `Error executing Neo4j query: ${error.message || 'Unknown error'}`,
        code: error.code,
        stack: error.stack
      };
    } finally {
      await session.close();
      console.log('Session closed');
    }
  }

  /**
   * Get database information
   */
  async getDatabaseInfo(): Promise<DatabaseInfo | ErrorResponse> {
    if (!this.driver) {
      console.error('Driver not initialized');
      return { error: 'Neo4j driver not initialized. Call connect() first.' };
    }

    const session: Session = this.driver.session({
      database: this.config?.database
    });

    try {
      // Get Neo4j version
      const versionResult = await session.run('CALL dbms.components() YIELD name, versions, edition RETURN name, versions, edition');
      const version = versionResult.records?.[0]?.get('versions')?.[0] || 'Unknown';
      const edition = versionResult.records?.[0]?.get('edition') || 'Unknown';
      
      // Get database name
      const dbNameResult = await session.run('CALL db.info() YIELD name RETURN name');
      const dbName = dbNameResult.records?.[0]?.get('name') || 'Unknown';
      
      // Get node and relationship counts
      const countResult = await session.run(`
        MATCH (n)
        RETURN count(n) as nodeCount,
               count(()-[]->()) as relationshipCount
      `);
      
      const nodeCount = countResult.records?.[0]?.get('nodeCount')?.toNumber() || 0;
      const relationshipCount = countResult.records?.[0]?.get('relationshipCount')?.toNumber() || 0;
      
      // Get available labels
      const labelsResult = await session.run('CALL db.labels() YIELD label RETURN collect(label) as labels');
      const labels = labelsResult.records?.[0]?.get('labels') || [];
      
      // Get available relationship types
      const relTypesResult = await session.run('CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) as relationshipTypes');
      const relationshipTypes = relTypesResult.records?.[0]?.get('relationshipTypes') || [];
      
      return {
        version,
        edition,
        database: dbName,
        nodeCount,
        relationshipCount,
        labels,
        relationshipTypes
      };
    } catch (error: any) {
      console.error('Error getting database info:', error);
      return {
        error: `Error getting database info: ${error.message || 'Unknown error'}`,
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
      this.connectionStatus = 'disconnected';
      this.connectionTime = null;
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