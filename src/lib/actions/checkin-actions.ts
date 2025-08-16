'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Schemas
const qrCheckinSchema = z.object({
  qrCode: z.string().min(1, "QR code is required"),
});

const manualCheckinSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required"),
  notes: z.string().optional(),
});

// Check-in via QR code
export async function checkInWithQR(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const data = qrCheckinSchema.parse({
      qrCode: formData.get('qrCode'),
    });

    // Find appointment by QR code
    const appointment = await prisma.appointment.findFirst({
      where: {
        qrCode: data.qrCode,
        status: { in: ['BOOKED', 'CONFIRMED'] },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        guruji: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!appointment) {
      return { success: false, error: 'Invalid QR code or appointment not found' };
    }

    // Check if appointment is for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(appointment.date);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate.getTime() !== today.getTime()) {
      return { success: false, error: 'Appointment is not for today' };
    }

    // Check if already checked in
    if (appointment.status === 'CHECKED_IN') {
      return { success: false, error: 'Appointment already checked in' };
    }

    // Update appointment status
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
      },
      include: {
        user: true,
        guruji: true,
      },
    });

    // Create queue entry
    // Note: Queue entry creation is temporarily disabled until database migration is complete
    // const queueEntry = await prisma.queueEntry.create({
    //   data: {
    //     userId: session.user.id,
    //     gurujiId: appointment.gurujiId,
    //     appointmentId: appointment.id,
    //     position: 1, // You might want to calculate this based on existing queue
    //     status: 'WAITING',
    //     estimatedWait: 15, // Default 15 minutes
    //     notes: 'Checked in via QR code',
    //     checkedInAt: new Date(),
    //   },
    // });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: appointment.userId,
        title: 'Check-in Successful',
        message: `You have been successfully checked in for your appointment with ${appointment.guruji?.name || 'Guruji'}`,
        type: 'appointment',
        data: {
          appointmentId: appointment.id,
          // queueEntryId: queueEntry.id, // Temporarily disabled
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "APPOINTMENT_CHECKED_IN",
        resource: "APPOINTMENT",
        resourceId: appointment.id,
        oldData: { status: appointment.status },
        newData: { status: 'CHECKED_IN', checkedInAt: new Date() },
      },
    });

    revalidatePath('/coordinator');
    revalidatePath('/user/checkin');
    
    return {
      success: true,
      message: 'Check-in successful',
      appointment: updatedAppointment,
    };
  } catch (error) {
    console.error('QR check-in error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to check in' };
  }
}

// Manual check-in
export async function manualCheckIn(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only coordinators and admins can perform manual check-ins
  if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const data = manualCheckinSchema.parse({
      appointmentId: formData.get('appointmentId'),
      notes: formData.get('notes') || undefined,
    });

    // Find appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        guruji: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    // Check if already checked in
    if (appointment.status === 'CHECKED_IN') {
      return { success: false, error: 'Appointment already checked in' };
    }

    // Check if appointment is for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(appointment.date);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate.getTime() !== today.getTime()) {
      return { success: false, error: 'Appointment is not for today' };
    }

    // Update appointment status
    const updatedAppointment = await prisma.appointment.update({
      where: { id: data.appointmentId },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
      },
      include: {
        user: true,
        guruji: true,
      },
    });

    // Create queue entry
    // Note: Queue entry creation is temporarily disabled until database migration is complete
    // const queueEntry = await prisma.queueEntry.create({
    //   data: {
    //     userId: session.user.id,
    //     gurujiId: appointment.gurujiId,
    //     appointmentId: data.appointmentId,
    //     position: 1, // You might want to calculate this based on existing queue
    //     status: 'WAITING',
    //     estimatedWait: 15, // Default 15 minutes
    //     notes: 'Checked in manually',
    //     checkedInAt: new Date(),
    //   },
    // });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: appointment.userId,
        title: 'Check-in Successful',
        message: `You have been successfully checked in for your appointment with ${appointment.guruji?.name || 'Guruji'}`,
        type: 'appointment',
        data: {
          appointmentId: data.appointmentId,
          // queueEntryId: queueEntry.id, // Temporarily disabled
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "MANUAL_CHECKIN",
        resource: "APPOINTMENT",
        resourceId: data.appointmentId,
        oldData: { status: appointment.status },
        newData: { 
          status: 'CHECKED_IN', 
          checkedInAt: new Date(),
          notes: data.notes,
        },
      },
    });

    revalidatePath('/coordinator');
    revalidatePath('/user/checkin');
    
    return {
      success: true,
      message: 'Manual check-in successful',
      appointment: updatedAppointment,
    };
  } catch (error) {
    console.error('Manual check-in error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to check in' };
  }
}

// Get check-in history
export async function getCheckInHistory(options?: {
  userId?: string;
  date?: string;
  limit?: number;
  offset?: number;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const { userId, date, limit = 20, offset = 0 } = options || {};

    const whereClause: Prisma.AppointmentWhereInput = {
      status: 'CHECKED_IN',
    };

    // Filter by user if specified (admin/coordinator can see all, users see only their own)
    if (userId) {
      whereClause.userId = userId;
    } else if (session.user.role === 'USER') {
      whereClause.userId = session.user.id;
    }

    // Filter by date if specified
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      whereClause.checkedInAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const [checkins, total] = await Promise.all([
      prisma.appointment.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          guruji: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { checkedInAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.appointment.count({ where: whereClause }),
    ]);

    return {
      success: true,
      data: {
        checkins,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    };
  } catch (error) {
    console.error('Get check-in history error:', error);
    return { success: false, error: 'Failed to fetch check-in history' };
  }
}

// Get today's check-ins
export async function getTodayCheckIns() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const whereClause: Prisma.AppointmentWhereInput = {
      status: 'CHECKED_IN',
      checkedInAt: {
        gte: today,
        lte: endOfDay,
      },
    };

    // Users see only their own check-ins
    if (session.user.role === 'USER') {
      whereClause.userId = session.user.id;
    }

    const checkins = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        guruji: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { checkedInAt: 'desc' },
    });

    return {
      success: true,
      data: {
        checkins,
        count: checkins.length,
      },
    };
  } catch (error) {
    console.error('Get today check-ins error:', error);
    return { success: false, error: 'Failed to fetch today\'s check-ins' };
  }
}

// Get check-in statistics
export async function getCheckInStats(options?: {
  dateFrom?: string;
  dateTo?: string;
  gurujiId?: string;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'COORDINATOR') {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const { dateFrom, dateTo, gurujiId } = options || {};
    
    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const endDate = dateTo ? new Date(dateTo) : new Date();

    const whereClause: Prisma.AppointmentWhereInput = {
      status: 'CHECKED_IN',
      checkedInAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (gurujiId) {
      whereClause.gurujiId = gurujiId;
    }

    const [totalCheckins, checkinsByDate, checkinsByGuruji] = await Promise.all([
      // Total check-ins
      prisma.appointment.count({ where: whereClause }),
      
      // Check-ins by date
      prisma.appointment.groupBy({
        by: ['date'],
        where: whereClause,
        _count: { id: true },
        orderBy: { date: 'asc' },
      }),
      
      // Check-ins by guruji
      prisma.appointment.groupBy({
        by: ['gurujiId'],
        where: whereClause,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    // Get guruji names for the stats
    const gurujiIds = checkinsByGuruji.map(stat => stat.gurujiId).filter((id): id is string => id !== null);
    const gurujis = await prisma.user.findMany({
      where: { id: { in: gurujiIds } },
      select: { id: true, name: true },
    });

    const gurujiStats = checkinsByGuruji.map(stat => {
      const guruji = gurujis.find(g => g.id === stat.gurujiId);
      return {
        gurujiId: stat.gurujiId,
        gurujiName: guruji?.name || 'Unknown',
        count: stat._count.id,
      };
    });

    return {
      success: true,
      data: {
        totalCheckins,
        dateRange: {
          from: startDate.toISOString(),
          to: endDate.toISOString(),
        },
        checkinsByDate: checkinsByDate.map(stat => ({
          date: stat.date.toISOString().split('T')[0],
          count: stat._count.id,
        })),
        checkinsByGuruji: gurujiStats,
      },
    };
  } catch (error) {
    console.error('Get check-in stats error:', error);
    return { success: false, error: 'Failed to fetch check-in statistics' };
  }
} 