// 🔄 D6 Sync API Endpoint - Manual Data Synchronization
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { logger, d6Logger } from '../utils/logger.js';
import { DataSyncService, SyncResult } from '../services/dataSyncService.js';
import { D6ApiService } from '../services/d6ApiService.js';
import { D6SyncOptions } from '../types/d6.js';

// Request validation schemas
const syncRequestSchema = z.object({
  syncType: z.enum(['full', 'incremental', 'manual']).optional().default('manual'),
  endpoints: z.array(z.enum([
    'learners',
    'learnersubjectsperterm', 
    'learnersubjectmarks',
    'learnerabsentees',
    'learnerdiscipline',
    'staffmembers',
    'parents'
  ])).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

interface SyncRequest {
  syncType?: 'full' | 'incremental' | 'manual';
  endpoints?: string[];
  fromDate?: string;
  toDate?: string;
}

interface SyncStats {
  processed: number;
  created: number;
  updated: number;
  failed: number;
  duration: number;
}

export async function syncRoute(fastify: FastifyInstance) {
  // Manual D6 sync trigger
  fastify.post<{
    Body: SyncRequest;
  }>('/d6', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      // Validate request body
      const body = syncRequestSchema.parse(request.body);
      
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

      // Only admins and teachers can trigger manual sync
      if (!['admin', 'teacher'].includes(currentUser.role)) {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to trigger sync',
          code: 'INSUFFICIENT_PERMISSIONS',
        });
      }

      logger.info('D6 sync initiated', {
        syncType: body.syncType,
        endpoints: body.endpoints,
        tenantId: tenant.id,
        initiatedBy: currentUser.id,
        fromDate: body.fromDate,
        toDate: body.toDate,
      });

      // Default to all endpoints if none specified
      const endpointsToSync = body.endpoints || [
        'learners',
        'learnersubjectsperterm',
        'learnersubjectmarks', 
        'learnerabsentees',
        'learnerdiscipline',
        'staffmembers',
        'parents'
      ];

      // TODO: Implement actual D6 sync logic
      // For now, return mock sync results
      const syncResults = await performMockSync(endpointsToSync, body.syncType || 'manual');
      
      const totalDuration = Date.now() - startTime;
      
      logger.info('D6 sync completed', {
        syncType: body.syncType,
        tenantId: tenant.id,
        totalDuration,
        results: syncResults,
      });

      return {
        success: true,
        message: 'D6 synchronization completed successfully',
        syncType: body.syncType,
        results: syncResults,
        totalDuration,
        timestamp: new Date().toISOString(),
      };

    } catch (error: any) {
      const totalDuration = Date.now() - startTime;
      
      logger.error('D6 sync failed', {
        error: error?.message || 'Unknown error',
        stack: error?.stack,
        totalDuration,
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
        error: 'D6 synchronization failed',
        code: 'SYNC_FAILED',
      });
    }
  });

  // Get sync status and logs
  fastify.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const currentUser = (request as any).user;
      const tenant = (request as any).tenant;
      
      if (!currentUser || !tenant) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
      }

      // TODO: Get actual sync status from database
      const mockStatus = {
        lastSync: {
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
          status: 'success',
          syncType: 'incremental',
          duration: 2340, // ms
          recordsProcessed: 150,
        },
        nextScheduledSync: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // 45 min from now
        recentSyncs: [
          {
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            status: 'success',
            syncType: 'incremental',
            duration: 2340,
            recordsProcessed: 150,
          },
          {
            timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
            status: 'success', 
            syncType: 'incremental',
            duration: 1890,
            recordsProcessed: 89,
          },
        ],
        dataFreshness: {
          learners: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          marks: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          attendance: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          discipline: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
        },
      };

      return {
        success: true,
        data: mockStatus,
      };

    } catch (error: any) {
      logger.error('Sync status request failed', {
        error: error?.message || 'Unknown error',
        url: request.url,
      });

      return reply.status(500).send({
        success: false,
        error: 'Failed to get sync status',
        code: 'STATUS_FETCH_FAILED',
      });
    }
  });

  // Get sync logs with pagination
  fastify.get('/logs', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const currentUser = (request as any).user;
      const tenant = (request as any).tenant;
      
      if (!currentUser || !tenant) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
      }

      // Only admins can view sync logs
      if (currentUser.role !== 'admin') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to view sync logs',
          code: 'INSUFFICIENT_PERMISSIONS',
        });
      }

      // TODO: Get actual sync logs from database with pagination
      const mockLogs = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          syncType: 'incremental',
          endpoint: 'learnersubjectmarks',
          status: 'success',
          recordsProcessed: 45,
          recordsUpdated: 12,
          recordsCreated: 33,
          recordsFailed: 0,
          duration: 890,
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
          syncType: 'incremental',
          endpoint: 'learnerabsentees',
          status: 'success',
          recordsProcessed: 23,
          recordsUpdated: 8,
          recordsCreated: 15,
          recordsFailed: 0,
          duration: 450,
        },
      ];

      return {
        success: true,
        data: {
          logs: mockLogs,
          pagination: {
            page: 1,
            limit: 50,
            total: mockLogs.length,
            totalPages: 1,
          },
        },
      };

    } catch (error: any) {
      logger.error('Sync logs request failed', {
        error: error?.message || 'Unknown error',
        url: request.url,
      });

      return reply.status(500).send({
        success: false,
        error: 'Failed to get sync logs',
        code: 'LOGS_FETCH_FAILED',
      });
    }
  });
}

// Mock sync function (to be replaced with actual D6 integration)
async function performMockSync(endpoints: string[], syncType: string): Promise<Record<string, SyncStats>> {
  const results: Record<string, SyncStats> = {};
  
  for (const endpoint of endpoints) {
    const startTime = Date.now();
    
    d6Logger.logSyncStart(syncType, endpoint);
    
    // Simulate sync work with random delays and results
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    const stats: SyncStats = {
      processed: Math.floor(Math.random() * 100) + 10,
      created: Math.floor(Math.random() * 30),
      updated: Math.floor(Math.random() * 20),
      failed: Math.floor(Math.random() * 3),
      duration: Date.now() - startTime,
    };
    
    d6Logger.logSyncComplete(syncType, endpoint, stats);
    
    results[endpoint] = stats;
  }
  
  return results;
} 