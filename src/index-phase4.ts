// 🚀 Espen D6 MCP Server - Phase 4: Complete D6 Integration
import Fastify from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import { logger } from './utils/logger.js';
import { healthRoute } from './api/health.js';
import { contextRoute } from './api/context.js';
import { syncRoute } from './api/d6-sync.js';
import { authRoute } from './api/auth.js';
import { authMiddleware } from './middleware/auth.js';
import { tenantScopeMiddleware } from './middleware/tenantScope.js';
import { DatabaseClient } from './db/client.js';
import { CacheService } from './services/cacheService.js';
import { DataSyncService } from './services/dataSyncService.js';
import { D6ApiService, initializeD6Api } from './services/d6ApiService.js';

// Environment variables with defaults
const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || 'espen-d6-development-secret-key-change-in-production';

// Service instances
let dbClient: DatabaseClient;
let cacheService: CacheService;
let d6ApiService: D6ApiService;
let dataSyncService: DataSyncService;

// Create Fastify server instance
const fastify = Fastify({
  logger: {
    level: NODE_ENV === 'development' ? 'debug' : 'info',
    transport: NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
});

/**
 * Initialize all services
 */
async function initializeServices(): Promise<void> {
  logger.info('Initializing services...');

  try {
    // Initialize database client
    dbClient = DatabaseClient.getInstance();
    const dbHealth = await dbClient.getHealthMetrics();
    logger.info('Database client initialized', { 
      connected: dbHealth.connected,
      responseTime: dbHealth.responseTime,
    });

    // Initialize cache service (with fallback)
    try {
      cacheService = CacheService.getInstance();
      const cacheHealth = await cacheService.getHealthInfo();
      logger.info('Cache service initialized', { 
        connected: cacheHealth.connected,
        type: cacheHealth.type,
      });
    } catch (error: any) {
      logger.warn('Cache service initialization failed, using in-memory cache', {
        error: error.message,
      });
      // Cache will fall back to in-memory
    }

    // Initialize D6 API service (with graceful failure)
    try {
      d6ApiService = initializeD6Api();
      if (cacheService) {
        d6ApiService.setCache(cacheService);
      }
      
      const d6Health = await d6ApiService.getHealthInfo();
      logger.info('D6 API service initialized', { 
        connected: d6Health.connected,
        authenticated: d6Health.authenticated,
      });
    } catch (error: any) {
      logger.warn('D6 API service initialization failed', {
        error: error.message,
        message: 'Some features may be limited',
      });
      // Continue without D6 API - server can still provide basic functionality
    }

    // Initialize data sync service
    dataSyncService = DataSyncService.getInstance();
    dataSyncService.initialize(d6ApiService, cacheService, dbClient);
    logger.info('Data sync service initialized');

    logger.info('All services initialized successfully');

  } catch (error: any) {
    logger.error('Service initialization failed', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Setup security plugins
 */
async function setupSecurity(): Promise<void> {
  // Helmet for security headers
  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });

  // CORS configuration
  await fastify.register(fastifyCors, {
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://espen.ai',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
  });

  // JWT authentication
  await fastify.register(fastifyJwt, {
    secret: JWT_SECRET,
    sign: {
      expiresIn: '24h',
      issuer: 'espen-d6-mcp',
      audience: 'espen-d6-users',
    },
    verify: {
      issuer: 'espen-d6-mcp',
      audience: 'espen-d6-users',
    },
  });

  // Rate limiting
  await fastify.register(fastifyRateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
    errorResponseBuilder: () => ({
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later',
      statusCode: 429,
      retryAfter: 60,
    }),
  });

  logger.info('Security plugins configured');
}

/**
 * Setup middleware
 */
async function setupMiddleware(): Promise<void> {
  // Global error handler
  fastify.setErrorHandler(async (error, request, reply) => {
    const statusCode = error.statusCode || 500;
    
    logger.error('Request error', {
      url: request.url,
      method: request.method,
      statusCode,
      error: error.message,
      stack: error.stack,
      headers: request.headers,
    });

    // Don't expose internal errors in production
    const message = NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : error.message;

    return reply.status(statusCode).send({
      error: 'Request failed',
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    });
  });

  // Request/response logging
  fastify.addHook('onRequest', async (request) => {
    logger.debug('Incoming request', {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    logger.debug('Response sent', {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.getResponseTime(),
    });
  });

  // Authentication middleware for protected routes
  fastify.addHook('preHandler', authMiddleware);

  // Tenant scoping middleware
  fastify.addHook('preHandler', tenantScopeMiddleware);

  logger.info('Middleware configured');
}

/**
 * Setup API routes
 */
async function setupRoutes(): Promise<void> {
  // Health check (public)
  await fastify.register(healthRoute, { prefix: '/health' });

  // Authentication routes (public)
  await fastify.register(authRoute, { prefix: '/auth' });

  // Context routes (protected)
  await fastify.register(contextRoute, { prefix: '/context' });

  // D6 sync routes (protected)
  await fastify.register(syncRoute, { prefix: '/sync' });

  // Root endpoint
  fastify.get('/', async () => ({
    name: 'Espen D6 MCP Server',
    version: '1.0.0',
    phase: 4,
    description: 'Multi-tenant MCP server integrating Espen.ai with D6 School Information System',
    status: 'running',
    features: [
      'JWT Authentication',
      'Multi-tenant Support',
      'D6 API Integration',
      'Real-time Data Sync',
      'Redis Caching',
      'PostgreSQL Database',
      'Comprehensive Logging',
      'Health Monitoring',
    ],
    endpoints: {
      health: '/health',
      auth: '/auth/*',
      context: '/context/*',
      sync: '/sync/*',
    },
    timestamp: new Date().toISOString(),
  }));

  logger.info('API routes configured');
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Close Fastify server
    await fastify.close();
    logger.info('Fastify server closed');

    // Close database connections
    if (dbClient) {
      await dbClient.close();
      logger.info('Database connections closed');
    }

    // Close cache connections
    if (cacheService) {
      await cacheService.close();
      logger.info('Cache connections closed');
    }

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error: any) {
    logger.error('Error during graceful shutdown', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

/**
 * Main server startup function
 */
async function startServer(): Promise<void> {
  try {
    logger.info('Starting Espen D6 MCP Server (Phase 4)...', {
      nodeVersion: process.version,
      environment: NODE_ENV,
      port: PORT,
      host: HOST,
    });

    // Initialize services first
    await initializeServices();

    // Setup server components
    await setupSecurity();
    await setupMiddleware();
    await setupRoutes();

    // Start the server
    const address = await fastify.listen({
      port: PORT,
      host: HOST,
    });

    logger.info('Server started successfully', {
      address,
      port: PORT,
      host: HOST,
      environment: NODE_ENV,
      features: {
        database: !!dbClient,
        cache: !!cacheService,
        d6Api: !!d6ApiService,
        dataSync: !!dataSyncService,
      },
    });

    // Test sync on startup (optional)
    if (process.env.SYNC_ON_STARTUP === 'true' && dataSyncService) {
      logger.info('Performing initial data sync...');
      try {
        const syncResult = await dataSyncService.performFullSync('default-tenant');
        logger.info('Initial sync completed', {
          success: syncResult.success,
          stats: syncResult.stats,
          duration: syncResult.duration,
        });
      } catch (error: any) {
        logger.warn('Initial sync failed', {
          error: error.message,
          message: 'Server will continue without initial sync',
        });
      }
    }

  } catch (error: any) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Handle process signals for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    reason,
    promise,
  });
  process.exit(1);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { fastify, startServer }; 