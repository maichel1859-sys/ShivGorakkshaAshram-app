"use client";

import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useQueueStore } from '@/store/queue-store';
import { useNotificationStore } from '@/store/notification-store';
import { useAdaptivePolling } from './use-adaptive-polling';
import { getCachedQueueStatus, getCachedUserQueueStatus } from '@/lib/services/queue.service';

export function usePollingNotifications() {
  const { data: session } = useSession();
  const { entries, setEntries } = useQueueStore();
  const { addNotification } = useNotificationStore();

  // Check for queue updates and notifications
  const checkQueueUpdates = useCallback(async () => {
    if (!session?.user) return;

    try {
      // Get current queue status
      const queueStatus = await getCachedQueueStatus();
      const currentQueue = queueStatus.currentQueue || [];
      
      // Find user's current entry
      const userEntry = currentQueue.find(entry => entry.userId === session.user.id);
      const previousEntry = entries.find(entry => entry.userId === session.user.id);

      // Check for position changes
      if (userEntry && previousEntry) {
        if (userEntry.position !== previousEntry.position) {
          addNotification({
            id: `position-change-${Date.now()}`,
            title: 'Queue Position Updated',
            message: `You are now position ${userEntry.position} in the queue`,
            type: 'queue',
            priority: 'MEDIUM',
            isRead: false,
            createdAt: new Date().toISOString(),
            data: { position: userEntry.position }
          });
        }

        // Check for status changes
        if (userEntry.status !== previousEntry.status) {
          if (userEntry.status === 'IN_PROGRESS') {
            addNotification({
              id: `consultation-ready-${Date.now()}`,
              title: 'Your Turn!',
              message: 'Please proceed to the consultation room immediately',
              type: 'queue',
              priority: 'HIGH',
              isRead: false,
              createdAt: new Date().toISOString(),
              data: { status: 'IN_PROGRESS' }
            });
          } else if (userEntry.status === 'COMPLETED') {
            addNotification({
              id: `consultation-completed-${Date.now()}`,
              title: 'Consultation Completed',
              message: 'Your consultation has been completed. Thank you!',
              type: 'queue',
              priority: 'MEDIUM',
              isRead: false,
              createdAt: new Date().toISOString(),
              data: { status: 'COMPLETED' }
            });
          }
        }
      }

      // Update queue entries
      const transformedEntries = currentQueue.map(entry => ({
        id: entry.id,
        userId: entry.userId,
        userName: entry.user.name || 'Unknown User',
        gurujiId: entry.gurujiId || '',
        gurujiName: entry.guruji?.name || 'Unknown Guruji',
        appointmentId: undefined, // Not available in cached version
        status: entry.status as 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
        priority: entry.priority as 'LOW' | 'MEDIUM' | 'HIGH',
        position: entry.position,
        estimatedWaitTime: queueStatus.estimatedWaitTime,
        checkedInAt: entry.createdAt.toISOString(),
        notes: undefined // Not available in cached version
      }));

      setEntries(transformedEntries);

    } catch (error) {
      console.error('Error checking queue updates:', error);
    }
  }, [session?.user, entries, setEntries, addNotification]);

  // Check for user-specific queue status
  const checkUserQueueStatus = useCallback(async () => {
    if (!session?.user) return;

    try {
      const queueEntry = await getCachedUserQueueStatus(session.user.id);
      const previousEntry = entries.find(entry => entry.userId === session.user.id);

      // Check for new queue entry
      if (queueEntry && !previousEntry) {
        addNotification({
          id: `checkin-success-${Date.now()}`,
          title: 'Check-in Successful',
          message: `You are position ${queueEntry.position} in the queue`,
          type: 'queue',
          priority: 'MEDIUM',
          isRead: false,
          createdAt: new Date().toISOString(),
          data: { position: queueEntry.position }
        });
      }

      // Check for consultation readiness
      if (queueEntry?.status === 'IN_PROGRESS' && previousEntry?.status === 'WAITING') {
        addNotification({
          id: `consultation-ready-${Date.now()}`,
          title: 'Your Turn!',
          message: 'Please proceed to the consultation room immediately',
          type: 'queue',
          priority: 'HIGH',
          isRead: false,
          createdAt: new Date().toISOString(),
          data: { status: 'IN_PROGRESS' }
        });
      }

    } catch (error) {
      console.error('Error checking user queue status:', error);
    }
  }, [session?.user, entries, addNotification]);

  // Combined polling function
  const pollForUpdates = useCallback(async () => {
    await Promise.all([
      checkQueueUpdates(),
      checkUserQueueStatus()
    ]);
  }, [checkQueueUpdates, checkUserQueueStatus]);

  // Use adaptive polling
  const polling = useAdaptivePolling({
    enabled: !!session?.user,
    interval: 15000, // Default 15 seconds
    onPoll: pollForUpdates,
    onError: (error) => {
      console.error('Polling error:', error);
    }
  });

  return {
    ...polling,
    checkQueueUpdates,
    checkUserQueueStatus,
    pollForUpdates
  };
}
