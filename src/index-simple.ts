// 🚀 Espen D6 MCP Server - Simple Working Version
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  const fastify = Fastify({
    logger: {
      level: 'info',
    },
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  // Root route
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
      },
    };
  });

  // Health check
  fastify.get('/health', async () => {
    const memoryUsage = process.memoryUsage();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      },
    };
  });

  // Mock context endpoint
  fastify.get('/context/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    
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
        metadata: {
          lastUpdated: new Date().toISOString(),
          version: 1,
        },
      },
      cached: false,
      generatedAt: new Date().toISOString(),
    };
  });

  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 Espen D6 MCP Server started on http://${HOST}:${PORT}`);
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start(); 