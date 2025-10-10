'use server';
import { logger } from '@/lib/utils/logger';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/prisma';
import {
  emitGurujiEvent,
  emitNotificationEvent,
  SocketEventTypes
} from '@/lib/socket/socket-emitter';

interface ContactHistory {
  id: string;
  type: 'notification' | 'phone';
  method: string;
  recipient: string;
  message: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  sentAt: string;
  deliveredAt?: string;
  errorMessage?: string;
}

// Get guruji profile
export async function getGurujiProfile(gurujiId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    const guruji = await prisma.user.findUnique({
      where: { id: gurujiId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!guruji) {
      return { success: false, error: 'Guruji not found' };
    }

    return { success: true, guruji };
  } catch (error) {
    logger.error('Get guruji profile error:', error);
    return { success: false, error: 'Failed to fetch guruji profile' };
  }
}

// Update guruji profile
export async function updateGurujiProfile(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'GURUJI') {
      return { success: false, error: 'Authentication required' };
    }

    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;

    const guruji = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || undefined,
        phone: phone || undefined,
        updatedAt: new Date()
      }
    });

    // Emit guruji updated event
    await emitGurujiEvent(
      SocketEventTypes.GURUJI_AVAILABLE,
      {
        id: guruji.id,
        name: guruji.name || 'Guruji',
        status: 'AVAILABLE',
        availability: [],
        currentQueueLength: 0
      }
    );

    return { success: true, guruji };
  } catch (error) {
    logger.error('Update guruji profile error:', error);
    return { success: false, error: 'Failed to update profile' };
  }
}

// Get guruji schedule (placeholder)
export async function getGurujiSchedule(gurujiId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    // For now, return a basic schedule structure
    const schedule = {
      gurujiId,
      workingHours: { start: '09:00', end: '17:00' },
      weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      breaks: [{ start: '12:00', end: '13:00' }]
    };

    return { success: true, schedule };
  } catch (error) {
    logger.error('Get guruji schedule error:', error);
    return { success: false, error: 'Failed to fetch schedule' };
  }
}

// Update guruji schedule (placeholder)
export async function updateGurujiSchedule(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'GURUJI') {
      return { success: false, error: 'Authentication required' };
    }

    // Log formData for debugging (placeholder implementation)
    logger.log('Schedule update data received:', formData.keys());

    // For now, return a success response
    const schedule = {
      gurujiId: session.user.id,
      workingHours: { start: '09:00', end: '17:00' },
      weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      breaks: [{ start: '12:00', end: '13:00' }]
    };

    return { success: true, schedule };
  } catch (error) {
    logger.error('Update guruji schedule error:', error);
    return { success: false, error: 'Failed to update schedule' };
  }
}

// Get guruji statistics
export async function getGurujiStats(gurujiId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalAppointments,
      todayAppointments,
      pendingAppointments,
      completedAppointments
    ] = await Promise.all([
      prisma.appointment.count({
        where: { gurujiId }
      }),
      prisma.appointment.count({
        where: {
          gurujiId,
          date: {
            gte: today.toISOString().split('T')[0],
            lt: tomorrow.toISOString().split('T')[0]
          }
        }
      }),
      prisma.appointment.count({
        where: {
          gurujiId,
          status: { in: ['BOOKED', 'CONFIRMED'] }
        }
      }),
      prisma.appointment.count({
        where: {
          gurujiId,
          status: 'COMPLETED'
        }
      })
    ]);

    const stats = {
      totalAppointments,
      todayAppointments,
      pendingAppointments,
      completedAppointments
    };

    return { success: true, stats };
  } catch (error) {
    logger.error('Get guruji stats error:', error);
    return { success: false, error: 'Failed to fetch stats' };
  }
}

export async function getGurujiAppointments() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    if (session.user.role !== 'GURUJI') {
      return { success: false, error: 'Unauthorized - Guruji access required' };
    }

    // Fetch all appointments for this Guruji with related data
    const appointments = await prisma.appointment.findMany({
      where: {
        gurujiId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        queueEntry: {
          select: {
            id: true,
            position: true,
            status: true,
            checkedInAt: true,
            estimatedWait: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { startTime: 'desc' },
      ],
    });

    return {
      success: true,
      appointments: appointments.map(appointment => ({
        ...appointment,
        // Ensure dates are properly serialized
        date: appointment.date.toISOString(),
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
        createdAt: appointment.createdAt.toISOString(),
        updatedAt: appointment.updatedAt.toISOString(),
        checkedInAt: appointment.checkedInAt?.toISOString() || null,
        queueEntry: appointment.queueEntry ? {
          ...appointment.queueEntry,
          checkedInAt: appointment.queueEntry.checkedInAt?.toISOString() || null,
        } : null,
      }))
    };
  } catch (error) {
    logger.error('Error fetching Guruji appointments:', error);
    return { success: false, error: 'Failed to fetch appointments' };
  }
}

export async function getDevoteeContactHistory(devoteeId: string): Promise<{ success: boolean; data?: ContactHistory[]; error?: string }> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    if (session.user.role !== 'GURUJI') {
      return { success: false, error: 'Unauthorized - Guruji access required' };
    }

    // Verify the devotee exists and has had appointments with this Guruji
    const devotee = await prisma.user.findFirst({
      where: {
        id: devoteeId,
        devoteeAppointments: {
          some: {
            gurujiId: session.user.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    if (!devotee) {
      return { success: false, error: 'Devotee not found or no appointment history with you' };
    }

    // Get actual notifications from the database
    const notifications = await prisma.notification.findMany({
      where: {
        userId: devoteeId,
        type: {
          in: ['APPOINTMENT_REMINDER', 'REMEDY_PRESCRIBED', 'CONSULTATION_COMPLETE', 'CUSTOM'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to recent 50 notifications
    });

    // Transform notifications to ContactHistory format
    const contactHistory: ContactHistory[] = notifications.map(notification => ({
      id: notification.id,
      type: 'notification' as const,
      method: 'In-App Notification',
      recipient: devotee.name || 'Devotee',
      message: notification.message,
      status: notification.read ? 'delivered' : 'sent',
      sentAt: notification.createdAt.toISOString(),
      deliveredAt: notification.read ? notification.createdAt.toISOString() : undefined,
    }));

    return {
      success: true,
      data: contactHistory,
    };
  } catch (error) {
    logger.error('Error fetching devotee contact history:', error);
    return { success: false, error: 'Failed to fetch contact history' };
  }
}

export async function sendDevoteeNotification(
  devoteeId: string,
  message: string,
  type: string = 'CUSTOM'
): Promise<{ success: boolean; data?: ContactHistory; error?: string }> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    if (session.user.role !== 'GURUJI') {
      return { success: false, error: 'Unauthorized - Guruji access required' };
    }

    if (!message.trim()) {
      return { success: false, error: 'Message is required' };
    }

    // Verify the devotee exists and has had appointments with this Guruji
    const devotee = await prisma.user.findFirst({
      where: {
        id: devoteeId,
        devoteeAppointments: {
          some: {
            gurujiId: session.user.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    if (!devotee) {
      return { success: false, error: 'Devotee not found or no appointment history with you' };
    }

    // Create the notification in the database
    const notification = await prisma.notification.create({
      data: {
        userId: devoteeId,
        type: type,
        title: 'Message from Guruji',
        message: message.trim(),
        read: false,
      },
    });

    // Emit notification sent event
    await emitNotificationEvent(
      SocketEventTypes.NOTIFICATION_SENT,
      notification.id,
      {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        userId: devoteeId
      }
    );

    // Return in ContactHistory format
    const contactHistory: ContactHistory = {
      id: notification.id,
      type: 'notification',
      method: 'In-App Notification',
      recipient: devotee.name || 'Devotee',
      message: notification.message,
      status: 'sent',
      sentAt: notification.createdAt.toISOString(),
    };

    return {
      success: true,
      data: contactHistory,
    };
  } catch (error) {
    logger.error('Error sending devotee notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}
