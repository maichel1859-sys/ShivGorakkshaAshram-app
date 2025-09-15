'use server';

import { unstable_cache as cache } from 'next/cache';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/database/prisma';
import { CACHE_TAGS, CACHE_TIMES } from '@/lib/cache';

// Cached queue status with short TTL for real-time updates
export const getCachedQueueStatus = cache(
  async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [waitingCount, inProgressCount, completedToday, totalToday] = await Promise.all([
      prisma.queueEntry.count({
        where: { status: 'WAITING' },
      }),
      prisma.queueEntry.count({
        where: { status: 'IN_PROGRESS' },
      }),
      prisma.queueEntry.count({
        where: {
          status: 'COMPLETED',
          updatedAt: { gte: today },
        },
      }),
      prisma.queueEntry.count({
        where: {
          createdAt: { gte: today },
        },
      }),
    ]);

    const currentQueue = await prisma.queueEntry.findMany({
      where: {
        status: { in: ['WAITING', 'IN_PROGRESS'] },
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
      orderBy: [
        { status: 'asc' }, // IN_PROGRESS first
        { createdAt: 'asc' }, // Then by creation time
      ],
    });

    const estimatedWaitTime = waitingCount * 15; // 15 minutes per person

    return {
      waiting: waitingCount,
      inProgress: inProgressCount,
      completedToday,
      totalToday,
      estimatedWaitTime,
      currentQueue,
    };
  },
  ['queue-status'],
  {
    tags: [CACHE_TAGS.queue],
    revalidate: CACHE_TIMES.SHORT, // 1 minute cache
  }
);

// Cached user queue status
export const getCachedUserQueueStatus = cache(
  async (userId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const queueEntry = await prisma.queueEntry.findFirst({
      where: {
        userId,
        createdAt: { gte: today, lt: tomorrow },
        status: { in: ['WAITING', 'IN_PROGRESS'] },
      },
      include: {
        guruji: {
          select: {
            name: true,
          },
        },
      },
    });

    return queueEntry;
  },
  ['user-queue-status'],
  {
    tags: [CACHE_TAGS.queue],
    revalidate: CACHE_TIMES.SHORT, // 1 minute cache
  }
);

// Cached guruji queue entries
export const getCachedGurujiQueueEntries = cache(
  async (gurujiId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get active queue entries
    const queueEntries = await prisma.queueEntry.findMany({
      where: {
        AND: [
          { status: { in: ['WAITING', 'IN_PROGRESS'] } },
          {
            OR: [
              { gurujiId }, // Entries assigned to this Guruji
              { gurujiId: null, status: 'WAITING' }, // Unassigned waiting entries that any Guruji can pick up
            ],
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            dateOfBirth: true,
          },
        },
        guruji: {
          select: {
            id: true,
            name: true,
          },
        },
        appointment: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            reason: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // IN_PROGRESS first
        { createdAt: 'asc' }, // Then by creation time
      ],
    });

    // Also get checked-in appointments that don't have active queue entries
    const checkedInAppointments = await prisma.appointment.findMany({
      where: {
        gurujiId,
        status: 'CHECKED_IN',
        date: {
          gte: today,
          lt: tomorrow
        },
        // Only include appointments that don't already have an active queue entry
        OR: [
          {
            queueEntry: null // No queue entry at all
          },
          {
            queueEntry: {
              status: { notIn: ['WAITING', 'IN_PROGRESS', 'COMPLETED'] } // Has queue entry but not active or completed
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            dateOfBirth: true,
          },
        },
        guruji: {
          select: {
            id: true,
            name: true,
          },
        },
        queueEntry: {
          select: {
            position: true,
            estimatedWait: true,
            checkedInAt: true,
            notes: true,
            status: true
          }
        }
      },
      orderBy: { checkedInAt: 'asc' }
    });

    // Convert checked-in appointments to queue entry format
    const virtualQueueEntries = checkedInAppointments.map((appointment, index) => {
      const existingQueueEntry = appointment.queueEntry;
      return {
        id: `virtual-${appointment.id}`,
        appointmentId: appointment.id,
        userId: appointment.userId,
        gurujiId: appointment.gurujiId,
        status: 'WAITING' as const,
        position: (queueEntries.length + index + 1),
        estimatedWait: existingQueueEntry?.estimatedWait || ((queueEntries.length + index + 1) * 15),
        checkedInAt: appointment.checkedInAt || existingQueueEntry?.checkedInAt || new Date(),
        notes: existingQueueEntry?.notes || `Checked in for appointment`,
        priority: appointment.priority || 'NORMAL',
        createdAt: appointment.checkedInAt || new Date(),
        updatedAt: new Date(),
        user: appointment.user,
        guruji: appointment.guruji,
        appointment: {
          id: appointment.id,
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          reason: appointment.reason
        }
      };
    });

    // Combine and sort all entries
    const allEntries = [...queueEntries, ...virtualQueueEntries].sort((a, b) => {
      // IN_PROGRESS first
      if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
      if (b.status === 'IN_PROGRESS' && a.status !== 'IN_PROGRESS') return 1;

      // Then by creation/check-in time
      const aTime = a.checkedInAt || a.createdAt;
      const bTime = b.checkedInAt || b.createdAt;
      return aTime.getTime() - bTime.getTime();
    });

    return allEntries;
  },
  ['guruji-queue-entries'],
  {
    tags: [CACHE_TAGS.queue],
    revalidate: CACHE_TIMES.SHORT, // 1 minute cache
  }
);

// Cache invalidation functions
export const invalidateQueueCache = async (userId?: string, gurujiId?: string) => {
  revalidateTag(CACHE_TAGS.queue);
  revalidateTag(CACHE_TAGS.dashboard);
  
  // Invalidate specific user and guruji cache tags if provided
  if (userId) {
    revalidateTag(`${CACHE_TAGS.queue}-user-${userId}`);
    revalidateTag(`${CACHE_TAGS.dashboard}-user-${userId}`);
  }
  
  if (gurujiId) {
    revalidateTag(`${CACHE_TAGS.queue}-guruji-${gurujiId}`);
    revalidateTag(`${CACHE_TAGS.dashboard}-guruji-${gurujiId}`);
  }
};
