import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { User, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// Types for better type safety
export interface AuthenticatedUser extends User {
  permissions?: string[];
}

export interface AuthContext {
  user: AuthenticatedUser;
  session: unknown;
}

export type ApiHandler<T = unknown> = (
  req: NextRequest,
  context: T,
  auth: AuthContext
) => Promise<NextResponse>;

export type UnprotectedApiHandler<T = unknown> = (
  req: NextRequest,
  context: T
) => Promise<NextResponse>;

// Permission system
const rolePermissions: Record<Role, string[]> = {
  USER: [
    "read:own_profile",
    "create:own_appointment",
    "read:own_appointments",
    "read:own_queue",
  ] as string[],
  COORDINATOR: [
    "read:users",
    "read:appointments",
    "update:appointments",
    "create:appointments",
    "read:queue",
    "update:queue",
    "read:notifications",
    "create:notifications",
  ] as string[],
  GURUJI: [
    "read:patients",
    "read:appointments",
    "update:appointments",
    "create:remedies",
    "read:remedies",
    "update:remedies",
  ] as string[],
  ADMIN: [
    "read:users",
    "create:users",
    "update:users",
    "delete:users",
    "read:appointments",
    "create:appointments",
    "update:appointments",
    "delete:appointments",
    "read:queue",
    "update:queue",
    "read:notifications",
    "create:notifications",
    "read:analytics",
    "manage:system",
  ] as string[],
};

// Authentication utility functions
export async function authenticateRequest(): Promise<AuthContext | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return null;
    }

    // Fetch full user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user || !user.isActive) {
      return null;
    }

    // Add permissions based on role
    const userWithPermissions: AuthenticatedUser = {
      ...user,
      permissions: rolePermissions[user.role] || []
    } as AuthenticatedUser;

    return {
      user: userWithPermissions,
      session
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export function hasPermission(user: AuthenticatedUser, permission: string): boolean {
  if (!user.permissions) return false;
  
  // Admin has all permissions
  if (user.permissions.includes('read:*') || user.permissions.includes('manage:*')) {
    return true;
  }
  
  return user.permissions.includes(permission);
}

export function requireRole(auth: AuthContext | null, allowedRoles: Role[]): NextResponse | null {
  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(auth.user.role)) {
    return NextResponse.json(
      { 
        error: 'Insufficient permissions', 
        code: 'FORBIDDEN',
        requiredRoles: allowedRoles 
      },
      { status: 403 }
    );
  }

  return null;
}

export function requirePermission(auth: AuthContext | null, permission: string): NextResponse | null {
  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  if (!hasPermission(auth.user, permission)) {
    return NextResponse.json(
      { 
        error: 'Insufficient permissions', 
        code: 'FORBIDDEN',
        requiredPermission: permission 
      },
      { status: 403 }
    );
  }

  return null;
}

// Main authentication middleware
export function withAuth<T = unknown>(
  handler: ApiHandler<T>,
  options: {
    roles?: Role[];
    permissions?: string[];
    requireActive?: boolean;
  } = {}
) {
  return async (req: NextRequest, context: T): Promise<NextResponse> => {
    const auth = await authenticateRequest();
    
    // Check authentication
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check role requirements
    if (options.roles && options.roles.length > 0) {
      const roleError = requireRole(auth, options.roles);
      if (roleError) return roleError;
    }

    // Check permission requirements
    if (options.permissions && options.permissions.length > 0) {
      for (const permission of options.permissions) {
        const permissionError = requirePermission(auth, permission);
        if (permissionError) return permissionError;
      }
    }

    // Check if user is active (if required)
    if (options.requireActive && !auth.user.isActive) {
      return NextResponse.json(
        { error: 'Account is inactive', code: 'ACCOUNT_INACTIVE' },
        { status: 403 }
      );
    }

    return handler(req, context, auth);
  };
}

// Optional authentication (for public endpoints that can benefit from user context)
export function withOptionalAuth<T = unknown>(
  handler: (req: NextRequest, context: T, auth?: AuthContext) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: T): Promise<NextResponse> => {
    const auth = await authenticateRequest();
    return handler(req, context, auth || undefined);
  };
}

// Specific role-based middleware factories
export const withAdminAuth = <T = unknown>(handler: ApiHandler<T>) =>
  withAuth(handler, { roles: ['ADMIN'] });

export const withCoordinatorAuth = <T = unknown>(handler: ApiHandler<T>) =>
  withAuth(handler, { roles: ['ADMIN', 'COORDINATOR'] });

export const withGurujiAuth = <T = unknown>(handler: ApiHandler<T>) =>
  withAuth(handler, { roles: ['ADMIN', 'GURUJI'] });

export const withUserAuth = <T = unknown>(handler: ApiHandler<T>) =>
  withAuth(handler, { roles: ['ADMIN', 'COORDINATOR', 'GURUJI', 'USER'] });

// Permission-based middleware factories
export const withReadPermission = <T = unknown>(resource: string, handler: ApiHandler<T>) =>
  withAuth(handler, { permissions: [`read:${resource}`] });

export const withCreatePermission = <T = unknown>(resource: string, handler: ApiHandler<T>) =>
  withAuth(handler, { permissions: [`create:${resource}`] });

export const withUpdatePermission = <T = unknown>(resource: string, handler: ApiHandler<T>) =>
  withAuth(handler, { permissions: [`update:${resource}`] });

export const withDeletePermission = <T = unknown>(resource: string, handler: ApiHandler<T>) =>
  withAuth(handler, { permissions: [`delete:${resource}`] });