// 🚀 Espen D6 MCP Server - Main Entry Point
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';

import { logger } from './utils/logger.js';
import { healthRoute } from './api/health.js';
import { contextRoute } from './api/context.js';
import { syncRoute } from './api/d6-sync.js';
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

  // JWT authentication
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    timeWindow: Number(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
  });

  // 🔧 Add middleware hooks
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', tenantScopeMiddleware);

  // 📍 Register routes
  await fastify.register(healthRoute, { prefix: '/health' });
  await fastify.register(contextRoute, { prefix: '/context' });
  await fastify.register(syncRoute, { prefix: '/sync' });

  // 🎯 Root route
  fastify.get('/', async () => {
    return {
      message: '🧠 Espen D6 MCP Server',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        context: '/context/:userId',
        sync: '/sync/d6',
        docs: '/docs',
      },
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
    
    logger.info('🚀 Espen D6 MCP Server started successfully', {
      port: PORT,
      host: HOST,
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
    });
    
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