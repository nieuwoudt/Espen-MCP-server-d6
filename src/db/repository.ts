// 🗄️ Base Repository Class
import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseClient } from './client.js';
import { logger } from '../utils/logger.js';

export interface DatabaseError extends Error {
  code?: string;
  details?: string;
  hint?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface QueryResult<T> {
  data: T[];
  count?: number;
  hasMore?: boolean;
  page?: number;
}

export abstract class BaseRepository {
  protected db: SupabaseClient;
  protected adminDb: SupabaseClient;
  protected tableName: string;

  constructor(tableName: string, dbClient?: DatabaseClient) {
    const client = dbClient || DatabaseClient.getInstance();
    this.db = client.getClient();
    this.adminDb = client.getAdminClient();
    this.tableName = tableName;
  }

  /**
   * Set user context for RLS
   */
  protected setUserContext(userId: string, tenantId: string): void {
    // Set RLS context for the current user
    this.db.rpc('set_current_user_context', {
      user_id: userId,
      tenant_id: tenantId,
    });
  }

  /**
   * Handle database errors consistently
   */
  protected handleError(error: any, operation: string): never {
    const dbError: DatabaseError = new Error(
      `Database operation failed: ${operation}`
    );
    
    if (error.code) dbError.code = error.code;
    if (error.details) dbError.details = error.details;
    if (error.hint) dbError.hint = error.hint;

    logger.error('Database error', {
      operation,
      table: this.tableName,
      error: error.message,
      code: error.code,
      details: error.details,
    });

    throw dbError;
  }

  /**
   * Generic find by ID
   */
  protected async findById<T>(
    id: string,
    select: string = '*',
    useAdmin: boolean = false
  ): Promise<T | null> {
    try {
      const client = useAdmin ? this.adminDb : this.db;
      const { data, error } = await client
        .from(this.tableName)
        .select(select)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows found
        }
        this.handleError(error, `findById(${id})`);
      }

      return data as T;
    } catch (error: any) {
      this.handleError(error, `findById(${id})`);
    }
  }

  /**
   * Generic find many with pagination
   */
  protected async findMany<T>(
    filters: Record<string, any> = {},
    options: PaginationOptions = {},
    select: string = '*',
    useAdmin: boolean = false
  ): Promise<QueryResult<T>> {
    try {
      const client = useAdmin ? this.adminDb : this.db;
      const {
        page = 1,
        limit = 50,
        orderBy = 'created_at',
        orderDirection = 'desc',
      } = options;

      let query = client.from(this.tableName).select(select, { count: 'exact' });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      });

      // Apply pagination and ordering
      const offset = (page - 1) * limit;
      query = query
        .order(orderBy, { ascending: orderDirection === 'asc' })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        this.handleError(error, 'findMany');
      }

      return {
        data: (data as T[]) || [],
        count: count || 0,
        hasMore: count ? offset + limit < count : false,
        page,
      };
    } catch (error: any) {
      this.handleError(error, 'findMany');
    }
  }

  /**
   * Generic create
   */
  protected async create<T>(
    data: Partial<T>,
    select: string = '*',
    useAdmin: boolean = false
  ): Promise<T> {
    try {
      const client = useAdmin ? this.adminDb : this.db;
      const { data: result, error } = await client
        .from(this.tableName)
        .insert(data)
        .select(select)
        .single();

      if (error) {
        this.handleError(error, 'create');
      }

      logger.info('Record created', {
        table: this.tableName,
        id: (result as any)?.id,
      });

      return result as T;
    } catch (error: any) {
      this.handleError(error, 'create');
    }
  }

  /**
   * Generic update
   */
  protected async update<T>(
    id: string,
    data: Partial<T>,
    select: string = '*',
    useAdmin: boolean = false
  ): Promise<T | null> {
    try {
      const client = useAdmin ? this.adminDb : this.db;
      const { data: result, error } = await client
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select(select)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows found
        }
        this.handleError(error, `update(${id})`);
      }

      logger.info('Record updated', {
        table: this.tableName,
        id,
      });

      return result as T;
    } catch (error: any) {
      this.handleError(error, `update(${id})`);
    }
  }

  /**
   * Generic delete
   */
  protected async delete(
    id: string,
    useAdmin: boolean = false
  ): Promise<boolean> {
    try {
      const client = useAdmin ? this.adminDb : this.db;
      const { error } = await client
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        this.handleError(error, `delete(${id})`);
      }

      logger.info('Record deleted', {
        table: this.tableName,
        id,
      });

      return true;
    } catch (error: any) {
      this.handleError(error, `delete(${id})`);
    }
  }

  /**
   * Check if record exists
   */
  protected async exists(
    id: string,
    useAdmin: boolean = false
  ): Promise<boolean> {
    try {
      const client = useAdmin ? this.adminDb : this.db;
      const { data, error } = await client
        .from(this.tableName)
        .select('id')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false; // No rows found
        }
        this.handleError(error, `exists(${id})`);
      }

      return !!data;
    } catch (error: any) {
      this.handleError(error, `exists(${id})`);
    }
  }

  /**
   * Execute custom query
   */
  protected async executeQuery<T>(
    queryBuilder: (client: SupabaseClient) => any,
    operation: string,
    useAdmin: boolean = false
  ): Promise<T> {
    try {
      const client = useAdmin ? this.adminDb : this.db;
      const { data, error } = await queryBuilder(client);

      if (error) {
        this.handleError(error, operation);
      }

      return data as T;
    } catch (error: any) {
      this.handleError(error, operation);
    }
  }
}

/**
 * Repository factory for creating typed repositories
 */
export class RepositoryFactory {
  private static repositories: Map<string, BaseRepository> = new Map();

  static getRepository<T extends BaseRepository>(
    repositoryClass: new (...args: any[]) => T,
    ...args: any[]
  ): T {
    const key = repositoryClass.name;
    
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new repositoryClass(...args));
    }

    return this.repositories.get(key) as T;
  }

  static clearCache(): void {
    this.repositories.clear();
  }
} 