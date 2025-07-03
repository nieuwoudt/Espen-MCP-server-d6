// 🏫 Tenant Scoping Middleware
import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger.js';
import { AuthenticatedUser, TenantContext, AUTH_ERRORS } from '../types/auth.js';

// Routes that don't require tenant scoping
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

export async function tenantScopeMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Skip tenant scoping for public routes
  if (isPublicRoute(request.url)) {
    return;
  }

  try {
    // Check if user is authenticated (should be set by auth middleware)
    const user = (request as any).user as AuthenticatedUser | undefined;
    
    if (!user) {
      // If we reach here, it means auth middleware didn't run or failed
      const error = AUTH_ERRORS.MISSING_AUTH_HEADER;
      return reply.status(error.statusCode).send({
        success: false,
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
      });
    }

    if (!user.tenantId) {
      logger.error('User missing tenant ID', {
        userId: user.id,
        email: user.email,
        role: user.role,
      });
      
      const error = AUTH_ERRORS.MISSING_TENANT_ID;
      return reply.status(error.statusCode).send({
        success: false,
        error: error.message,
        code: error.code,
      });
    }

    // Create tenant context
    const tenant: TenantContext = {
      id: user.tenantId,
      name: user.schoolName,
      // Additional tenant info could be loaded here if needed
    };

    // Add tenant context to request
    (request as any).tenant = tenant;

    logger.debug('Tenant scope applied', {
      userId: user.id,
      tenantId: user.tenantId,
      url: request.url,
      method: request.method,
    });

  } catch (error: any) {
    logger.error('Tenant scoping failed', {
      error: error?.message || 'Unknown error',
      url: request.url,
      method: request.method,
    });

    return reply.status(500).send({
      success: false,
      error: 'Failed to apply tenant scoping',
      code: 'TENANT_SCOPING_FAILED',
    });
  }
} 