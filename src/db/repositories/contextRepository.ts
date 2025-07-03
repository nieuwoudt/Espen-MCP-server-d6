// 🎯 Context Repository
import { BaseRepository, PaginationOptions, QueryResult } from '../repository.js';
import { DatabaseClient } from '../client.js';
import { 
  LearnerContext, 
  TeacherContext, 
  ParentContext, 
  ContextType 
} from '../../types/context.js';
import { logger } from '../../utils/logger.js';

export interface ContextFilters {
  tenantId?: string;
  contextType?: ContextType;
  userId?: string;
  learnerId?: string;
  subjectId?: string;
  active?: boolean;
}

export interface CreateContextData {
  tenantId: string;
  contextType: ContextType;
  userId: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateContextData {
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  lastAccessedAt?: string;
}

export class ContextRepository extends BaseRepository {
  constructor(dbClient?: DatabaseClient) {
    super('contexts', dbClient);
  }

  /**
   * Find context by user and type
   */
  async findByUserAndType(
    userId: string, 
    contextType: ContextType, 
    tenantId: string
  ): Promise<LearnerContext | TeacherContext | ParentContext | null> {
    return this.executeQuery<any>(
      (client) => client
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('context_type', contextType)
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .single(),
      `findByUserAndType(${userId}, ${contextType})`,
      false
    ).catch(() => null);
  }

  /**
   * Create or update context for a user
   */
  async upsertContext(
    userId: string,
    contextType: ContextType,
    tenantId: string,
    contextData: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<LearnerContext | TeacherContext | ParentContext> {
    const existingContext = await this.findByUserAndType(userId, contextType, tenantId);

    if (existingContext) {
      // Update existing context
      const updated = await this.updateContext(existingContext.id, {
        data: { ...existingContext.data, ...contextData },
        metadata: metadata ? { ...existingContext.metadata, ...metadata } : existingContext.metadata,
        lastAccessedAt: new Date().toISOString(),
      });

      return updated!;
    } else {
      // Create new context
      return this.createContext({
        tenantId,
        contextType,
        userId,
        data: contextData,
        metadata,
      });
    }
  }

  /**
   * Create a new context
   */
  async createContext(contextData: CreateContextData): Promise<any> {
    const contextRecord = {
      ...contextData,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
    };

    const context = await this.create<any>(contextRecord);

    logger.info('Context created', {
      contextId: context.id,
      contextType: context.contextType,
      userId: context.userId,
      tenantId: context.tenantId,
    });

    return context;
  }

  /**
   * Update context
   */
  async updateContext(
    id: string, 
    contextData: UpdateContextData
  ): Promise<any | null> {
    const updateData = {
      ...contextData,
      updated_at: new Date().toISOString(),
    };

    const context = await this.update<any>(id, updateData);

    if (context) {
      logger.info('Context updated', {
        contextId: id,
        contextType: context.contextType,
        userId: context.userId,
      });
    }

    return context;
  }

  /**
   * Find contexts with filters and pagination
   */
  async findContexts(
    filters: ContextFilters = {},
    options: PaginationOptions = {}
  ): Promise<QueryResult<any>> {
    return this.findMany<any>(filters, options, '*', false);
  }

  /**
   * Get learner context with all related data
   */
  async getLearnerContext(
    learnerId: string, 
    tenantId: string
  ): Promise<LearnerContext | null> {
    return this.executeQuery<LearnerContext | null>(
      (client) => client
        .from(this.tableName)
        .select(`
          *,
          learner_marks:learner_marks!inner(
            id,
            subject_id,
            term,
            mark,
            percentage,
            grade,
            created_at
          ),
          learner_attendance:learner_attendance!inner(
            id,
            date,
            status,
            reason,
            created_at
          )
        `)
        .eq('user_id', learnerId)
        .eq('context_type', 'learner')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .single(),
      `getLearnerContext(${learnerId})`,
      false
    ).catch(() => null);
  }

  /**
   * Get teacher context with classes and subjects
   */
  async getTeacherContext(
    teacherId: string, 
    tenantId: string
  ): Promise<TeacherContext | null> {
    return this.executeQuery<TeacherContext | null>(
      (client) => client
        .from(this.tableName)
        .select(`
          *,
          teacher_subjects:teacher_subjects!inner(
            id,
            subject_id,
            class_id,
            subjects!inner(name, code),
            classes!inner(name, grade_level)
          )
        `)
        .eq('user_id', teacherId)
        .eq('context_type', 'teacher')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .single(),
      `getTeacherContext(${teacherId})`,
      false
    ).catch(() => null);
  }

  /**
   * Get parent context with children's data
   */
  async getParentContext(
    parentId: string, 
    tenantId: string
  ): Promise<ParentContext | null> {
    return this.executeQuery<ParentContext | null>(
      (client) => client
        .from(this.tableName)
        .select(`
          *,
          parent_children:parent_children!inner(
            id,
            learner_id,
            learners!inner(
              id,
              first_name,
              last_name,
              grade_level,
              class_id
            )
          )
        `)
        .eq('user_id', parentId)
        .eq('context_type', 'parent')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .single(),
      `getParentContext(${parentId})`,
      false
    ).catch(() => null);
  }

  /**
   * Update context access time
   */
  async recordAccess(id: string): Promise<void> {
    try {
      await this.executeQuery(
        (client) => client
          .from(this.tableName)
          .update({
            last_accessed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id),
        `recordAccess(${id})`,
        false
      );

      logger.debug('Context access recorded', { contextId: id });
    } catch (error: any) {
      logger.error('Failed to record context access', {
        contextId: id,
        error: error.message,
      });
      // Don't throw - context access should work even if we can't record it
    }
  }

  /**
   * Get context usage analytics for tenant
   */
  async getContextAnalytics(tenantId: string): Promise<{
    totalContexts: number;
    activeContexts: number;
    contextsByType: Record<ContextType, number>;
    recentActivity: number; // Last 7 days
  }> {
    const [totalResult, activeResult, typeResults, recentResult] = await Promise.all([
      // Total contexts
      this.executeQuery<any>(
        (client) => client
          .from(this.tableName)
          .select('count')
          .eq('tenant_id', tenantId),
        'getContextAnalytics:total',
        false
      ),
      // Active contexts
      this.executeQuery<any>(
        (client) => client
          .from(this.tableName)
          .select('count')
          .eq('tenant_id', tenantId)
          .eq('active', true),
        'getContextAnalytics:active',
        false
      ),
      // By type
      this.executeQuery<any[]>(
        (client) => client
          .from(this.tableName)
          .select('context_type')
          .eq('tenant_id', tenantId)
          .eq('active', true),
        'getContextAnalytics:byType',
        false
      ),
      // Recent activity (last 7 days)
      this.executeQuery<any>(
        (client) => client
          .from(this.tableName)
          .select('count')
          .eq('tenant_id', tenantId)
          .gte('last_accessed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        'getContextAnalytics:recent',
        false
      ),
    ]);

    // Count by type
    const contextsByType: Record<ContextType, number> = {
      learner: 0,
      teacher: 0,
      parent: 0,
    };

    typeResults.forEach((result: any) => {
      if (result.context_type in contextsByType) {
        contextsByType[result.context_type as ContextType]++;
      }
    });

    return {
      totalContexts: totalResult?.[0]?.count || 0,
      activeContexts: activeResult?.[0]?.count || 0,
      contextsByType,
      recentActivity: recentResult?.[0]?.count || 0,
    };
  }

  /**
   * Deactivate context
   */
  async deactivateContext(id: string): Promise<boolean> {
    const success = await this.updateContext(id, { 
      lastAccessedAt: new Date().toISOString() 
    });
    
    if (success) {
      await this.executeQuery(
        (client) => client
          .from(this.tableName)
          .update({ active: false })
          .eq('id', id),
        `deactivateContext(${id})`,
        false
      );

      logger.info('Context deactivated', { contextId: id });
    }

    return !!success;
  }

  /**
   * Clean up old inactive contexts
   */
  async cleanupOldContexts(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

    try {
      const { count } = await this.executeQuery<any>(
        (client) => client
          .from(this.tableName)
          .delete()
          .eq('active', false)
          .lt('updated_at', cutoffDate),
        `cleanupOldContexts(${daysOld} days)`,
        true // Use admin client
      );

      logger.info('Old contexts cleaned up', {
        deletedCount: count,
        cutoffDate,
      });

      return count || 0;
    } catch (error: any) {
      logger.error('Failed to cleanup old contexts', {
        error: error.message,
        cutoffDate,
      });
      return 0;
    }
  }
} 