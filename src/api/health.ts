// 🏥 Health Check API Endpoint
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger.js';

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: 'connected' | 'disconnected' | 'error';
    cache: 'connected' | 'disconnected' | 'error';
    d6_api: 'connected' | 'disconnected' | 'error';
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  stats?: {
    activeConnections: number;
    totalRequests: number;
    responseTime: number;
  };
}

export async function healthRoute(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply): Promise<HealthResponse> => {
    const startTime = Date.now();
    
    try {
      // Check system memory
      const memoryUsage = process.memoryUsage();
      const memory = {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      };

      // Basic service checks (simplified for now)
      const services = {
        database: 'connected' as 'connected' | 'disconnected' | 'error', // TODO: Implement actual Supabase check
        cache: 'connected' as 'connected' | 'disconnected' | 'error',    // TODO: Implement actual Redis check
        d6_api: 'connected' as 'connected' | 'disconnected' | 'error',   // TODO: Implement actual D6 API check
      };

      // Determine overall status
      const hasErrors = Object.values(services).some(status => status === 'error');
      const hasDisconnections = Object.values(services).some(status => status === 'disconnected');
      
      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      if (hasErrors) {
        status = 'unhealthy';
      } else if (hasDisconnections) {
        status = 'degraded';
      }

      const response: HealthResponse = {
        status,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services,
        memory,
      };

      const responseTime = Date.now() - startTime;
      
      logger.info('Health check completed', {
        status,
        responseTime,
        memory: memory.percentage,
      });

      // Set appropriate status code
      const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 206 : 503;
      reply.status(statusCode);
      
      return response;

    } catch (error: any) {
      logger.error('Health check failed', {
        error: error?.message || 'Unknown error',
        stack: error?.stack,
      });

      const errorResponse: HealthResponse = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: 'error',
          cache: 'error',
          d6_api: 'error',
        },
        memory: {
          used: 0,
          total: 0,
          percentage: 0,
        },
      };

      reply.status(503);
      return errorResponse;
    }
  });

  // Detailed health check with more diagnostics
  fastify.get('/detailed', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      // Get basic health info
      const memoryUsage = process.memoryUsage();
      const memory = {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      };

      const services = {
        database: 'connected' as 'connected' | 'disconnected' | 'error',
        cache: 'connected' as 'connected' | 'disconnected' | 'error',
        d6_api: 'connected' as 'connected' | 'disconnected' | 'error',
      };

      const hasErrors = Object.values(services).some(status => status === 'error');
      const hasDisconnections = Object.values(services).some(status => status === 'disconnected');
      
      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      if (hasErrors) {
        status = 'unhealthy';
      } else if (hasDisconnections) {
        status = 'degraded';
      }
      
      // Add additional stats
      const stats = {
        activeConnections: 0, // TODO: Implement connection counting
        totalRequests: 0,     // TODO: Implement request counting  
        responseTime: Date.now() - startTime,
      };

      const response: HealthResponse = {
        status,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services,
        memory,
        stats,
      };

      return response;

    } catch (error: any) {
      logger.error('Detailed health check failed', {
        error: error?.message || 'Unknown error',
      });

      reply.status(503);
      return {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      };
    }
  });

  // Readiness probe (for Kubernetes)
  fastify.get('/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Check if application is ready to serve requests
      // This could include database connections, required services, etc.
      
      reply.status(200);
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
      
    } catch (error: any) {
      logger.error('Readiness check failed', {
        error: error?.message || 'Unknown error',
      });
      
      reply.status(503);
      return {
        status: 'not ready',
        error: 'Application not ready',
        timestamp: new Date().toISOString(),
      };
    }
  });

  // Liveness probe (for Kubernetes)
  fastify.get('/live', async (request: FastifyRequest, reply: FastifyReply) => {
    // Simple liveness check - if this endpoint responds, the app is alive
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  });
} 