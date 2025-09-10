'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schemas
const sessionIdSchema = z.string().cuid();
const userIdSchema = z.string().cuid().optional();

export interface ActiveSession {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  lastActive: Date;
  isCurrent: boolean;
  deviceInfo?: string;
}

/**
 * Get all active sessions for a user
 */
export async function getUserActiveSessions(userId?: string): Promise<ActiveSession[]> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }
  
  // Validate input
  const validatedUserId = userIdSchema.parse(userId);
  const targetUserId = validatedUserId || session.user.id;
  
  // Only allow users to see their own sessions (unless admin)
  if (targetUserId !== session.user.id && session.user.role !== 'ADMIN') {
    throw new Error('Insufficient permissions');
  }
  
  try {
    // Get current session token from cookies
    const sessionToken = await getCurrentSessionToken();
    
    const sessions = await prisma.session.findMany({
      where: {
        userId: targetUserId,
        expires: {
          gt: new Date() // Only active (non-expired) sessions
        }
      },
      orderBy: {
        expires: 'desc'
      }
    });
    
    return sessions.map(s => ({
      id: s.id,
      sessionToken: s.sessionToken,
      userId: s.userId,
      expires: s.expires,
      createdAt: s.expires, // Use expires as proxy for creation time
      lastActive: s.expires, // Use expires as proxy for last activity
      isCurrent: s.sessionToken === sessionToken,
      deviceInfo: 'Unknown Device', // Could be enhanced with user agent parsing
    }));
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    throw new Error('Failed to fetch active sessions');
  }
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: string): Promise<{ success: boolean; message: string }> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, message: 'Authentication required' };
  }
  
  // Validate input
  try {
    sessionIdSchema.parse(sessionId);
  } catch {
    return { success: false, message: 'Invalid session ID' };
  }
  
  try {
    // Find the session to revoke
    const targetSession = await prisma.session.findUnique({
      where: { id: sessionId }
    });
    
    if (!targetSession) {
      return { success: false, message: 'Session not found' };
    }
    
    // Only allow users to revoke their own sessions (unless admin)
    if (targetSession.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return { success: false, message: 'Insufficient permissions' };
    }
    
    // Prevent users from revoking their current session
    const isCurrent = await isCurrentSession(targetSession.sessionToken);
    if (isCurrent) {
      return { success: false, message: 'Cannot revoke current session' };
    }
    
    // Delete the session
    await prisma.session.delete({
      where: { id: sessionId }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SESSION_REVOKED',
        resource: 'SESSION',
        resourceId: sessionId,
        oldData: {
          sessionId: targetSession.id,
          userId: targetSession.userId,
          expires: targetSession.expires.toISOString()
        }
      }
    });
    
    revalidatePath('/user/settings');
    return { success: true, message: 'Session revoked successfully' };
  } catch (error) {
    console.error('Error revoking session:', error);
    return { success: false, message: 'Failed to revoke session' };
  }
}

/**
 * Revoke all sessions except current
 */
export async function revokeAllOtherSessions(): Promise<{ success: boolean; message: string; count: number }> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, message: 'Authentication required', count: 0 };
  }
  
  try {
    // Get current session token from cookies
    const currentSessionToken = await getCurrentSessionToken();
    
    if (!currentSessionToken) {
      return { success: false, message: 'Unable to identify current session', count: 0 };
    }
    
    // Delete all other sessions for this user
    const result = await prisma.session.deleteMany({
      where: {
        userId: session.user.id,
        sessionToken: {
          not: currentSessionToken // Keep current session
        }
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ALL_SESSIONS_REVOKED',
        resource: 'SESSION',
        newData: {
          revokedCount: result.count,
          timestamp: new Date().toISOString()
        }
      }
    });
    
    revalidatePath('/user/settings');
    return { 
      success: true, 
      message: `${result.count} sessions revoked successfully`, 
      count: result.count 
    };
  } catch (error) {
    console.error('Error revoking all sessions:', error);
    return { success: false, message: 'Failed to revoke sessions', count: 0 };
  }
}

/**
 * Get session statistics for admin
 */
export async function getSessionStatistics(): Promise<{
  totalActiveSessions: number;
  sessionsByRole: Record<string, number>;
  recentLogins: Array<{
    userId: string;
    userName: string;
    loginTime: Date;
    userRole: string;
  }>;
}> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }
  
  try {
    // Get total active sessions
    const totalActiveSessions = await prisma.session.count({
      where: {
        expires: {
          gt: new Date()
        }
      }
    });
    
    // Get sessions by role - using separate queries since user relation not available
    const sessionsByRoleData = await prisma.session.findMany({
      where: {
        expires: {
          gt: new Date()
        }
      }
    });
    
    // Get user roles for active sessions
    const sessionUserIds = sessionsByRoleData.map(s => s.userId);
    const sessionUsers = await prisma.user.findMany({
      where: {
        id: { in: sessionUserIds }
      },
      select: {
        id: true,
        role: true
      }
    });
    
    const sessionUserRoleMap = sessionUsers.reduce((acc, user) => {
      acc[user.id] = user.role;
      return acc;
    }, {} as Record<string, string>);
    
    const sessionsByRole = sessionsByRoleData.reduce((acc, session) => {
      const role = sessionUserRoleMap[session.userId] || 'UNKNOWN';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Get recent logins (from audit logs)
    const recentLogins = await prisma.auditLog.findMany({
      where: {
        action: 'SIGN_IN',
        userId: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    // Get user details for recent logins
    const userIds = recentLogins.map(log => log.userId!).filter(Boolean);
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds
        }
      },
      select: {
        id: true,
        name: true,
        role: true
      }
    });
    
    const userMap = new Map(users.map(user => [user.id, user]));
    
    return {
      totalActiveSessions,
      sessionsByRole,
      recentLogins: recentLogins
        .filter(log => log.userId && userMap.has(log.userId))
        .map(log => {
          const user = userMap.get(log.userId!);
          return {
            userId: log.userId!,
            userName: user?.name || 'Unknown',
            loginTime: log.createdAt,
            userRole: user?.role || 'USER'
          };
        })
    };
  } catch (error) {
    console.error('Error fetching session statistics:', error);
    throw new Error('Failed to fetch session statistics');
  }
}

/**
 * Clean up expired sessions (utility function)
 */
export async function cleanupExpiredSessions(): Promise<{ success: boolean; cleanedCount: number }> {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date()
        }
      }
    });
    
    return {
      success: true,
      cleanedCount: result.count
    };
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return {
      success: false,
      cleanedCount: 0
    };
  }
}

/**
 * Get current session token from cookies
 */
export async function getCurrentSessionToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('next-auth.session-token')?.value || 
           cookieStore.get('__Secure-next-auth.session-token')?.value || 
           null;
  } catch (error) {
    console.error('Error getting current session token:', error);
    return null;
  }
}

/**
 * Check if a session is current session
 */
export async function isCurrentSession(sessionToken: string): Promise<boolean> {
  const currentToken = await getCurrentSessionToken();
  return currentToken === sessionToken;
}

/**
 * Get session count for a user
 */
export async function getUserSessionCount(userId: string): Promise<number> {
  try {
    return await prisma.session.count({
      where: {
        userId,
        expires: {
          gt: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Error getting user session count:', error);
    return 0;
  }
}

/**
 * Check if user has reached session limit
 */
export async function hasReachedSessionLimit(userId: string, maxSessions: number = 5): Promise<boolean> {
  const sessionCount = await getUserSessionCount(userId);
  return sessionCount >= maxSessions;
}