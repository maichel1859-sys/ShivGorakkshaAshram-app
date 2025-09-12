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
    const queueEntries = await prisma.queueEntry.findMany({
      where: {
        gurujiId,
        status: { in: ['WAITING', 'IN_PROGRESS'] },
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
      },
      orderBy: [
        { status: 'asc' }, // IN_PROGRESS first
        { createdAt: 'asc' }, // Then by creation time
      ],
    });

    return queueEntries;
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
