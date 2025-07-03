// 🎯 Context API Endpoint - Main MCP Context Provider
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { ContextRequest, ContextResponse, UserRole } from '../types/context.js';

// Request validation schemas
const contextParamsSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

const contextQuerySchema = z.object({
  role: z.enum(['learner', 'teacher', 'parent', 'admin']).optional(),
  forceRefresh: z.boolean().optional().default(false),
  includeCache: z.boolean().optional().default(true),
});

interface ContextParams {
  userId: string;
}

interface ContextQuery {
  role?: UserRole;
  forceRefresh?: boolean;
  includeCache?: boolean;
}

export async function contextRoute(fastify: FastifyInstance) {
  // Main context endpoint
  fastify.get<{
    Params: ContextParams;
    Querystring: ContextQuery;
  }>('/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      // Validate request parameters
      const params = contextParamsSchema.parse(request.params);
      const query = contextQuerySchema.parse(request.query);
      
      // Get user context from request (set by auth middleware)
      const currentUser = (request as any).user;
      const tenant = (request as any).tenant;
      
      if (!currentUser || !tenant) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
      }

      // Authorization check - users can only access their own context
      // or admins/teachers can access learner contexts in their tenant
      const isAuthorized = 
        currentUser.id === params.userId ||
        (currentUser.role === 'admin') ||
        (currentUser.role === 'teacher' && query.role === 'learner');

      if (!isAuthorized) {
        logger.warn('Unauthorized context access attempt', {
          requestedUserId: params.userId,
          currentUserId: currentUser.id,
          currentUserRole: currentUser.role,
          tenantId: tenant.id,
        });
        
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to access this context',
          code: 'INSUFFICIENT_PERMISSIONS',
        });
      }

      // Determine the role for context generation
      const contextRole = query.role || currentUser.role;
      
      logger.info('Context request initiated', {
        userId: params.userId,
        role: contextRole,
        tenantId: tenant.id,
        forceRefresh: query.forceRefresh,
        requestedBy: currentUser.id,
      });

      // Build context request
      const contextRequest: ContextRequest = {
        userId: params.userId,
        role: contextRole,
        tenantId: tenant.id,
        includeCache: query.includeCache,
        forceRefresh: query.forceRefresh,
      };

      // TODO: Implement actual context building service
      // For now, return a mock response
      const mockContext = await buildMockContext(contextRequest);
      
      const responseTime = Date.now() - startTime;
      
      logger.info('Context request completed', {
        userId: params.userId,
        role: contextRole,
        tenantId: tenant.id,
        responseTime,
        cached: !query.forceRefresh,
      });

      const response: ContextResponse = {
        success: true,
        data: mockContext,
        cached: !query.forceRefresh,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        version: 1,
      };

      return response;

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      logger.error('Context request failed', {
        error: error?.message || 'Unknown error',
        stack: error?.stack,
        responseTime,
        url: request.url,
      });

      // Handle validation errors
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid request parameters',
          details: error.errors,
          code: 'VALIDATION_ERROR',
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Failed to generate context',
        code: 'CONTEXT_GENERATION_FAILED',
      });
    }
  });

  // Context metadata endpoint
  fastify.get<{
    Params: ContextParams;
  }>('/:userId/metadata', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = contextParamsSchema.parse(request.params);
      const currentUser = (request as any).user;
      const tenant = (request as any).tenant;

      if (!currentUser || !tenant) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
      }

      // TODO: Get actual metadata from cache/database
      const metadata = {
        userId: params.userId,
        tenantId: tenant.id,
        lastUpdated: new Date().toISOString(),
        cacheKey: `context:${tenant.id}:${params.userId}`,
        version: 1,
        dataFreshness: {
          marks: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
          attendance: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
          discipline: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        },
      };

      return {
        success: true,
        data: metadata,
      };

    } catch (error: any) {
      logger.error('Context metadata request failed', {
        error: error?.message || 'Unknown error',
        url: request.url,
      });

      return reply.status(500).send({
        success: false,
        error: 'Failed to get context metadata',
        code: 'METADATA_FETCH_FAILED',
      });
    }
  });

  // Clear context cache endpoint
  fastify.delete<{
    Params: ContextParams;
  }>('/:userId/cache', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = contextParamsSchema.parse(request.params);
      const currentUser = (request as any).user;
      const tenant = (request as any).tenant;

      if (!currentUser || !tenant) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
      }

      // Only allow cache clearing for own context or by admins
      const isAuthorized = 
        currentUser.id === params.userId ||
        currentUser.role === 'admin';

      if (!isAuthorized) {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to clear cache',
          code: 'INSUFFICIENT_PERMISSIONS',
        });
      }

      // TODO: Implement actual cache clearing
      logger.info('Context cache cleared', {
        userId: params.userId,
        tenantId: tenant.id,
        clearedBy: currentUser.id,
      });

      return {
        success: true,
        message: 'Context cache cleared successfully',
        timestamp: new Date().toISOString(),
      };

    } catch (error: any) {
      logger.error('Cache clear failed', {
        error: error?.message || 'Unknown error',
        url: request.url,
      });

      return reply.status(500).send({
        success: false,
        error: 'Failed to clear context cache',
        code: 'CACHE_CLEAR_FAILED',
      });
    }
  });
}

// Mock context builder (to be replaced with actual implementation)
async function buildMockContext(request: ContextRequest) {
  // This is a simplified mock - actual implementation will query database
  // and build comprehensive context based on user role
  
  const baseContext = {
    id: request.userId,
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    metadata: {
      lastUpdated: new Date().toISOString(),
      tenantId: request.tenantId,
      cacheKey: `context:${request.tenantId}:${request.userId}`,
      version: 1,
    },
  };

  switch (request.role) {
    case 'learner':
      return {
        ...baseContext,
        grade: 10,
        class: '10A',
        languageOfInstruction: 'English',
        enrollmentDate: '2024-01-15',
        academic: {
          overallAverage: 78.5,
          termAverage: 82.1,
          subjectsCount: 7,
          subjects: [],
          recentMarks: [],
          trends: {
            direction: 'improving' as const,
            percentage: 5.2,
            period: 'last 30 days',
            subjectsTrending: {
              improving: ['Mathematics', 'Science'],
              declining: ['History'],
              stable: ['English', 'Life Orientation'],
            },
          },
        },
        attendance: {
          percentage: 92.5,
          totalDays: 180,
          presentDays: 167,
          absentDays: 13,
          lateDays: 5,
          excusedDays: 3,
          recentAttendance: [],
          patterns: {
            weekdayAttendance: 95.0,
            weekendEvents: 0,
            monthlyTrend: [],
            commonAbsenceReasons: [],
          },
        },
        discipline: {
          incidentsCount: 1,
          recentIncidents: [],
          severityBreakdown: {
            minor: 1,
            moderate: 0,
            major: 0,
            severe: 0,
          },
          trends: {
            direction: 'stable' as const,
            period: 'last 90 days',
            incidentTypes: [],
          },
        },
        family: {
          parents: [],
          primaryContact: {
            id: 'parent-1',
            firstName: 'Jane',
            lastName: 'Doe',
            fullName: 'Jane Doe',
            relationshipType: 'Mother',
            isPrimaryContact: true,
          },
          emergencyContacts: [],
        },
        insights: {
          strengths: ['Mathematics', 'Problem-solving'],
          challengeAreas: ['Writing skills', 'Time management'],
          recommendations: ['Additional writing practice', 'Study schedule optimization'],
          riskFactors: [],
          supportNeeds: ['Writing support'],
        },
      };

    case 'teacher':
      return {
        ...baseContext,
        staffNumber: 'T001',
        department: 'Mathematics',
        position: 'Senior Teacher',
        subjects: [],
        classes: [],
      };

    case 'parent':
      return {
        ...baseContext,
        relationshipType: 'Mother',
        children: [],
        familyInsights: {
          overallPerformance: 78.5,
          attendanceRate: 92.5,
          disciplineStatus: 'good' as const,
          recentUpdates: [],
          upcomingEvents: [],
        },
      };

    default:
      return baseContext;
  }
} 