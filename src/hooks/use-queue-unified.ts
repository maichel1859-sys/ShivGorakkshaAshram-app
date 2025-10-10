"use client";
import { logger } from '@/lib/logger';

import { useEffect, useMemo, useCallback, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSocket } from "@/lib/socket/socket-client";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useOfflineStore } from "@/store/offline-store";
import { 
  getGurujiQueueEntries,
  getCoordinatorQueueEntries,
  startConsultation,
  completeConsultation,
  updateQueueStatus
} from "@/lib/actions/queue-actions";
import type { 
  QueueEntry, 
  QueueEntryFromDB
} from "@/types/queue";

export type QueueRole = 'admin' | 'coordinator' | 'guruji' | 'user';

interface UseQueueOptions {
  role: QueueRole;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealtime?: boolean;
}

// Unified query keys for all queue operations
export const queueKeys = {
  all: ['queue'] as const,
  role: (role: QueueRole) => [...queueKeys.all, role] as const,
  entries: (role: QueueRole) => [...queueKeys.role(role), 'entries'] as const,
  stats: (role: QueueRole) => [...queueKeys.role(role), 'stats'] as const,
};

// Transform database entry to frontend interface
const transformQueueEntry = (entry: QueueEntryFromDB, index: number): QueueEntry => ({
  id: entry.id,
  position: entry.position || index + 1,
  status: entry.status as QueueEntry['status'],
  estimatedWait: entry.estimatedWait || (index + 1) * 15,
  priority: (entry.priority as QueueEntry['priority']) || 'NORMAL',
  checkedInAt: typeof entry.checkedInAt === 'string' 
    ? entry.checkedInAt 
    : entry.checkedInAt.toISOString(),
  notes: entry.notes || undefined,
  user: {
    id: entry.user.id,
    name: entry.user.name,
    phone: entry.user.phone,
    email: entry.user.email || undefined,
    dateOfBirth: entry.user.dateOfBirth 
      ? (typeof entry.user.dateOfBirth === 'string' 
         ? entry.user.dateOfBirth 
         : entry.user.dateOfBirth.toISOString())
      : undefined,
  },
  guruji: entry.guruji ? {
    id: entry.guruji.id,
    name: entry.guruji.name,
  } : undefined,
  appointment: entry.appointment ? {
    id: entry.appointment.id,
    date: typeof entry.appointment.date === 'string' 
      ? entry.appointment.date 
      : entry.appointment.date.toISOString(),
    startTime: entry.appointment.startTime,
    endTime: entry.appointment.endTime,
    reason: entry.appointment.reason,
  } : undefined,
});

// Role-based data fetcher
const fetchQueueData = async (role: QueueRole) => {
  let result: { success: boolean; queueEntries?: QueueEntryFromDB[]; error?: string };

  switch (role) {
    case 'guruji':
      result = await getGurujiQueueEntries();
      break;
    case 'coordinator':
    case 'admin':
      result = await getCoordinatorQueueEntries();
      break;
    case 'user':
      // Users see limited data
      result = { success: true, queueEntries: [] };
      break;
    default:
      throw new Error(`Invalid role: ${role}`);
  }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch queue data');
  }

  return result.queueEntries?.map(transformQueueEntry) || [];
};

/**
 * Unified queue hook with React Query caching and socket fallback
 */
export const useQueueUnified = (options: UseQueueOptions) => {
  const {
    role,
    autoRefresh = true,
    refreshInterval = 30000,
    enableRealtime = true,
  } = options;

  const queryClient = useQueryClient();
  const { socket, connectionStatus } = useSocket();
  const { isOnline } = useNetworkStatus();
  const {
    cacheQueueEntries,
  } = useOfflineStore();

  // Enhanced fallback state tracking
  const [fallbackState, setFallbackState] = useState({
    isUsingFallback: false,
    fallbackReason: null as string | null,
    lastSocketMessage: null as Date | null,
    retryCount: 0,
  });

  // Dynamic polling interval based on connection health
  const getPollingInterval = useCallback(() => {
    if (!isOnline) return 30000; // 30s when offline
    if (connectionStatus.connected && fallbackState.lastSocketMessage) {
      const timeSinceLastMessage = Date.now() - fallbackState.lastSocketMessage.getTime();
      if (timeSinceLastMessage > 60000) {
        // No socket message for 1 min, treat as unhealthy
        return refreshInterval / 2; // Faster polling
      }
      return refreshInterval * 2; // Slower when socket is healthy
    }
    if (connectionStatus.connected) return refreshInterval;
    return Math.max(refreshInterval / 3, 5000); // Fast fallback, min 5s
  }, [connectionStatus.connected, isOnline, refreshInterval, fallbackState.lastSocketMessage]);

  // Main data query with enhanced smart revalidation
  const {
    data: queueEntries = [],
    isLoading,
    refetch,
    dataUpdatedAt,
    isStale,
  } = useQuery({
    queryKey: queueKeys.entries(role),
    queryFn: () => fetchQueueData(role),
    staleTime: connectionStatus.connected && !fallbackState.isUsingFallback ? 60000 : 10000, // Reduced stale time
    gcTime: 5 * 60 * 1000, // Reduced cache time for better memory usage
    refetchOnWindowFocus: false, // Disabled for better performance
    refetchOnReconnect: true,
    refetchInterval: autoRefresh ? getPollingInterval() : false,
    refetchIntervalInBackground: fallbackState.isUsingFallback || !connectionStatus.connected,
    retry: (failureCount, error) => {
      // Enhanced retry logic with fallback awareness
      if (!isOnline) return false;

      // Reduced retry attempts for faster failure detection
      const maxRetries = fallbackState.isUsingFallback ? 3 : 2;

      // Don't retry if it's an auth error
      if (error?.message?.includes('Authentication')) return false;

      return failureCount < maxRetries;
    },
    retryDelay: (attemptIndex) => {
      // Faster retry when using fallback
      const baseDelay = fallbackState.isUsingFallback ? 300 : 500;
      return Math.min(baseDelay * 2 ** attemptIndex, 5000); // Reduced max delay
    },
    enabled: true,
    placeholderData: (previousData) => previousData,
    structuralSharing: true,
    // Performance optimizations
    notifyOnChangeProps: ['data', 'error', 'isLoading'], // Only re-render on these changes
  });

  // Socket-based real-time updates with enhanced fallback state management
  useEffect(() => {
    if (!enableRealtime || !socket || !connectionStatus.connected) {
      // Update fallback state when socket is not available
      setFallbackState(prev => ({
        ...prev,
        isUsingFallback: true,
        fallbackReason: !socket ? 'Socket not initialized' : 'Socket disconnected',
      }));
      return;
    }

    const handleQueueUpdate = (data: unknown) => {
      logger.debug('ðŸ”„ Queue real-time update received:', data);

      // Update fallback state - socket is working
      setFallbackState(prev => ({
        ...prev,
        isUsingFallback: false,
        fallbackReason: null,
        lastSocketMessage: new Date(),
        retryCount: 0,
      }));

      // Invalidate and refetch the cache
      queryClient.invalidateQueries({
        queryKey: queueKeys.entries(role),
        exact: true, // Only invalidate exact matches
      });
    };

    // Subscribe to role-specific queue updates
    socket.on('queue_updated', handleQueueUpdate);
    socket.on('queue_entry_added', handleQueueUpdate);
    socket.on('queue_entry_updated', handleQueueUpdate);
    socket.on('queue_entry_removed', handleQueueUpdate);
    socket.on('guruji_queue_updated', handleQueueUpdate);
    socket.on('checkin_update', handleQueueUpdate);
    socket.on('appointment_booking', handleQueueUpdate);
    socket.on('appointment_cancellation', handleQueueUpdate);
    socket.on('appointment_created_for_user', handleQueueUpdate);

    return () => {
      socket.off('queue_updated', handleQueueUpdate);
      socket.off('queue_entry_added', handleQueueUpdate);
      socket.off('queue_entry_updated', handleQueueUpdate);
      socket.off('queue_entry_removed', handleQueueUpdate);
      socket.off('guruji_queue_updated', handleQueueUpdate);
      socket.off('checkin_update', handleQueueUpdate);
      socket.off('appointment_booking', handleQueueUpdate);
      socket.off('appointment_cancellation', handleQueueUpdate);
      socket.off('appointment_created_for_user', handleQueueUpdate);
    };
  }, [socket, connectionStatus.connected, enableRealtime, role, queryClient]);

  // Fallback polling when socket is disconnected
  useEffect(() => {
    if (!autoRefresh) return;
    
    // If socket is not connected but we're online, use faster polling
    const shouldUseFastPolling = !connectionStatus.connected && isOnline;
    const pollingInterval = shouldUseFastPolling ? refreshInterval / 2 : refreshInterval;

    if (shouldUseFastPolling) {
      logger.debug('âš ï¸ Socket disconnected, using fallback polling every', pollingInterval, 'ms');
      
      const interval = setInterval(() => {
        refetch();
      }, pollingInterval);
      
      return () => clearInterval(interval);
    }
  }, [connectionStatus.connected, isOnline, autoRefresh, refreshInterval, refetch]);

  // Offline data caching
  useEffect(() => {
    if (queueEntries.length > 0 && isOnline) {
      // Cache successful data for offline use
      const offlineEntries = queueEntries.map(entry => ({
        id: entry.id,
        userId: entry.user.id,
        position: entry.position,
        status: entry.status,
        checkedInAt: entry.checkedInAt,
        estimatedWaitTime: entry.estimatedWait || undefined,
        lastModified: new Date().toISOString()
      }));
      cacheQueueEntries(offlineEntries);
    }
  }, [queueEntries, isOnline, cacheQueueEntries]);

  // Calculate stats (moved to memoized version below)

  // Connection status notifications
  useEffect(() => {
    if (!connectionStatus.connected && isOnline) {
      toast.warning('Connection lost - using fallback mode');
    } else if (connectionStatus.connected && isOnline) {
      toast.success('Connection restored');
    }
  }, [connectionStatus.connected, isOnline]);

  // Queue management mutations
  const startConsultationMutation = useMutation({
    mutationFn: async (queueEntryId: string) => {
      const formData = new FormData();
      formData.append('queueEntryId', queueEntryId);
      const result = await startConsultation(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to start consultation');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Consultation started successfully');
      queryClient.invalidateQueries({ queryKey: queueKeys.entries(role) });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to start consultation');
    },
  });

  const completeConsultationMutation = useMutation({
    mutationFn: async (queueEntryId: string) => {
      const formData = new FormData();
      formData.append('queueEntryId', queueEntryId);
      const result = await completeConsultation(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to complete consultation');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Consultation completed successfully');
      queryClient.invalidateQueries({ queryKey: queueKeys.entries(role) });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to complete consultation');
    },
  });

  const updateQueueStatusMutation = useMutation({
    mutationFn: async ({ queueEntryId, status }: { queueEntryId: string; status: string }) => {
      const formData = new FormData();
      formData.append('queueEntryId', queueEntryId);
      formData.append('status', status);
      const result = await updateQueueStatus(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update queue status');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Queue status updated successfully');
      queryClient.invalidateQueries({ queryKey: queueKeys.entries(role) });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update queue status');
    },
  });

  // Optimistic update mutation for queue status changes
  const updateQueueEntryMutation = useMutation({
    mutationFn: async ({ entryId, updates }: { entryId: string; updates: Partial<QueueEntry> }) => {
      // This would call the actual API to update the entry
      // For now, we'll simulate the update
      return { ...updates, id: entryId };
    },
    onMutate: async ({ entryId, updates }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queueKeys.entries(role) });

      // Snapshot the previous value
      const previousQueueEntries = queryClient.getQueryData<QueueEntry[]>(queueKeys.entries(role));

      // Optimistically update to the new value
      if (previousQueueEntries) {
        const updatedEntries = previousQueueEntries.map(entry =>
          entry.id === entryId ? { ...entry, ...updates } : entry
        );
        queryClient.setQueryData(queueKeys.entries(role), updatedEntries);
      }

      // Return a context object with the snapshotted value
      return { previousQueueEntries };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousQueueEntries) {
        queryClient.setQueryData(queueKeys.entries(role), context.previousQueueEntries);
      }
      toast.error('Failed to update queue entry');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: queueKeys.entries(role) });
    },
  });

  // Background data sync when coming back online
  useEffect(() => {
    if (isOnline && !connectionStatus.connected) {
      // We're online but socket is disconnected - force a background sync
      queryClient.invalidateQueries({ queryKey: queueKeys.entries(role) });
    }
  }, [isOnline, connectionStatus.connected, queryClient, role]);

  // Preemptive cache warming for related data
  useEffect(() => {
    if (queueEntries.length > 0) {
      // Pre-fetch related data that might be needed
      queueEntries.forEach((entry) => {
        if (entry.appointment?.id) {
          // Prefetch appointment details if available
          queryClient.prefetchQuery({
            queryKey: ['appointment', entry.appointment.id],
            queryFn: () => {
              // This would fetch appointment details
              return null;
            },
            staleTime: 5 * 60 * 1000, // 5 minutes
          });
        }
      });
    }
  }, [queueEntries, queryClient]);

  // Smart cache invalidation based on data staleness
  const smartInvalidateCache = useCallback(() => {
    const now = Date.now();
    const maxStaleTime = connectionStatus.connected ? 60000 : 30000;
    
    if (now - dataUpdatedAt > maxStaleTime) {
      queryClient.invalidateQueries({ queryKey: queueKeys.entries(role) });
    }
  }, [dataUpdatedAt, connectionStatus.connected, queryClient, role]);

  // Memoized stats calculation to prevent unnecessary recalculations
  const memoizedStats = useMemo(() => {
    const waiting = queueEntries.filter(entry => entry.status === 'WAITING').length;
    const inProgress = queueEntries.filter(entry => entry.status === 'IN_PROGRESS').length;
    const completed = queueEntries.filter(entry => entry.status === 'COMPLETED').length;
    const cancelled = queueEntries.filter(entry => entry.status === 'CANCELLED').length;
    const total = queueEntries.length;
    const averageWaitTime = total > 0 
      ? queueEntries.reduce((sum, entry) => sum + (entry.estimatedWait || 0), 0) / total
      : 0;

    return {
      waiting,
      inProgress,
      completed,
      cancelled,
      total,
      averageWaitTime,
    };
  }, [queueEntries]);

  return {
    // Core data
    queueEntries,
    loading: isLoading,
    stats: memoizedStats,
    
    // Data freshness
    dataUpdatedAt,
    isStale,
    lastSuccessfulFetch: dataUpdatedAt,
    
    // Actions
    refetch,
    optimisticUpdate: updateQueueEntryMutation.mutate,
    
    // Queue management mutations
    startConsultation: startConsultationMutation.mutate,
    completeConsultation: completeConsultationMutation.mutate,
    updateQueueStatus: updateQueueStatusMutation.mutate,
    
    // Mutation states
    isStartingConsultation: startConsultationMutation.isPending,
    isCompletingConsultation: completeConsultationMutation.isPending,
    isUpdatingStatus: updateQueueStatusMutation.isPending,
    
    // Connection status
    isConnected: connectionStatus.connected,
    isOnline,
    
    // Advanced cache management
    invalidateCache: () => queryClient.invalidateQueries({ queryKey: queueKeys.entries(role) }),
    clearCache: () => queryClient.removeQueries({ queryKey: queueKeys.entries(role) }),
    smartInvalidateCache,
    
    // Background operations
    prefetchRelatedData: () => {
      // Prefetch data that might be needed soon
      if (role === 'coordinator') {
        queryClient.prefetchQuery({
          queryKey: queueKeys.entries('admin'),
          queryFn: () => fetchQueueData('admin'),
          staleTime: 2 * 60 * 1000, // 2 minutes
        });
      }
    },
    
    // Cache utilities
    getCachedData: (role: QueueRole) => queryClient.getQueryData<QueueEntry[]>(queueKeys.entries(role)),
    setCachedData: (role: QueueRole, data: QueueEntry[]) => 
      queryClient.setQueryData(queueKeys.entries(role), data),
  };
};

