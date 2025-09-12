"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSocket } from "@/lib/socket/socket-client";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useOfflineStore } from "@/store/offline-store";
// import { useAppStore } from "@/store/app-store"; // Unused for now
import { 
  getGurujiQueueEntries,
  getCoordinatorQueueEntries 
} from "@/lib/actions/queue-actions";
import type { 
  QueueEntry, 
  QueueEntryFromDB
  // QueueStats // Unused for now
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
  // const { setLoadingState } = useAppStore(); // Unused for now
  const {
    cacheQueueEntries,
    // queueEntries: offlineQueueEntries, // Unused for now
    // enableOfflineMode // Unused for now
  } = useOfflineStore();

  // Main data query with React Query caching and smart revalidation
  const {
    data: queueEntries = [],
    isLoading,
    refetch,
    dataUpdatedAt,
    isStale,
  } = useQuery({
    queryKey: queueKeys.entries(role),
    queryFn: () => fetchQueueData(role),
    staleTime: connectionStatus.connected ? 120000 : 30000, // Longer stale time when socket is active
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: !connectionStatus.connected, // Only refetch on focus if socket disconnected
    refetchOnReconnect: true,
    refetchInterval: connectionStatus.connected ? refreshInterval * 2 : refreshInterval, // Slower polling when socket is active, normal when disconnected
    refetchIntervalInBackground: connectionStatus.connected ? false : true, // Background polling only when socket is down
    retry: (failureCount) => {
      // Smart retry logic
      if (!isOnline) return false;
      if (connectionStatus.connected) return failureCount < 2;
      return failureCount < 3; // More retries when socket is down
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    enabled: true,
    // Optimistic updates for better UX
    placeholderData: (previousData) => previousData,
    // Structure sharing to prevent unnecessary re-renders
    structuralSharing: true,
  });

  // Socket-based real-time updates
  useEffect(() => {
    if (!enableRealtime || !socket || !connectionStatus.connected) return;

    const handleQueueUpdate = (data: unknown) => {
      console.log('🔄 Queue real-time update received:', data);
      
      // Invalidate and refetch the cache
      queryClient.invalidateQueries({ 
        queryKey: queueKeys.entries(role) 
      });
    };

    // Subscribe to role-specific queue updates
    socket.on('queue_updated', handleQueueUpdate);
    socket.on('entry_added', handleQueueUpdate);
    socket.on('entry_updated', handleQueueUpdate);
    socket.on('entry_removed', handleQueueUpdate);

    return () => {
      socket.off('queue_updated', handleQueueUpdate);
      socket.off('entry_added', handleQueueUpdate);
      socket.off('entry_updated', handleQueueUpdate);
      socket.off('entry_removed', handleQueueUpdate);
    };
  }, [socket, connectionStatus.connected, enableRealtime, role, queryClient]);

  // Fallback polling when socket is disconnected
  useEffect(() => {
    if (!autoRefresh) return;
    
    // If socket is not connected but we're online, use faster polling
    const shouldUseFastPolling = !connectionStatus.connected && isOnline;
    const pollingInterval = shouldUseFastPolling ? refreshInterval / 2 : refreshInterval;

    if (shouldUseFastPolling) {
      console.log('⚠️ Socket disconnected, using fallback polling every', pollingInterval, 'ms');
      
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