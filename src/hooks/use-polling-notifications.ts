"use client";

import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useQueueStore } from '@/store/queue-store';
import { useNotificationStore } from '@/store/notification-store';
import { useAdaptivePolling } from './use-adaptive-polling';
import { useSocket } from '@/lib/socket/socket-client';
import { useNetworkStatus } from './use-network-status';
import { getCachedQueueStatus, getCachedUserQueueStatus } from '@/lib/services/queue.service';

export function usePollingNotifications() {
  const { data: session } = useSession();
  const { entries, setEntries } = useQueueStore();
  const { addNotification } = useNotificationStore();
  const { connectionStatus } = useSocket();
  const { isOnline } = useNetworkStatus();

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
            userId: session?.user?.id || '',
            title: 'Queue Position Updated',
            message: `You are now position ${userEntry.position} in the queue`,
            type: 'QUEUE',
            read: false,
            createdAt: new Date().toISOString(),
            data: { position: userEntry.position }
          });
        }

        // Check for status changes
        if (userEntry.status !== previousEntry.status) {
          if (userEntry.status === 'IN_PROGRESS') {
            addNotification({
              id: `consultation-ready-${Date.now()}`,
              userId: session?.user?.id || '',
              title: 'Your Turn!',
              message: 'Please proceed to the consultation room immediately',
              type: 'QUEUE',
              read: false,
              createdAt: new Date().toISOString(),
              data: { status: 'IN_PROGRESS' }
            });
          } else if (userEntry.status === 'COMPLETED') {
            addNotification({
              id: `consultation-completed-${Date.now()}`,
              userId: session?.user?.id || '',
              title: 'Consultation Completed',
              message: 'Your consultation has been completed. Thank you!',
              type: 'QUEUE',
              read: false,
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
          userId: session?.user?.id || '',
          title: 'Check-in Successful',
          message: `You are position ${queueEntry.position} in the queue`,
          type: 'QUEUE',
          read: false,
          createdAt: new Date().toISOString(),
          data: { position: queueEntry.position }
        });
      }

      // Check for consultation readiness
      if (queueEntry?.status === 'IN_PROGRESS' && previousEntry?.status === 'WAITING') {
        addNotification({
          id: `consultation-ready-${Date.now()}`,
          userId: session?.user?.id || '',
          title: 'Your Turn!',
          message: 'Please proceed to the consultation room immediately',
          type: 'QUEUE',
          read: false,
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

  // Socket-aware adaptive polling with automatic fallback
  const polling = useAdaptivePolling({
    enabled: !!session?.user,
    interval: connectionStatus.connected ? 30000 : 8000, // Slower when socket works, faster when fallback
    onPoll: pollForUpdates,
    onError: (error) => {
      console.warn('🔌 Polling fallback error:', error);
      // Continue polling even on errors when socket is down
    },
    adaptiveIntervals: {
      IDLE: connectionStatus.connected ? 60000 : 20000,          // 1min vs 20s
      WAITING: connectionStatus.connected ? 30000 : 5000,         // 30s vs 5s
      NEAR_FRONT: connectionStatus.connected ? 15000 : 3000,      // 15s vs 3s
      CONSULTATION: connectionStatus.connected ? 10000 : 2000,    // 10s vs 2s
      BACKGROUND: connectionStatus.connected ? 120000 : 30000,    // 2min vs 30s
    }
  });

  return {
    ...polling,
    checkQueueUpdates,
    checkUserQueueStatus,
    pollForUpdates,
    // Fallback status information
    isUsingFallback: !connectionStatus.connected,
    connectionHealth: {
      isSocketConnected: connectionStatus.connected,
      isOnline,
      socketId: connectionStatus.socketId,
    }
  };
}
