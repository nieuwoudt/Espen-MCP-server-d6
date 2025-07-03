// 🗄️ Espen D6 MCP Server - Phase 3: Database Integration
import Fastify from 'fastify';
import { logger } from './utils/logger.js';
import { initializeDatabase, DatabaseClient } from './db/client.js';
import { initializeCache, CacheService } from './services/cacheService.js';
import { healthRoute } from './api/health.js';
import { UserRepository } from './db/repositories/userRepository.js';
import { ContextRepository } from './db/repositories/contextRepository.js';

// Create Fastify server instance
const server = Fastify({
  logger: false, // We use our custom logger
  trustProxy: true,
});

// Mock auth for testing (simplified)
const MOCK_USERS = [
  {
    id: 'mock-admin-1',
    email: 'admin@school.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin' as const,
    tenantId: 'mock-tenant-1',
    status: 'active' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-teacher-1',
    email: 'teacher@school.com',
    firstName: 'John',
    lastName: 'Teacher',
    role: 'teacher' as const,
    tenantId: 'mock-tenant-1',
    status: 'active' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * 🚀 Start the server
 */
async function startServer() {
  try {
    // Initialize core services
    logger.info('🚀 Starting Espen D6 MCP Server - Phase 3');
    
    // Initialize database (optional - may not have Supabase configured)
    let dbClient: DatabaseClient | null = null;
    try {
      dbClient = initializeDatabase();
      await dbClient.testConnection();
      logger.info('✅ Database connection established');
    } catch (error: any) {
      logger.warn('⚠️  Database not available - running in mock mode', {
        error: error.message,
      });
    }

    // Initialize cache (optional - may not have Redis configured)
    let cacheService: CacheService | null = null;
    try {
      cacheService = initializeCache();
      await cacheService.connect();
      logger.info('✅ Cache service connected');
    } catch (error: any) {
      logger.warn('⚠️  Cache service not available - running without cache', {
        error: error.message,
      });
    }

    // Register plugins
    await server.register(import('@fastify/helmet'), {
      contentSecurityPolicy: false, // Disable for development
    });

    await server.register(import('@fastify/cors'), {
      origin: true, // Allow all origins in development
      credentials: true,
    });

    await server.register(import('@fastify/rate-limit'), {
      max: 100,
      timeWindow: '1 minute',
    });

    // Add request logging
    server.addHook('preHandler', async (request, reply) => {
      logger.debug('Incoming request', {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });
    });

    // Health routes
    server.register(healthRoute, { prefix: '/health' });

    // Database test routes
    server.register(async function (fastify) {
      // Test user repository
      fastify.get('/api/test/users', async (request, reply) => {
        try {
          if (!dbClient) {
            // Return mock data if no database
            return {
              success: true,
              data: MOCK_USERS,
              source: 'mock',
              timestamp: new Date().toISOString(),
            };
          }

          const userRepo = new UserRepository(dbClient);
          const users = await userRepo.findUsers(
            { tenantId: 'mock-tenant-1' },
            { page: 1, limit: 10 }
          );

          return {
            success: true,
            data: users.data,
            count: users.count,
            source: 'database',
            timestamp: new Date().toISOString(),
          };
        } catch (error: any) {
          logger.error('Users test endpoint error', {
            error: error.message,
          });

          return reply.status(500).send({
            success: false,
            error: error.message,
            source: 'database',
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Test context repository
      fastify.get('/api/test/contexts', async (request, reply) => {
        try {
          if (!dbClient) {
            // Return mock context data
            return {
              success: true,
              data: [
                {
                  id: 'mock-context-1',
                  userId: 'mock-teacher-1',
                  contextType: 'teacher',
                  tenantId: 'mock-tenant-1',
                  data: { subjects: ['Math', 'Science'] },
                  metadata: { lastUpdated: new Date().toISOString() },
                },
              ],
              source: 'mock',
              timestamp: new Date().toISOString(),
            };
          }

          const contextRepo = new ContextRepository(dbClient);
          const contexts = await contextRepo.findContexts(
            { tenantId: 'mock-tenant-1' },
            { page: 1, limit: 10 }
          );

          return {
            success: true,
            data: contexts.data,
            count: contexts.count,
            source: 'database',
            timestamp: new Date().toISOString(),
          };
        } catch (error: any) {
          logger.error('Contexts test endpoint error', {
            error: error.message,
          });

          return reply.status(500).send({
            success: false,
            error: error.message,
            source: 'database',
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Test cache operations
      fastify.get('/api/test/cache', async (request, reply) => {
        try {
          if (!cacheService) {
            return {
              success: false,
              error: 'Cache service not available',
              source: 'cache',
              timestamp: new Date().toISOString(),
            };
          }

          // Test cache operations
          const testKey = 'test:espen:cache';
          const testData = {
            message: 'Hello from cache!',
            timestamp: new Date().toISOString(),
          };

          // Set data
          await cacheService.set(testKey, testData, 60); // 1 minute TTL

          // Get data
          const cachedData = await cacheService.get(testKey);

          // Get statistics
          const stats = cacheService.getStats();

          return {
            success: true,
            data: {
              original: testData,
              cached: cachedData,
              match: JSON.stringify(testData) === JSON.stringify(cachedData),
            },
            stats,
            source: 'cache',
            timestamp: new Date().toISOString(),
          };
        } catch (error: any) {
          logger.error('Cache test endpoint error', {
            error: error.message,
          });

          return reply.status(500).send({
            success: false,
            error: error.message,
            source: 'cache',
            timestamp: new Date().toISOString(),
          });
        }
      });
    });

    // Simple context endpoint (Phase 1 compatibility)
    server.get('/api/context', async (request, reply) => {
      const mockContext = {
        user: {
          id: 'mock-user-123',
          role: 'teacher',
          name: 'John Doe',
          school: 'Example High School',
        },
        performance: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          timestamp: new Date().toISOString(),
        },
        services: {
          database: dbClient ? 'connected' : 'not-configured',
          cache: cacheService ? 'connected' : 'not-configured',
        },
      };

      return reply.send(mockContext);
    });

    // Error handler
    server.setErrorHandler((error, request, reply) => {
      logger.error('Server error', {
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    });

    // Start server
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || 'localhost';

    await server.listen({ port, host });

    logger.info(`🎯 Espen D6 MCP Server running on http://${host}:${port}`, {
      port,
      host,
      environment: process.env.NODE_ENV || 'development',
      database: dbClient ? 'connected' : 'not-configured',
      cache: cacheService ? 'connected' : 'not-configured',
    });

    logger.info('📋 Available endpoints:', {
      endpoints: [
        `GET  http://${host}:${port}/health`,
        `GET  http://${host}:${port}/health/detailed`,
        `GET  http://${host}:${port}/api/context`,
        `GET  http://${host}:${port}/api/test/users`,
        `GET  http://${host}:${port}/api/test/contexts`,
        `GET  http://${host}:${port}/api/test/cache`,
      ],
    });

  } catch (error: any) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Handle graceful shutdown
async function gracefulShutdown() {
  logger.info('🛑 Shutting down Espen D6 MCP Server...');

  try {
    // Close server
    await server.close();
    logger.info('✅ Server closed');

    // Disconnect cache
    try {
      const cacheService = CacheService.getInstance();
      await cacheService.disconnect();
      logger.info('✅ Cache disconnected');
    } catch (error: any) {
      logger.debug('Cache disconnect skipped', {
        reason: error.message,
      });
    }

    logger.info('👋 Shutdown complete');
    process.exit(0);
  } catch (error: any) {
    logger.error('Error during shutdown', {
      error: error.message,
    });
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
startServer(); 