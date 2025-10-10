"use server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/prisma';
import { logger } from '@/lib/utils/logger';

export async function getUserQueueStatusSimple() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Authentication required' };
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const queueEntry = await prisma.queueEntry.findFirst({
      where: {
        userId: session.user.id,
        createdAt: { gte: today, lt: tomorrow },
        status: { in: ['WAITING', 'IN_PROGRESS'] },
      },
      include: { guruji: { select: { name: true } } },
    });
    return { success: true, data: queueEntry || null };
  } catch (error) {
    logger.error('Get queue status error:', error);
    return { success: false, error: 'Failed to get queue status' };
  }
}

export async function getTodayAppointmentWithTimeWindow() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'Authentication required' };
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const appointment = await prisma.appointment.findFirst({
      where: { userId: session.user.id, date: { gte: today, lt: tomorrow }, status: { in: ['BOOKED', 'CONFIRMED'] } },
      include: { guruji: true },
    });
    if (!appointment) return { success: false, error: 'No appointment found for today' };
    const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
    const apptTime = normalize(new Date(appointment.startTime));
    const timeWindowStart = new Date(apptTime.getTime() - 20 * 60 * 1000);
    const timeWindowEnd = new Date(apptTime.getTime() + 15 * 60 * 1000);
    const now = new Date();
    const isInTimeWindow = now >= timeWindowStart && now <= timeWindowEnd;
    return {
      success: true,
      data: {
        appointment,
        timeWindow: {
          start: timeWindowStart,
          end: timeWindowEnd,
          isInTimeWindow,
          canCheckIn: isInTimeWindow,
          minutesUntilWindow: Math.max(0, Math.round((timeWindowStart.getTime() - now.getTime()) / 60000)),
          minutesUntilAppointment: Math.max(0, Math.round((apptTime.getTime() - now.getTime()) / 60000)),
          config: { beforeAppointment: 20, afterAppointment: 15 },
        },
      },
    };
  } catch (error) {
    logger.error('Get today appointment with time window error:', error);
    return { success: false, error: 'Failed to get appointment information' };
  }
}
