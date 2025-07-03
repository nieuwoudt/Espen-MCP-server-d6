// 👤 User Repository
import { BaseRepository, PaginationOptions, QueryResult } from '../repository.js';
import { DatabaseClient } from '../client.js';
import { User, UserRole, UserStatus } from '../../types/auth.js';
import { logger } from '../../utils/logger.js';

export interface UserFilters {
  tenantId?: string;
  role?: UserRole;
  status?: UserStatus;
  email?: string;
  search?: string; // Search across name and email
}

export interface CreateUserData {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
  metadata?: Record<string, any>;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
  metadata?: Record<string, any>;
  lastLoginAt?: string;
  profileImageUrl?: string;
}

export class UserRepository extends BaseRepository {
  constructor(dbClient?: DatabaseClient) {
    super('users', dbClient);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.executeQuery<User | null>(
      (client) => client
        .from(this.tableName)
        .select('*')
        .eq('email', email.toLowerCase())
        .single(),
      `findByEmail(${email})`,
      false
    ).catch(() => null); // Return null if not found
  }

  /**
   * Find user by ID with tenant check
   */
  async findById(id: string, tenantId?: string): Promise<User | null> {
    const query = this.db
      .from(this.tableName)
      .select('*')
      .eq('id', id);

    if (tenantId) {
      query.eq('tenant_id', tenantId);
    }

    return this.executeQuery<User | null>(
      () => query.single(),
      `findById(${id})`,
      false
    ).catch(() => null);
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserData): Promise<User> {
    const userRecord = {
      ...userData,
      email: userData.email.toLowerCase(),
      status: 'active' as UserStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const user = await this.create<User>(userRecord);

    logger.info('User created', {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    return user;
  }

  /**
   * Update user
   */
  async updateUser(id: string, userData: UpdateUserData, tenantId?: string): Promise<User | null> {
    // Build update data
    const updateData = {
      ...userData,
      updated_at: new Date().toISOString(),
    };

    let user: User | null;

    if (tenantId) {
      // Tenant-scoped update
      user = await this.executeQuery<User | null>(
        (client) => client
          .from(this.tableName)
          .update(updateData)
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .select('*')
          .single(),
        `updateUser(${id})`,
        false
      ).catch(() => null);
    } else {
      // Admin update (no tenant scope)
      user = await this.update<User>(id, updateData, '*', true);
    }

    if (user) {
      logger.info('User updated', {
        userId: id,
        tenantId: user.tenantId,
        updatedFields: Object.keys(userData),
      });
    }

    return user;
  }

  /**
   * Find users with filters and pagination
   */
  async findUsers(
    filters: UserFilters = {},
    options: PaginationOptions = {}
  ): Promise<QueryResult<User>> {
    const { search, ...otherFilters } = filters;

    return this.executeQuery<QueryResult<User>>(
      (client) => {
        let query = client
          .from(this.tableName)
          .select('*', { count: 'exact' });

        // Apply filters
        Object.entries(otherFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'tenantId') {
              query = query.eq('tenant_id', value);
            } else {
              query = query.eq(key, value);
            }
          }
        });

        // Apply search
        if (search) {
          query = query.or(
            `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
          );
        }

        // Apply pagination
        const { page = 1, limit = 50, orderBy = 'created_at', orderDirection = 'desc' } = options;
        const offset = (page - 1) * limit;

        query = query
          .order(orderBy, { ascending: orderDirection === 'asc' })
          .range(offset, offset + limit - 1);

        return query;
      },
      'findUsers',
      false
    ).then(({ data, count }) => ({
      data: data || [],
      count: count || 0,
      hasMore: count ? ((options.page || 1) - 1) * (options.limit || 50) + (options.limit || 50) < count : false,
      page: options.page || 1,
    }));
  }

  /**
   * Update user status
   */
  async updateUserStatus(id: string, status: UserStatus, tenantId?: string): Promise<User | null> {
    return this.updateUser(id, { status }, tenantId);
  }

  /**
   * Record user login
   */
  async recordLogin(id: string): Promise<void> {
    try {
      await this.executeQuery(
        (client) => client
          .from(this.tableName)
          .update({
            last_login_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id),
        `recordLogin(${id})`,
        false
      );

      logger.info('User login recorded', { userId: id });
    } catch (error: any) {
      logger.error('Failed to record user login', {
        userId: id,
        error: error.message,
      });
      // Don't throw - login should succeed even if we can't record it
    }
  }

  /**
   * Get users by role within tenant
   */
  async getUsersByRole(role: UserRole, tenantId: string, options: PaginationOptions = {}): Promise<QueryResult<User>> {
    return this.findUsers({ role, tenantId }, options);
  }

  /**
   * Check if email exists in tenant
   */
  async emailExistsInTenant(email: string, tenantId: string): Promise<boolean> {
    return this.executeQuery<boolean>(
      (client) => client
        .from(this.tableName)
        .select('id')
        .eq('email', email.toLowerCase())
        .eq('tenant_id', tenantId)
        .single(),
      `emailExistsInTenant(${email})`,
      false
    ).then(() => true).catch(() => false);
  }

  /**
   * Get user counts by role for tenant
   */
  async getUserCountsByRole(tenantId: string): Promise<Record<UserRole, number>> {
    const counts = await this.executeQuery<any[]>(
      (client) => client
        .from(this.tableName)
        .select('role')
        .eq('tenant_id', tenantId)
        .eq('status', 'active'),
      `getUserCountsByRole(${tenantId})`,
      false
    );

    // Initialize counts
    const result: Record<UserRole, number> = {
      admin: 0,
      teacher: 0,
      parent: 0,
      student: 0,
    };

    // Count by role
    counts.forEach((user: any) => {
      if (user.role in result) {
        result[user.role as UserRole]++;
      }
    });

    return result;
  }

  /**
   * Delete user (soft delete by setting status to inactive)
   */
  async deleteUser(id: string, tenantId?: string): Promise<boolean> {
    const success = await this.updateUser(id, { status: 'inactive' }, tenantId);
    
    if (success) {
      logger.info('User soft deleted', {
        userId: id,
        tenantId: tenantId,
      });
    }

    return !!success;
  }

  /**
   * Hard delete user (admin only)
   */
  async hardDeleteUser(id: string): Promise<boolean> {
    try {
      await this.delete(id, true);
      logger.warn('User hard deleted', { userId: id });
      return true;
    } catch (error: any) {
      logger.error('Failed to hard delete user', {
        userId: id,
        error: error.message,
      });
      return false;
    }
  }
} 