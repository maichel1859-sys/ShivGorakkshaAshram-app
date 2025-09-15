'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';

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
    console.error('Error fetching Guruji appointments:', error);
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
    console.error('Error fetching devotee contact history:', error);
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
    console.error('Error sending devotee notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}