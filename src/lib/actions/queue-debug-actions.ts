'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';

export async function debugGurujiQueueData() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== 'GURUJI') {
    return { success: false, error: 'Guruji authentication required' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    // Get Guruji's appointments for today
    const appointments = await prisma.appointment.findMany({
      where: {
        gurujiId: session.user.id,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true }
        }
      }
    });

    // Get queue entries for this Guruji
    const queueEntries = await prisma.queueEntry.findMany({
      where: {
        gurujiId: session.user.id,
        status: { in: ['WAITING', 'IN_PROGRESS'] }
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true }
        },
        appointment: {
          select: { id: true, status: true, date: true }
        }
      }
    });

    // Get all queue entries (not filtered by Guruji) to see what's there
    const allQueueEntries = await prisma.queueEntry.findMany({
      where: {
        status: { in: ['WAITING', 'IN_PROGRESS'] }
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true }
        },
        appointment: {
          select: { id: true, status: true, date: true }
        },
        guruji: {
          select: { id: true, name: true }
        }
      }
    });

    return {
      success: true,
      data: {
        sessionUserId: session.user.id,
        sessionUserName: session.user.name,
        appointments: appointments.map(apt => ({
          id: apt.id,
          status: apt.status,
          date: apt.date,
          gurujiId: apt.gurujiId,
          userId: apt.userId,
          user: apt.user
        })),
        myQueueEntries: queueEntries.map(qe => ({
          id: qe.id,
          status: qe.status,
          position: qe.position,
          gurujiId: qe.gurujiId,
          userId: qe.userId,
          appointmentId: qe.appointmentId,
          user: qe.user
        })),
        allQueueEntries: allQueueEntries.map(qe => ({
          id: qe.id,
          status: qe.status,
          position: qe.position,
          gurujiId: qe.gurujiId,
          userId: qe.userId,
          appointmentId: qe.appointmentId,
          user: qe.user,
          guruji: qe.guruji
        }))
      }
    };
  } catch (error) {
    console.error('Debug error:', error);
    return { success: false, error: 'Failed to fetch debug data' };
  }
}