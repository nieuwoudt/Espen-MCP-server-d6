// 🚀 Espen D6 MCP Server - Enhanced with Authentication
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';

import { logger } from './utils/logger.js';
import { healthRoute } from './api/health.js';
import { authRoute } from './api/auth.js';
import { authMiddleware } from './middleware/auth.js';
import { tenantScopeMiddleware } from './middleware/tenantScope.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // 🔐 Security plugins
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  });

  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // JWT authentication plugin
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    timeWindow: Number(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
  });

  // 🔧 Add middleware hooks (but skip for auth routes)
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip auth middleware for login/register routes
    if (request.url.startsWith('/auth/')) {
      return;
    }
    return authMiddleware(request, reply);
  });

  fastify.addHook('preHandler', async (request, reply) => {
    // Skip tenant middleware for auth routes
    if (request.url.startsWith('/auth/')) {
      return;
    }
    return tenantScopeMiddleware(request, reply);
  });

  // 📍 Register routes
  await fastify.register(healthRoute, { prefix: '/health' });
  await fastify.register(authRoute, { prefix: '/auth' });

  // 🎯 Root route
  fastify.get('/', async () => {
    return {
      message: '🧠 Espen D6 MCP Server',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      features: ['authentication', 'multi-tenant', 'caching'],
      endpoints: {
        health: '/health',
        auth: {
          login: 'POST /auth/login',
          refresh: 'POST /auth/refresh',
          logout: 'POST /auth/logout',
          me: 'GET /auth/me',
        },
        context: '/context/:userId (requires auth)',
        sync: '/sync/d6 (requires auth)',
      },
    };
  });

  // Mock protected context endpoint
  fastify.get('/context/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const user = (request as any).user;
    const tenant = (request as any).tenant;
    
    return {
      success: true,
      data: {
        id: userId,
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        role: 'learner',
        grade: 10,
        class: '10A',
        academic: {
          overallAverage: 78.5,
          subjectsCount: 7,
        },
        attendance: {
          percentage: 92.5,
          totalDays: 180,
        },
        requestedBy: {
          userId: user?.id,
          role: user?.role,
          tenantId: tenant?.id,
        },
        metadata: {
          lastUpdated: new Date().toISOString(),
          version: 1,
        },
      },
      cached: false,
      generatedAt: new Date().toISOString(),
    };
  });

  // 🚨 Error handler
  fastify.setErrorHandler((error, request, reply) => {
    logger.error('Request error:', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      ip: request.ip,
    });

    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Internal Server Error' : error.message;

    reply.status(statusCode).send({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  });

  return fastify;
}

async function start() {
  try {
    const server = await buildServer();
    
    await server.listen({ port: PORT, host: HOST });
    
    logger.info('🚀 Espen D6 MCP Server started with authentication', {
      port: PORT,
      host: HOST,
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      features: ['JWT Auth', 'Multi-tenant', 'Rate Limiting'],
    });
    
    console.log(`🔐 Authentication endpoints:`);
    console.log(`   POST http://${HOST}:${PORT}/auth/login`);
    console.log(`   GET  http://${HOST}:${PORT}/auth/me`);
    console.log(`🏥 Health check: http://${HOST}:${PORT}/health`);
    console.log(`🎯 Demo login: admin@school.com / password123`);
    
  } catch (err) {
    logger.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { buildServer }; 