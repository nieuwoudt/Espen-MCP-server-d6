// 🔐 Authentication API Endpoints
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

// Request validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

interface LoginRequest {
  email: string;
  password: string;
}

interface RefreshTokenRequest {
  refreshToken: string;
}

export async function authRoute(fastify: FastifyInstance) {
  // Login endpoint
  fastify.post<{
    Body: LoginRequest;
  }>('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      // Validate request body
      const { email, password } = loginSchema.parse(request.body);
      
      logger.info('Login attempt', {
        email,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      // TODO: Implement actual authentication with authService
      // For now, return mock authentication response
      
      // Mock authentication logic
      if (email === 'admin@school.com' && password === 'password123') {
        const mockToken = 'mock-jwt-token-' + Date.now();
        const mockRefreshToken = 'mock-refresh-token-' + Date.now();
        
        const responseTime = Date.now() - startTime;
        
        logger.info('Login successful', {
          email,
          responseTime,
          ip: request.ip,
        });

        return {
          success: true,
          data: {
            user: {
              id: 'user-123',
              email: email,
              role: 'admin',
              tenantId: 'school-456',
              name: 'John Admin',
              schoolName: 'Demo School',
              permissions: ['read', 'write', 'admin'],
            },
            tokens: {
              accessToken: mockToken,
              refreshToken: mockRefreshToken,
              expiresIn: 3600, // 1 hour
              tokenType: 'Bearer',
            },
          },
          message: 'Login successful',
        };
      } else {
        const responseTime = Date.now() - startTime;
        
        logger.warn('Login failed - invalid credentials', {
          email,
          responseTime,
          ip: request.ip,
        });

        return reply.status(401).send({
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        });
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      logger.error('Login error', {
        error: error?.message || 'Unknown error',
        stack: error?.stack,
        responseTime,
        ip: request.ip,
      });

      // Handle validation errors
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
          code: 'VALIDATION_ERROR',
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Login failed',
        code: 'LOGIN_ERROR',
      });
    }
  });

  // Token refresh endpoint
  fastify.post<{
    Body: RefreshTokenRequest;
  }>('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken } = refreshTokenSchema.parse(request.body);
      
      logger.info('Token refresh attempt', {
        ip: request.ip,
      });

      // TODO: Implement actual token refresh logic
      // For now, return mock response
      
      if (refreshToken.startsWith('mock-refresh-token-')) {
        const newAccessToken = 'mock-jwt-token-' + Date.now();
        
        logger.info('Token refresh successful', {
          ip: request.ip,
        });

        return {
          success: true,
          data: {
            accessToken: newAccessToken,
            expiresIn: 3600,
            tokenType: 'Bearer',
          },
          message: 'Token refreshed successfully',
        };
      } else {
        logger.warn('Token refresh failed - invalid token', {
          ip: request.ip,
        });

        return reply.status(401).send({
          success: false,
          error: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN',
        });
      }

    } catch (error: any) {
      logger.error('Token refresh error', {
        error: error?.message || 'Unknown error',
        ip: request.ip,
      });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
          code: 'VALIDATION_ERROR',
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Token refresh failed',
        code: 'REFRESH_ERROR',
      });
    }
  });

  // Logout endpoint
  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get user from auth middleware
      const user = (request as any).user;
      
      if (user) {
        logger.info('User logout', {
          userId: user.id,
          tenantId: user.tenantId,
          ip: request.ip,
        });
      }

      // TODO: Implement token blacklisting if needed
      
      return {
        success: true,
        message: 'Logout successful',
      };

    } catch (error: any) {
      logger.error('Logout error', {
        error: error?.message || 'Unknown error',
        ip: request.ip,
      });

      return reply.status(500).send({
        success: false,
        error: 'Logout failed',
        code: 'LOGOUT_ERROR',
      });
    }
  });

  // Current user endpoint
  fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // This endpoint requires authentication
      const user = (request as any).user;
      const tenant = (request as any).tenant;
      
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
      }

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            name: user.name,
            schoolName: user.schoolName,
            permissions: user.permissions,
          },
          tenant: {
            id: tenant?.id,
            name: tenant?.name,
          },
        },
      };

    } catch (error: any) {
      logger.error('Get current user error', {
        error: error?.message || 'Unknown error',
        ip: request.ip,
      });

      return reply.status(500).send({
        success: false,
        error: 'Failed to get user info',
        code: 'USER_INFO_ERROR',
      });
    }
  });
} 