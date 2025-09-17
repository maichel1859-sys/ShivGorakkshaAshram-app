'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import {
  notificationSchema
} from '@/lib/validation/unified-schemas';

// Use unified schemas
const createNotificationSchema = notificationSchema;

const updateNotificationSchema = notificationSchema.partial();

// Get user notifications
export async function getUserNotifications(options?: {
  unreadOnly?: boolean;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const { unreadOnly = false, type, limit = 20, offset = 0 } = options || {};

    const whereClause: {
      userId: string;
      read?: boolean;
      type?: string;
    } = {
      userId: session.user.id,
    };

    if (unreadOnly) {
      whereClause.read = false;
    }

    if (type && type !== 'all') {
      whereClause.type = type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          read: false,
        },
      }),
    ]);

    return {
      success: true,
      notifications,
      total,
      unreadCount,
      hasMore: offset + limit < total,
    };
  } catch (error) {
    console.error('Get user notifications error:', error);
    return { success: false, error: 'Failed to fetch notifications' };
  }
}

// Mark notification as read
export async function markNotificationAsRead(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const notificationId = formData.get('notificationId') as string;
    
    if (!notificationId) {
      return { success: false, error: 'Notification ID is required' };
    }

    // Verify notification exists and belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return { success: false, error: 'Notification not found' };
    }

    if (notification.userId !== session.user.id) {
      return { success: false, error: 'Permission denied' };
    }

    // Mark as read
    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    revalidatePath('/user/notifications');
    
    return { success: true };
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return { success: false, error: 'Failed to mark notification as read' };
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        read: false,
      },
      data: { read: true },
    });

    revalidatePath('/user/notifications');
    
    return { success: true };
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return { success: false, error: 'Failed to mark notifications as read' };
  }
}

// Delete notification
export async function deleteNotification(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const notificationId = formData.get('notificationId') as string;
    
    if (!notificationId) {
      return { success: false, error: 'Notification ID is required' };
    }

    // Verify notification exists and belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return { success: false, error: 'Notification not found' };
    }

    if (notification.userId !== session.user.id) {
      return { success: false, error: 'Permission denied' };
    }

    // Delete notification
    await prisma.notification.delete({
      where: { id: notificationId },
    });

    revalidatePath('/user/notifications');
    
    return { success: true };
  } catch (error) {
    console.error('Delete notification error:', error);
    return { success: false, error: 'Failed to delete notification' };
  }
}

// Create notification (for admins and system)
export async function createNotification(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only admins and system can create notifications
  if (!['ADMIN', 'SYSTEM'].includes(session.user.role)) {
    return { success: false, error: 'Only admins can create notifications' };
  }

  try {
    const data = createNotificationSchema.parse({
      userId: formData.get('userId') as string,
      title: formData.get('title') as string,
      message: formData.get('message') as string,
      type: (formData.get('type') as string) || 'info',
      data: formData.get('data') ? JSON.parse(formData.get('data') as string) : undefined,
    });

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        data: JSON.parse(JSON.stringify(data.data)),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_NOTIFICATION',
        resource: 'NOTIFICATION',
        resourceId: notification.id,
        newData: {
          targetUserId: data.userId,
          title: data.title,
          type: data.type,
        },
      },
    });

    // Broadcast notification creation to all stakeholders
    try {
      const socketResponse = await fetch(`${process.env.SOCKET_SERVER_URL || 'https://ashram-queue-socket-server.onrender.com'}/api/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'notification_created',
          data: {
            notificationId: notification.id,
            notification: notification,
            action: 'created',
            timestamp: new Date().toISOString(),
            targetUser: {
              id: data.userId,
            },
            createdBy: {
              id: session.user.id,
              role: session.user.role,
              name: session.user.name
            },
            type: data.type,
            title: data.title,
            message: data.message,
          },
          rooms: [
            'notifications',
            'admin',
            'coordinator',
            `user:${data.userId}`,
            'global',
          ],
        }),
      });

      if (socketResponse.ok) {
        console.log(`🔌 Broadcasted notification creation to all stakeholders`);
      } else {
        console.warn(`🔌 Failed to broadcast notification creation:`, await socketResponse.text());
      }
    } catch (socketError) {
      console.error('🔌 Socket broadcast error:', socketError);
      // Continue even if socket fails
    }

    revalidatePath('/user/notifications');
    
    return { success: true, notification };
  } catch (error) {
    console.error('Create notification error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Failed to create notification' };
  }
}

// Update notification (for admins)
export async function updateNotification(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only admins can update notifications
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only admins can update notifications' };
  }

  try {
    const notificationId = formData.get('notificationId') as string;
    const data = updateNotificationSchema.parse({
      title: (formData.get('title') as string) || undefined,
      message: (formData.get('message') as string) || undefined,
      type: (formData.get('type') as string) || undefined,
      data: formData.get('data') ? JSON.parse(formData.get('data') as string) : undefined,
    });

    if (!notificationId) {
      return { success: false, error: 'Notification ID is required' };
    }

    // Verify notification exists
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return { success: false, error: 'Notification not found' };
    }

    // Update notification
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId, ...updateData } = data;
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        ...updateData,
        data: updateData.data ? JSON.parse(JSON.stringify(updateData.data)) : undefined,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_NOTIFICATION',
        resource: 'NOTIFICATION',
        resourceId: notificationId,
        oldData: {
          title: notification.title,
          message: notification.message,
          type: notification.type,
        },
        newData: JSON.parse(JSON.stringify(data)),
      },
    });

    revalidatePath('/user/notifications');
    
    return { success: true, notification: updatedNotification };
  } catch (error) {
    console.error('Update notification error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Failed to update notification' };
  }
}

// Get notification by ID
export async function getNotification(notificationId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return { success: false, error: 'Notification not found' };
    }

    // Users can only access their own notifications
    if (session.user.role === 'USER' && notification.userId !== session.user.id) {
      return { success: false, error: 'Permission denied' };
    }

    return { success: true, notification };
  } catch (error) {
    console.error('Get notification error:', error);
    return { success: false, error: 'Failed to fetch notification' };
  }
}

// Get notification statistics (for admins)
export async function getNotificationStats() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only admins can access notification statistics
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only admins can access notification statistics' };
  }

  try {
    const [total, unread, today, thisWeek, thisMonth] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({ where: { read: false } }),
      prisma.notification.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.notification.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7)),
          },
        },
      }),
      prisma.notification.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(1)),
          },
        },
      }),
    ]);

    const typeStats = await prisma.notification.groupBy({
      by: ['type'],
      _count: { type: true },
    });

    return {
      success: true,
      stats: {
        total,
        unread,
        today,
        thisWeek,
        thisMonth,
        byType: typeStats,
      },
    };
  } catch (error) {
    console.error('Get notification stats error:', error);
    return { success: false, error: 'Failed to fetch notification statistics' };
  }
}

// Get all notifications (for admin/coordinator use)
export async function getNotifications(options?: {
  userId?: string;
  type?: string;
  read?: boolean;
  limit?: number;
  offset?: number;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const { userId, type, read, limit = 50, offset = 0 } = options || {};

    const whereClause: Prisma.NotificationWhereInput = {};

    // Filter by user if specified (admin/coordinator can see all, users see only their own)
    if (userId) {
      whereClause.userId = userId;
    } else if (session.user.role === 'USER') {
      whereClause.userId = session.user.id;
    }

    // Filter by type if specified
    if (type) {
      whereClause.type = type;
    }

    // Filter by read status if specified
    if (read !== undefined) {
      whereClause.read = read;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where: whereClause }),
    ]);

    return {
      success: true,
      notifications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  } catch (error) {
    console.error('Get notifications error:', error);
    return { success: false, error: 'Failed to fetch notifications' };
  }
}