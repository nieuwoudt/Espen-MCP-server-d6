// 🔐 Authentication Types and Interfaces

// User role types
export type UserRole = 'admin' | 'teacher' | 'parent' | 'student';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

// User entity interface
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  tenantId: string;
  metadata?: Record<string, any>;
  lastLoginAt?: string;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JWTPayload {
  sub: string;           // User ID
  email: string;         // User email
  role: string;          // User role (learner, teacher, parent, admin)
  tenant_id: string;     // Tenant/School ID
  permissions?: string[]; // User permissions
  iat?: number;          // Issued at
  exp?: number;          // Expires at
  name?: string;         // User display name
  school_name?: string;  // School name for context
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'learner' | 'teacher' | 'parent' | 'admin';
  tenantId: string;
  permissions: string[];
  name?: string;
  schoolName?: string;
}

export interface TenantContext {
  id: string;
  name?: string;
  domain?: string;
  settings?: Record<string, any>;
}

export interface AuthError {
  code: string;
  message: string;
  statusCode: number;
}

// Note: We'll extend the request object directly instead of using module augmentation
// to avoid conflicts with existing Fastify types

export const AUTH_ERRORS = {
  MISSING_AUTH_HEADER: {
    code: 'MISSING_AUTH_HEADER',
    message: 'Authorization header required',
    statusCode: 401,
  },
  INVALID_AUTH_FORMAT: {
    code: 'INVALID_AUTH_FORMAT',
    message: 'Invalid authorization format. Use: Bearer <token>',
    statusCode: 401,
  },
  JWT_VERIFICATION_FAILED: {
    code: 'JWT_VERIFICATION_FAILED',
    message: 'Invalid or expired token',
    statusCode: 401,
  },
  MISSING_TENANT_ID: {
    code: 'MISSING_TENANT_ID',
    message: 'User not associated with any tenant',
    statusCode: 403,
  },
  INSUFFICIENT_PERMISSIONS: {
    code: 'INSUFFICIENT_PERMISSIONS',
    message: 'Insufficient permissions for this operation',
    statusCode: 403,
  },
} as const; 