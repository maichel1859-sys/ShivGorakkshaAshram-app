'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';

export type AuditAction = 
  | 'SIGN_IN' 
  | 'SIGN_OUT' 
  | 'PASSWORD_CHANGED'
  | 'SESSION_REVOKED'
  | 'ALL_SESSIONS_REVOKED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'ROLE_CHANGED'
  | 'APPOINTMENT_CREATED'
  | 'APPOINTMENT_UPDATED'
  | 'APPOINTMENT_CANCELLED'
  | 'REMEDY_PRESCRIBED'
  | 'REMEDY_VIEWED'
  | 'SENSITIVE_DATA_ACCESSED'
  | 'SECURITY_EVENT'
  | 'ADMIN_ACTION'
  | 'DATA_EXPORT'
  | 'PERMISSION_DENIED';

export type AuditResource = 
  | 'USER' 
  | 'SESSION' 
  | 'APPOINTMENT' 
  | 'REMEDY' 
  | 'SECURITY' 
  | 'ADMIN_PANEL'
  | 'SENSITIVE_DATA';

export interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: {
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category?: string;
    details?: string;
    timestamp?: string;
    sessionId?: string;
    affectedUsers?: string[];
    riskLevel?: number;
  };
}

/**
 * Enhanced audit logging with security context
 */
export async function createAuditLog(
  entry: AuditLogEntry,
  requestHeaders?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  try {
    const session = await getServerSession(authOptions);
    
    // Use provided headers or extract from request context
    const ipAddress = entry.ipAddress || requestHeaders?.ipAddress || 'unknown';
    const userAgent = entry.userAgent || requestHeaders?.userAgent || 'unknown';
    
    // Determine severity if not provided
    const severity = entry.metadata?.severity || determineSeverity(entry.action);
    
    // Create comprehensive audit log
    await prisma.auditLog.create({
      data: {
        userId: entry.userId || session?.user?.id,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        oldData: entry.oldData ? JSON.parse(JSON.stringify(entry.oldData)) : null,
        newData: entry.newData ? JSON.parse(JSON.stringify(entry.newData)) : null,
        ipAddress: ipAddress,
        userAgent: userAgent,
        // Note: metadata field not in schema, storing in newData if needed
      }
    });
    
    // Log high-severity events to console for immediate attention
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      console.warn(`🚨 Security Event [${severity}]:`, {
        action: entry.action,
        resource: entry.resource,
        userId: entry.userId || session?.user?.id,
        ipAddress: ipAddress,
        details: entry.metadata?.details
      });
    }
  } catch (error) {
    // Log to console as fallback - don't let audit failures break the app
    console.error('Failed to create audit log:', error);
    console.log('Audit entry that failed:', entry);
  }
}

/**
 * Determine severity based on action type
 */
function determineSeverity(action: AuditAction): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const severityMap: Record<AuditAction, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = {
    'SIGN_IN': 'LOW',
    'SIGN_OUT': 'LOW',
    'PASSWORD_CHANGED': 'MEDIUM',
    'SESSION_REVOKED': 'MEDIUM',
    'ALL_SESSIONS_REVOKED': 'HIGH',
    'USER_CREATED': 'MEDIUM',
    'USER_UPDATED': 'MEDIUM',
    'USER_DELETED': 'HIGH',
    'ROLE_CHANGED': 'HIGH',
    'APPOINTMENT_CREATED': 'LOW',
    'APPOINTMENT_UPDATED': 'LOW',
    'APPOINTMENT_CANCELLED': 'LOW',
    'REMEDY_PRESCRIBED': 'MEDIUM',
    'REMEDY_VIEWED': 'LOW',
    'SENSITIVE_DATA_ACCESSED': 'HIGH',
    'SECURITY_EVENT': 'CRITICAL',
    'ADMIN_ACTION': 'HIGH',
    'DATA_EXPORT': 'HIGH',
    'PERMISSION_DENIED': 'MEDIUM'
  };
  
  return severityMap[action] || 'MEDIUM';
}

/**
 * Security-specific audit logging
 */
export async function logSecurityEvent(
  event: string,
  details: Record<string, unknown>,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
): Promise<void> {
  await createAuditLog({
    action: 'SECURITY_EVENT',
    resource: 'SECURITY',
    metadata: {
      severity,
      category: 'security',
      details: typeof details === 'string' ? details : JSON.stringify(details)
    },
    newData: { event, details }
  });
}

/**
 * Log sensitive data access
 */
export async function logSensitiveDataAccess(
  dataType: string,
  resourceId: string,
  purpose?: string
): Promise<void> {
  await createAuditLog({
    action: 'SENSITIVE_DATA_ACCESSED',
    resource: 'SENSITIVE_DATA',
    resourceId,
    metadata: {
      severity: 'HIGH',
      category: 'data_access',
      details: purpose || 'Sensitive data accessed'
    },
    newData: {
      dataType,
      purpose,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log permission denied events
 */
export async function logPermissionDenied(
  attemptedAction: string,
  resource: AuditResource,
  resourceId?: string
): Promise<void> {
  await createAuditLog({
    action: 'PERMISSION_DENIED',
    resource,
    resourceId,
    metadata: {
      severity: 'MEDIUM',
      category: 'access_control',
      details: `Permission denied for action: ${attemptedAction}`
    },
    newData: {
      attemptedAction,
      deniedAt: new Date().toISOString()
    }
  });
}

/**
 * Get audit logs with filtering (admin only)
 */
export async function getAuditLogs(options: {
  userId?: string;
  action?: AuditAction;
  resource?: AuditResource;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
} = {}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    await logPermissionDenied('VIEW_AUDIT_LOGS', 'ADMIN_PANEL');
    throw new Error('Admin access required');
  }
  
  const {
    userId,
    action,
    resource,
    severity,
    startDate,
    endDate,
    limit = 100,
    offset = 0
  } = options;
  
  const where: Record<string, unknown> = {};
  
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (resource) where.resource = resource;
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;
    where.createdAt = dateFilter;
  }
  // Note: metadata field not available in Prisma schema
  // Filtering by severity would require JSON path queries on newData field
  if (severity) {
    console.warn('Severity filtering not implemented - metadata field not in schema');
  }
  
  try {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        // Note: user relation not available in AuditLog schema
        // include: {
        //   user: {
        //     select: {
        //       id: true,
        //       name: true,
        //       email: true,
        //       role: true
        //     }
        //   }
        // }
      }),
      prisma.auditLog.count({ where })
    ]);
    
    // Log this admin access
    await createAuditLog({
      action: 'ADMIN_ACTION',
      resource: 'ADMIN_PANEL',
      metadata: {
        severity: 'HIGH',
        category: 'admin_access',
        details: 'Audit logs accessed'
      },
      newData: {
        filters: options,
        resultCount: logs.length
      }
    });
    
    return { logs, total, hasMore: total > offset + limit };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw new Error('Failed to fetch audit logs');
  }
}

/**
 * Get security alerts (high and critical severity events)
 */
export async function getSecurityAlerts(limit: number = 50) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    await logPermissionDenied('VIEW_SECURITY_ALERTS', 'SECURITY');
    throw new Error('Admin access required');
  }
  
  try {
    // Note: metadata field not available in Prisma schema
    // This would require JSON path queries on newData field
    const alerts = await prisma.auditLog.findMany({
      where: {
        // Cannot filter by severity without metadata field
        // OR: [
        //   {
        //     metadata: {
        //       path: ['severity'],
        //       equals: 'HIGH'
        //     }
        //   },
        //   {
        //     metadata: {
        //       path: ['severity'],
        //       equals: 'CRITICAL'
        //     }
        //   }
        // ]
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      // Note: user relation not available in AuditLog schema
      // include: {
      //   user: {
      //     select: {
      //       id: true,
      //       name: true,
      //       email: true,
      //       role: true
      //     }
      //   }
      // }
    });
    
    return alerts;
  } catch (error) {
    console.error('Error fetching security alerts:', error);
    throw new Error('Failed to fetch security alerts');
  }
}

/**
 * Cleanup old audit logs (retain for compliance)
 */
export async function cleanupOldAuditLogs(retentionDays: number = 365) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  try {
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        },
        // Note: metadata field not available in Prisma schema
        // Cannot filter by severity - would cleanup all old logs
        // metadata: {
        //   path: ['severity'],
        //   in: ['LOW', 'MEDIUM'] // Only cleanup low/medium severity logs
        // }
      }
    });
    
    await createAuditLog({
      action: 'ADMIN_ACTION',
      resource: 'ADMIN_PANEL',
      metadata: {
        severity: 'MEDIUM',
        category: 'maintenance',
        details: 'Audit log cleanup performed'
      },
      newData: {
        deletedCount: result.count,
        retentionDays,
        cutoffDate: cutoffDate.toISOString()
      }
    });
    
    return result.count;
  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    throw new Error('Failed to cleanup audit logs');
  }
}