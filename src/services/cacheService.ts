// 🗄️ Cache Service (Redis)
import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger.js';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  connected: boolean;
  responseTime: number;
}

export class CacheService {
  private static instance: CacheService;
  private redis: RedisClientType;
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
  };

  private constructor(config: CacheConfig) {
    this.config = config;
    
    // Create Redis client with correct configuration
    const connectionUrl = `redis://${config.password ? `:${config.password}@` : ''}${config.host}:${config.port}/${config.db || 0}`;
    
    this.redis = createClient({
      url: connectionUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > (config.retryAttempts || 3)) {
            logger.error('Redis retry attempts exhausted');
            return false;
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    this.setupEventHandlers();
  }

  public static getInstance(config?: CacheConfig): CacheService {
    if (!CacheService.instance) {
      if (!config) {
        throw new Error('Cache configuration required for first initialization');
      }
      CacheService.instance = new CacheService(config);
    }
    return CacheService.instance;
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('Redis cache connected');
    });

    this.redis.on('ready', () => {
      logger.info('Redis cache ready');
    });

    this.redis.on('error', (error: any) => {
      logger.error('Redis cache error', {
        error: error.message,
        host: this.config.host,
        port: this.config.port,
      });
    });

    this.redis.on('end', () => {
      logger.warn('Redis cache connection ended');
    });

    this.redis.on('reconnecting', () => {
      logger.info('Redis cache reconnecting');
    });
  }

  /**
   * Connect to Redis
   */
  public async connect(): Promise<void> {
    try {
      await this.redis.connect();
      logger.info('Cache service connected successfully');
    } catch (error: any) {
      logger.error('Failed to connect to cache service', {
        error: error.message,
        host: this.config.host,
        port: this.config.port,
      });
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
      logger.info('Cache service disconnected');
    } catch (error: any) {
      logger.error('Error disconnecting from cache service', {
        error: error.message,
      });
    }
  }

  /**
   * Test cache connection
   */
  public async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error: any) {
      logger.error('Cache ping failed', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get value from cache
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      const startTime = Date.now();
      const value = await this.redis.get(key);
      
      if (value === null) {
        this.stats.misses++;
        logger.debug('Cache miss', { key, responseTime: Date.now() - startTime });
        return null;
      }

      this.stats.hits++;
      const parsed = JSON.parse(value) as T;
      logger.debug('Cache hit', { key, responseTime: Date.now() - startTime });
      return parsed;
    } catch (error: any) {
      logger.error('Cache get error', {
        key,
        error: error.message,
      });
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  public async set(
    key: string, 
    value: any, 
    ttlSeconds: number = 3600
  ): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.setEx(key, ttlSeconds, serialized);
      
      logger.debug('Cache set', { 
        key, 
        ttl: ttlSeconds,
        size: serialized.length 
      });
      
      return true;
    } catch (error: any) {
      logger.error('Cache set error', {
        key,
        ttl: ttlSeconds,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  public async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      logger.debug('Cache delete', { key, deleted: result > 0 });
      return result > 0;
    } catch (error: any) {
      logger.error('Cache delete error', {
        key,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Delete multiple keys
   */
  public async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(keys);
      logger.debug('Cache pattern delete', { 
        pattern, 
        keysFound: keys.length, 
        deleted: result 
      });
      
      return result;
    } catch (error: any) {
      logger.error('Cache pattern delete error', {
        pattern,
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error: any) {
      logger.error('Cache exists error', {
        key,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Set TTL for existing key
   */
  public async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, ttlSeconds);
      return result;
    } catch (error: any) {
      logger.error('Cache expire error', {
        key,
        ttl: ttlSeconds,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get remaining TTL for key
   */
  public async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error: any) {
      logger.error('Cache TTL error', {
        key,
        error: error.message,
      });
      return -1;
    }
  }

  /**
   * Increment counter
   */
  public async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const result = await this.redis.incrBy(key, amount);
      logger.debug('Cache increment', { key, amount, result });
      return result;
    } catch (error: any) {
      logger.error('Cache increment error', {
        key,
        amount,
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      connected: this.redis.isReady,
      responseTime: 0, // Would need to track this separately
    };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
    logger.info('Cache statistics reset');
  }

  /**
   * Get cache health info
   */
  public async getHealthInfo(): Promise<{
    connected: boolean;
    responseTime: number;
    memoryUsage?: string;
    keyCount?: number;
  }> {
    const startTime = Date.now();
    
    try {
      const pingResult = await this.ping();
      const responseTime = Date.now() - startTime;

      let memoryUsage: string | undefined;
      let keyCount: number | undefined;

      if (pingResult) {
        try {
          // Get memory info
          const info = await this.redis.info('memory');
          const memoryMatch = info.match(/used_memory_human:(.+)/);
          memoryUsage = memoryMatch ? memoryMatch[1].trim() : undefined;

          // Get key count
          keyCount = await this.redis.dbSize();
        } catch (error: any) {
          logger.debug('Could not get detailed cache info', {
            error: error.message,
          });
        }
      }

      return {
        connected: pingResult,
        responseTime,
        memoryUsage,
        keyCount,
      };
    } catch (error: any) {
      return {
        connected: false,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Cache key generators for consistent naming
   */
  public static keys = {
    userContext: (userId: string, tenantId: string) => 
      `espen:context:${tenantId}:${userId}`,
    
    learnerData: (learnerId: string, tenantId: string) =>
      `espen:learner:${tenantId}:${learnerId}`,
    
    teacherData: (teacherId: string, tenantId: string) =>
      `espen:teacher:${tenantId}:${teacherId}`,
    
    parentData: (parentId: string, tenantId: string) =>
      `espen:parent:${tenantId}:${parentId}`,
    
    d6Data: (endpoint: string, tenantId: string, params?: string) =>
      `espen:d6:${tenantId}:${endpoint}${params ? `:${params}` : ''}`,
    
    session: (sessionId: string) =>
      `espen:session:${sessionId}`,
    
    rateLimit: (identifier: string) =>
      `espen:ratelimit:${identifier}`,
    
    tenant: (tenantId: string) =>
      `espen:tenant:${tenantId}`,
  };
}

// Initialize and export cache service
export const initializeCache = (): CacheService => {
  const config: CacheConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryAttempts: 3,
    retryDelay: 100,
  };

  return CacheService.getInstance(config);
};

// Export the cache instance
export const cache = CacheService; 