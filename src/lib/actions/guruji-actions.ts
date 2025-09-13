'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';

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