// 🔐 Authentication Service
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';
import { JWTPayload, AuthenticatedUser, AuthError } from '../types/auth.js';

// Supabase client for user verification
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  /**
   * Generate JWT token for authenticated user
   */
  generateToken(user: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
    name?: string;
    schoolName?: string;
    permissions?: string[];
  }): string {
    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenantId,
      name: user.name,
      school_name: user.schoolName,
      permissions: user.permissions || [],
    };

    const options = {
      expiresIn: this.jwtExpiresIn,
      issuer: 'espen-d6-mcp-server',
      audience: 'espen-ai',
    };
    
    return jwt.sign(payload, this.jwtSecret, options);
  }

  /**
   * Verify JWT token and return payload
   */
  verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'espen-d6-mcp-server',
        audience: 'espen-ai',
      }) as JWTPayload;

      return decoded;
    } catch (error: any) {
      logger.warn('JWT verification failed', {
        error: error.message,
        tokenExpired: error.name === 'TokenExpiredError',
        tokenMalformed: error.name === 'JsonWebTokenError',
      });

      throw new Error(`JWT verification failed: ${error.message}`);
    }
  }

  /**
   * Authenticate user with email and password via Supabase
   */
  async authenticateUser(email: string, password: string): Promise<AuthenticatedUser> {
    try {
      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        logger.warn('User authentication failed', {
          email,
          error: authError?.message,
        });
        throw new Error('Invalid email or password');
      }

      // Get user profile with tenant information
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          role,
          first_name,
          last_name,
          tenant_id,
          permissions,
          tenants (
            name,
            domain
          )
        `)
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        logger.error('Failed to load user profile', {
          userId: authData.user.id,
          error: profileError?.message,
        });
        throw new Error('Failed to load user profile');
      }

      const user: AuthenticatedUser = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        tenantId: profile.tenant_id,
        permissions: profile.permissions || [],
        name: `${profile.first_name} ${profile.last_name}`.trim(),
        schoolName: (profile.tenants as any)?.name,
      };

      logger.info('User authenticated successfully', {
        userId: user.id,
        role: user.role,
        tenantId: user.tenantId,
      });

      return user;
    } catch (error: any) {
      logger.error('Authentication error', {
        email,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get user by ID for token refresh scenarios
   */
  async getUserById(userId: string, tenantId: string): Promise<AuthenticatedUser | null> {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          role,
          first_name,
          last_name,
          tenant_id,
          permissions,
          tenants (
            name,
            domain
          )
        `)
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (error || !profile) {
        logger.warn('User not found', { userId, tenantId });
        return null;
      }

      return {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        tenantId: profile.tenant_id,
        permissions: profile.permissions || [],
        name: `${profile.first_name} ${profile.last_name}`.trim(),
        schoolName: (profile.tenants as any)?.name,
      };
    } catch (error: any) {
      logger.error('Error fetching user by ID', {
        userId,
        tenantId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Check if user has required permission
   */
  hasPermission(user: AuthenticatedUser, permission: string): boolean {
    // Admin role has all permissions
    if (user.role === 'admin') {
      return true;
    }

    // Check explicit permissions
    return user.permissions.includes(permission);
  }

  /**
   * Check if user can access another user's data
   */
  canAccessUserData(
    currentUser: AuthenticatedUser,
    targetUserId: string,
    targetUserRole?: string
  ): boolean {
    // Users can always access their own data
    if (currentUser.id === targetUserId) {
      return true;
    }

    // Admins can access any data in their tenant
    if (currentUser.role === 'admin') {
      return true;
    }

    // Teachers can access learner data
    if (currentUser.role === 'teacher' && targetUserRole === 'learner') {
      return true;
    }

    // Parents can access their children's data (would need additional relationship check)
    if (currentUser.role === 'parent' && targetUserRole === 'learner') {
      // TODO: Implement parent-child relationship check
      return false;
    }

    return false;
  }

  /**
   * Generate API key for service-to-service communication
   */
  generateApiKey(tenantId: string, service: string): string {
    const payload = {
      tenant_id: tenantId,
      service,
      type: 'api_key',
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '1y', // API keys last longer
      issuer: 'espen-d6-mcp-server',
      audience: 'espen-d6-api',
    });
  }
}

// Export singleton instance
export const authService = new AuthService(); 