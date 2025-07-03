// 🔄 Data Sync Service
import { logger } from '../utils/logger.js';
import { D6ApiService } from './d6ApiService.js';
import { CacheService } from './cacheService.js';
import { UserRepository } from '../db/repositories/userRepository.js';
import { ContextRepository } from '../db/repositories/contextRepository.js';
import { DatabaseClient } from '../db/client.js';
import { 
  D6Learner, 
  D6Staff, 
  D6Mark, 
  D6Attendance,
  D6Subject,
  D6Class,
  D6SyncOptions 
} from '../types/d6.js';
import { 
  LearnerContext, 
  TeacherContext, 
  ParentContext,
  ContextType 
} from '../types/context.js';

export interface SyncResult {
  success: boolean;
  syncedAt: string;
  stats: {
    learners: number;
    staff: number;
    marks: number;
    attendance: number;
    contexts: number;
  };
  errors: string[];
  duration: number;
}

export interface SyncProgress {
  stage: string;
  progress: number;
  total: number;
  message: string;
  errors: string[];
}

export class DataSyncService {
  private static instance: DataSyncService;
  private d6Api?: D6ApiService;
  private cache?: CacheService;
  private dbClient?: DatabaseClient;
  private userRepo?: UserRepository;
  private contextRepo?: ContextRepository;
  private syncInProgress = false;
  private lastSyncResult?: SyncResult;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): DataSyncService {
    if (!DataSyncService.instance) {
      DataSyncService.instance = new DataSyncService();
    }
    return DataSyncService.instance;
  }

  /**
   * Initialize sync service with dependencies
   */
  public initialize(
    d6Api?: D6ApiService,
    cache?: CacheService,
    dbClient?: DatabaseClient
  ): void {
    this.d6Api = d6Api;
    this.cache = cache;
    this.dbClient = dbClient;

    if (dbClient) {
      this.userRepo = new UserRepository(dbClient);
      this.contextRepo = new ContextRepository(dbClient);
    }

    logger.info('Data sync service initialized', {
      d6Api: !!d6Api,
      cache: !!cache,
      database: !!dbClient,
    });
  }

  /**
   * Check if sync is currently in progress
   */
  public isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  /**
   * Get last sync result
   */
  public getLastSyncResult(): SyncResult | undefined {
    return this.lastSyncResult;
  }

  /**
   * Perform full data synchronization
   */
  public async performFullSync(
    tenantId: string,
    options: D6SyncOptions = {}
  ): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    const startTime = Date.now();
    this.syncInProgress = true;

    const stats = {
      learners: 0,
      staff: 0,
      marks: 0,
      attendance: 0,
      contexts: 0,
    };
    const errors: string[] = [];

    try {
      logger.info('Starting full data sync', {
        tenantId,
        options,
      });

      // Check D6 API availability
      if (!this.d6Api) {
        throw new Error('D6 API service not available');
      }

      const apiHealth = await this.d6Api.getHealthInfo();
      if (!apiHealth.connected) {
        throw new Error(`D6 API not accessible: ${apiHealth.lastError}`);
      }

      // Sync learners
      try {
        const learnerResult = await this.syncLearners(tenantId, options);
        stats.learners = learnerResult.count;
        logger.info('Learners synced', { count: learnerResult.count });
      } catch (error: any) {
        const errorMsg = `Learner sync failed: ${error.message}`;
        errors.push(errorMsg);
        logger.error('Learner sync error', { error: error.message });
      }

      // Sync staff
      try {
        const staffResult = await this.syncStaff(tenantId);
        stats.staff = staffResult.count;
        logger.info('Staff synced', { count: staffResult.count });
      } catch (error: any) {
        const errorMsg = `Staff sync failed: ${error.message}`;
        errors.push(errorMsg);
        logger.error('Staff sync error', { error: error.message });
      }

      // Sync marks (only if we have learners)
      if (stats.learners > 0) {
        try {
          const marksResult = await this.syncMarks(tenantId, options);
          stats.marks = marksResult.count;
          logger.info('Marks synced', { count: marksResult.count });
        } catch (error: any) {
          const errorMsg = `Marks sync failed: ${error.message}`;
          errors.push(errorMsg);
          logger.error('Marks sync error', { error: error.message });
        }
      }

      // Sync attendance (only if we have learners)
      if (stats.learners > 0) {
        try {
          const attendanceResult = await this.syncAttendance(tenantId, options);
          stats.attendance = attendanceResult.count;
          logger.info('Attendance synced', { count: attendanceResult.count });
        } catch (error: any) {
          const errorMsg = `Attendance sync failed: ${error.message}`;
          errors.push(errorMsg);
          logger.error('Attendance sync error', { error: error.message });
        }
      }

      // Build contexts
      try {
        const contextResult = await this.buildContexts(tenantId);
        stats.contexts = contextResult.count;
        logger.info('Contexts built', { count: contextResult.count });
      } catch (error: any) {
        const errorMsg = `Context building failed: ${error.message}`;
        errors.push(errorMsg);
        logger.error('Context building error', { error: error.message });
      }

      const duration = Date.now() - startTime;
      const result: SyncResult = {
        success: errors.length === 0,
        syncedAt: new Date().toISOString(),
        stats,
        errors,
        duration,
      };

      this.lastSyncResult = result;

      logger.info('Full sync completed', {
        tenantId,
        success: result.success,
        duration,
        stats,
        errorCount: errors.length,
      });

      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      errors.push(`Sync failed: ${error.message}`);

      const result: SyncResult = {
        success: false,
        syncedAt: new Date().toISOString(),
        stats,
        errors,
        duration,
      };

      this.lastSyncResult = result;

      logger.error('Full sync failed', {
        tenantId,
        error: error.message,
        duration,
      });

      return result;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync learner data from D6 API
   */
  private async syncLearners(
    tenantId: string,
    options: D6SyncOptions
  ): Promise<{ count: number; data: D6Learner[] }> {
    if (!this.d6Api) {
      throw new Error('D6 API not available');
    }

    const response = await this.d6Api.getLearners(options);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch learners');
    }

    const learners = response.data;

    // Cache learner data
    if (this.cache) {
      for (const learner of learners) {
        const cacheKey = CacheService.keys.learnerData(learner.LearnerID, tenantId);
        await this.cache.set(cacheKey, learner, 1800); // 30 minutes
      }
      logger.debug('Learner data cached', { count: learners.length });
    }

    // TODO: Store in database when database is available
    if (this.dbClient && this.userRepo) {
      // Convert D6 learners to user records and store
      // This would involve creating users with role='student'
      logger.debug('Learner database storage not yet implemented');
    }

    return { count: learners.length, data: learners };
  }

  /**
   * Sync staff data from D6 API
   */
  private async syncStaff(tenantId: string): Promise<{ count: number; data: D6Staff[] }> {
    if (!this.d6Api) {
      throw new Error('D6 API not available');
    }

    const response = await this.d6Api.getStaff();
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch staff');
    }

    const staff = response.data;

    // Cache staff data
    if (this.cache) {
      for (const member of staff) {
        const cacheKey = CacheService.keys.teacherData(member.StaffID, tenantId);
        await this.cache.set(cacheKey, member, 3600); // 1 hour
      }
      logger.debug('Staff data cached', { count: staff.length });
    }

    return { count: staff.length, data: staff };
  }

  /**
   * Sync marks data from D6 API
   */
  private async syncMarks(
    tenantId: string,
    options: D6SyncOptions
  ): Promise<{ count: number; data: D6Mark[] }> {
    if (!this.d6Api) {
      throw new Error('D6 API not available');
    }

    // For now, get recent marks (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];

    // This would typically iterate through learners and get their marks
    // For now, we'll return a mock count
    const mockMarks: D6Mark[] = [];
    
    // TODO: Implement actual marks sync
    logger.debug('Marks sync not fully implemented - returning mock data');

    return { count: mockMarks.length, data: mockMarks };
  }

  /**
   * Sync attendance data from D6 API
   */
  private async syncAttendance(
    tenantId: string,
    options: D6SyncOptions
  ): Promise<{ count: number; data: D6Attendance[] }> {
    if (!this.d6Api) {
      throw new Error('D6 API not available');
    }

    // For now, get recent attendance (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];

    // This would typically iterate through learners and get their attendance
    // For now, we'll return a mock count
    const mockAttendance: D6Attendance[] = [];
    
    // TODO: Implement actual attendance sync
    logger.debug('Attendance sync not fully implemented - returning mock data');

    return { count: mockAttendance.length, data: mockAttendance };
  }

  /**
   * Build MCP contexts from synced data
   */
  private async buildContexts(tenantId: string): Promise<{ count: number }> {
    let contextCount = 0;

    if (!this.cache) {
      throw new Error('Cache service required for context building');
    }

    try {
      // Build learner contexts
      // This would typically iterate through cached learner data
      // and build rich context objects for each learner
      
      // For now, create a sample context
      const sampleLearnerContext: LearnerContext = {
        id: 'sample-learner-123',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        grade: 10,
        class: '10A',
        languageOfInstruction: 'English',
        enrollmentDate: '2024-01-15',
        academic: {
          overallAverage: 75.5,
          termAverage: 78.2,
          subjectsCount: 8,
          subjects: [],
          recentMarks: [],
          trends: {
            direction: 'improving',
            percentage: 5.2,
            period: 'last 30 days',
            subjectsTrending: {
              improving: ['Mathematics', 'Science'],
              declining: [],
              stable: ['English', 'History'],
            },
          },
        },
        attendance: {
          percentage: 95.2,
          totalDays: 120,
          presentDays: 114,
          absentDays: 6,
          lateDays: 2,
          excusedDays: 3,
          recentAttendance: [],
          patterns: {
            weekdayAttendance: 95.5,
            weekendEvents: 0,
            monthlyTrend: [],
            commonAbsenceReasons: [],
          },
        },
        discipline: {
          incidentsCount: 0,
          recentIncidents: [],
          severityBreakdown: {
            minor: 0,
            moderate: 0,
            major: 0,
            severe: 0,
          },
          trends: {
            direction: 'stable',
            period: 'last 90 days',
            incidentTypes: [],
          },
        },
        family: {
          parents: [],
          primaryContact: {
            id: 'parent-123',
            firstName: 'Jane',
            lastName: 'Doe',
            fullName: 'Jane Doe',
            relationshipType: 'Mother',
            isPrimaryContact: true,
          },
          emergencyContacts: [],
        },
        insights: {
          strengths: ['Strong in mathematics', 'Excellent attendance'],
          challengeAreas: ['Writing skills could improve'],
          recommendations: ['Consider advanced math classes'],
          riskFactors: [],
          supportNeeds: [],
        },
        metadata: {
          lastUpdated: new Date().toISOString(),
          tenantId,
          cacheKey: CacheService.keys.learnerData('sample-learner-123', tenantId),
          version: 1,
        },
      };

      // Cache the sample context
      const contextKey = CacheService.keys.userContext('sample-learner-123', tenantId);
      await this.cache.set(contextKey, sampleLearnerContext, 3600);
      contextCount++;

      // TODO: Build teacher and parent contexts similarly

      logger.info('Sample contexts built', { count: contextCount });

    } catch (error: any) {
      logger.error('Context building error', {
        error: error.message,
      });
      throw error;
    }

    return { count: contextCount };
  }

  /**
   * Get sync status and statistics
   */
  public getSyncStatus(): {
    inProgress: boolean;
    lastSync?: string;
    nextSync?: string;
    stats?: SyncResult['stats'];
    health: {
      d6Api: boolean;
      cache: boolean;
      database: boolean;
    };
  } {
    return {
      inProgress: this.syncInProgress,
      lastSync: this.lastSyncResult?.syncedAt,
      nextSync: undefined, // TODO: Implement scheduled sync
      stats: this.lastSyncResult?.stats,
      health: {
        d6Api: !!this.d6Api,
        cache: !!this.cache,
        database: !!this.dbClient,
      },
    };
  }

  /**
   * Clear all cached data for a tenant
   */
  public async clearTenantCache(tenantId: string): Promise<void> {
    if (!this.cache) {
      return;
    }

    try {
      const patterns = [
        `espen:*:${tenantId}:*`,
        `espen:context:${tenantId}:*`,
        `espen:learner:${tenantId}:*`,
        `espen:teacher:${tenantId}:*`,
        `espen:d6:${tenantId}:*`,
      ];

      let totalDeleted = 0;
      for (const pattern of patterns) {
        const deleted = await this.cache.deletePattern(pattern);
        totalDeleted += deleted;
      }

      logger.info('Tenant cache cleared', {
        tenantId,
        deletedKeys: totalDeleted,
      });
    } catch (error: any) {
      logger.error('Failed to clear tenant cache', {
        tenantId,
        error: error.message,
      });
      throw error;
    }
  }
} 