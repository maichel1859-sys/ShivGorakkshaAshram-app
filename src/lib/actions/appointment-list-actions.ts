'use server';
import { logger } from '@/lib/utils/logger';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/prisma';
import {
  emitAppointmentEvent,
  SocketEventTypes
} from '@/lib/socket/socket-emitter';

// Get appointments list with filtering
export async function getAppointmentsList(options?: {
  status?: string;
  date?: string;
  gurujiId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    const where: Record<string, unknown> = {};

    // Apply filters based on role
    if (session.user.role === 'USER') {
      where.userId = session.user.id;
    } else if (session.user.role === 'GURUJI') {
      where.gurujiId = session.user.id;
    }
    // ADMIN and COORDINATOR can see all appointments

    // Apply additional filters
    if (options?.status && options.status !== 'all') {
      where.status = options.status;
    }

    if (options?.date) {
      where.date = options.date;
    }

    if (options?.gurujiId && session.user.role !== 'USER') {
      where.gurujiId = options.gurujiId;
    }

    if (options?.userId && ['ADMIN', 'COORDINATOR'].includes(session.user.role)) {
      where.userId = options.userId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        guruji: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { startTime: 'desc' }
      ],
      take: options?.limit || 50,
      skip: options?.offset || 0
    });

    // Get total count for pagination
    const total = await prisma.appointment.count({ where });

    return {
      success: true,
      appointments,
      pagination: {
        total,
        limit: options?.limit || 50,
        offset: options?.offset || 0,
        hasMore: (options?.offset || 0) + appointments.length < total
      }
    };
  } catch (error) {
    logger.error('Get appointments list error:', error);
    return { success: false, error: 'Failed to fetch appointments' };
  }
}

// Get upcoming appointments
export async function getUpcomingAppointments(limit: number = 10) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const where: Record<string, unknown> = {
      date: { gte: today },
      status: { in: ['BOOKED', 'CONFIRMED'] }
    };

    // Apply role-based filtering
    if (session.user.role === 'USER') {
      where.userId = session.user.id;
    } else if (session.user.role === 'GURUJI') {
      where.gurujiId = session.user.id;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        guruji: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ],
      take: limit
    });

    return { success: true, appointments };
  } catch (error) {
    logger.error('Get upcoming appointments error:', error);
    return { success: false, error: 'Failed to fetch upcoming appointments' };
  }
}

// Get today's appointments
export async function getTodayAppointments() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    const today = new Date().toISOString().split('T')[0];

    const where: Record<string, unknown> = {
      date: today
    };

    // Apply role-based filtering
    if (session.user.role === 'USER') {
      where.userId = session.user.id;
    } else if (session.user.role === 'GURUJI') {
      where.gurujiId = session.user.id;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        guruji: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    return { success: true, appointments };
  } catch (error) {
    logger.error('Get today appointments error:', error);
    return { success: false, error: 'Failed to fetch today\'s appointments' };
  }
}

// Server action wrapper for canceling appointments
export async function cancelAppointmentAction(formData: FormData) {
  const appointmentId = formData.get('appointmentId') as string;

  if (!appointmentId) {
    logger.error('Appointment ID is required');
    return;
  }

  await cancelAppointment(appointmentId);
}

// Cancel appointment function
export async function cancelAppointment(appointmentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });

    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    // Check permissions
    if (session.user.role === 'USER' && appointment.userId !== session.user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Update appointment status
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      },
      include: {
        user: { select: { id: true, name: true } },
        guruji: { select: { id: true, name: true } }
      }
    });

    // Emit appointment cancellation event for real-time updates
    await emitAppointmentEvent(
      SocketEventTypes.APPOINTMENT_CANCELLED,
      appointmentId,
      {
        id: updatedAppointment.id,
        userId: updatedAppointment.userId,
        gurujiId: updatedAppointment.gurujiId || '',
        date: updatedAppointment.date.toISOString().split('T')[0],
        time: formatAppointmentTime(updatedAppointment.startTime),
        status: updatedAppointment.status,
        reason: updatedAppointment.reason || '',
        priority: updatedAppointment.priority
      }
    );

    return { success: true };
  } catch (error) {
    logger.error('Cancel appointment error:', error);
    return { success: false, error: 'Failed to cancel appointment' };
  }
}
import { formatAppointmentTime } from "@/lib/utils/time-formatting";

