// 🔐 JWT Authentication Middleware
import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger.js';
import { JWTPayload, AuthenticatedUser, AUTH_ERRORS } from '../types/auth.js';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/health',
  '/auth/login',
  '/docs',
];

// Check if route is public
function isPublicRoute(url: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route === '/') return url === '/';
    return url.startsWith(route);
  });
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Skip authentication for public routes
  if (isPublicRoute(request.url)) {
    return;
  }

  try {
    // Extract token from Authorization header
    const authorization = request.headers.authorization;
    
    if (!authorization) {
      logger.warn('Missing authorization header', {
        url: request.url,
        method: request.method,
        ip: request.ip,
      });
      
      const error = AUTH_ERRORS.MISSING_AUTH_HEADER;
      return reply.status(error.statusCode).send({
        success: false,
        error: error.message,
        code: error.code,
      });
    }

    if (!authorization.startsWith('Bearer ')) {
      logger.warn('Invalid authorization format', {
        url: request.url,
        method: request.method,
        ip: request.ip,
      });
      
      const error = AUTH_ERRORS.INVALID_AUTH_FORMAT;
      return reply.status(error.statusCode).send({
        success: false,
        error: error.message,
        code: error.code,
      });
    }

    const token = authorization.slice(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = await request.jwtVerify() as JWTPayload;
    
    // Add user info to request context
    const user: AuthenticatedUser = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role as 'learner' | 'teacher' | 'parent' | 'admin',
      tenantId: decoded.tenant_id,
      permissions: decoded.permissions || [],
      name: decoded.name,
      schoolName: decoded.school_name,
    };

    // Attach to request object
    (request as any).user = user;

    logger.debug('User authenticated successfully', {
      userId: user.id,
      role: user.role,
      tenantId: user.tenantId,
      url: request.url,
      method: request.method,
    });

  } catch (error: any) {
    logger.warn('JWT verification failed', {
      error: error?.message || 'Unknown error',
      url: request.url,
      method: request.method,
      ip: request.ip,
    });

    const authError = AUTH_ERRORS.JWT_VERIFICATION_FAILED;
    const statusCode = error?.code === 'FAST_JWT_MALFORMED' ? 400 : authError.statusCode;

    return reply.status(statusCode).send({
      success: false,
      error: authError.message,
      code: error?.code || authError.code,
    });
  }
}

// Authentication middleware exports
export type { AuthenticatedUser, TenantContext } from '../types/auth.js'; 