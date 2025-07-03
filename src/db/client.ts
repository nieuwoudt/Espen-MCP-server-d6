// 🗄️ Supabase Database Client
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

export interface DatabaseConfig {
  url: string;
  serviceKey: string;
  anonKey: string;
  schema?: string;
  autoRefreshToken?: boolean;
  persistSession?: boolean;
  detectSessionInUrl?: boolean;
}

export class DatabaseClient {
  private static instance: DatabaseClient;
  private supabaseClient: SupabaseClient;
  private adminClient: SupabaseClient;
  private config: DatabaseConfig;

  private constructor(config: DatabaseConfig) {
    this.config = config;
    
    // Client for authenticated users (uses anon key + RLS)
    this.supabaseClient = createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: config.autoRefreshToken ?? true,
        persistSession: config.persistSession ?? false,
        detectSessionInUrl: config.detectSessionInUrl ?? false,
      },
    });

    // Admin client for server operations (bypasses RLS)
    this.adminClient = createClient(config.url, config.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    logger.info('Database clients initialized', {
      url: config.url,
      schema: config.schema ?? 'public',
    });
  }

  public static getInstance(config?: DatabaseConfig): DatabaseClient {
    if (!DatabaseClient.instance) {
      if (!config) {
        throw new Error('Database configuration required for first initialization');
      }
      DatabaseClient.instance = new DatabaseClient(config);
    }
    return DatabaseClient.instance;
  }

  /**
   * Get the standard Supabase client (with RLS)
   */
  public getClient(): SupabaseClient {
    return this.supabaseClient;
  }

  /**
   * Get the admin client (bypasses RLS)
   */
  public getAdminClient(): SupabaseClient {
    return this.adminClient;
  }

  /**
   * Get a client with a specific user session
   */
  public getUserClient(accessToken: string): SupabaseClient {
    const userClient = createClient(this.config.url, this.config.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    return userClient;
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseClient
        .from('tenants')
        .select('count')
        .limit(1);

      if (error) {
        logger.error('Database connection test failed', {
          error: error.message,
          code: error.code,
        });
        return false;
      }

      logger.info('Database connection test successful');
      return true;
    } catch (error: any) {
      logger.error('Database connection test error', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Execute a raw SQL query (admin only)
   */
  public async executeSQL(query: string, params?: any[]): Promise<any> {
    try {
      const { data, error } = await this.adminClient.rpc('execute_sql', {
        query,
        params: params || [],
      });

      if (error) {
        logger.error('SQL execution failed', {
          error: error.message,
          query: query.substring(0, 100),
        });
        throw error;
      }

      return data;
    } catch (error: any) {
      logger.error('SQL execution error', {
        error: error.message,
        query: query.substring(0, 100),
      });
      throw error;
    }
  }

  /**
   * Get database health metrics
   */
  public async getHealthMetrics(): Promise<{
    connected: boolean;
    responseTime: number;
    activeConnections?: number;
  }> {
    const startTime = Date.now();
    
    try {
      const connected = await this.testConnection();
      const responseTime = Date.now() - startTime;

      return {
        connected,
        responseTime,
        // TODO: Get actual connection count from pg_stat_activity
        activeConnections: 0,
      };
    } catch (error: any) {
      logger.error('Health metrics error', {
        error: error.message,
      });
      
      return {
        connected: false,
        responseTime: Date.now() - startTime,
      };
    }
  }
}

// Initialize and export database client
export const initializeDatabase = (): DatabaseClient => {
  const config: DatabaseConfig = {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    schema: process.env.SUPABASE_SCHEMA || 'public',
  };

  if (!config.url || !config.serviceKey || !config.anonKey) {
    throw new Error('Missing required Supabase configuration. Please check your environment variables.');
  }

  return DatabaseClient.getInstance(config);
};

// Export the database instance
export const db = DatabaseClient; 