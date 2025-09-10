"use client";

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket, SocketEvents } from '@/lib/socket/socket-client';
import { toast } from 'sonner';

// Queue entry interface
interface QueueEntry {
  id: string;
  appointmentId: string;
  userId: string;
  gurujiId?: string | null;
  position: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'LATE_ARRIVAL';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  estimatedWait?: number | null;
  checkedInAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  guruji?: {
    id: string;
    name: string;
    email: string;
  };
}

// Queue update interface (unused but kept for future use)
// interface QueueUpdate {
//   type: 'position_update' | 'status_change' | 'estimate_update';
//   queueEntry: QueueEntry;
//   message?: string;
// }

// Hook for real-time queue updates
export const useQueueRealtime = () => {
  const { data: session } = useSession();
  const { socket, connectionStatus } = useSocket();
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [userQueueStatus, setUserQueueStatus] = useState<QueueEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Handle queue updates
  const handleQueueUpdate = useCallback((data: unknown) => {
    console.log('🔔 Queue update received:', data);
    setLastUpdate(new Date());
    
    // Show toast notification for important updates
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
      toast.info(data.message);
    }
  }, []);

  // Handle queue entry updates
  const handleQueueEntryUpdate = useCallback((entry: QueueEntry) => {
    console.log('🔔 Queue entry updated:', entry);
    setLastUpdate(new Date());
    
    setQueueEntries(prev => {
      const index = prev.findIndex(e => e.id === entry.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = entry;
        return updated;
      }
      return prev;
    });

    // Show notification for status changes
    if (entry.status === 'IN_PROGRESS') {
      toast.success(`Your consultation has started! Position: ${entry.position}`);
    } else if (entry.status === 'COMPLETED') {
      toast.success('Your consultation has been completed!');
    }
  }, []);

  // Handle queue entry added
  const handleQueueEntryAdded = useCallback((entry: QueueEntry) => {
    console.log('🔔 Queue entry added:', entry);
    setLastUpdate(new Date());
    
    setQueueEntries(prev => {
      const exists = prev.find(e => e.id === entry.id);
      if (!exists) {
        return [...prev, entry].sort((a, b) => a.position - b.position);
      }
      return prev;
    });

    // Show notification for new entries
    if (entry.userId === session?.user?.id) {
      toast.success(`You've been added to the queue! Position: ${entry.position}`);
    }
  }, [session?.user?.id]);

  // Handle queue entry removed
  const handleQueueEntryRemoved = useCallback((entry: QueueEntry) => {
    console.log('🔔 Queue entry removed:', entry);
    setLastUpdate(new Date());
    
    setQueueEntries(prev => prev.filter(e => e.id !== entry.id));

    // Show notification for removed entries
    if (entry.userId === session?.user?.id) {
      toast.info('You have been removed from the queue');
    }
  }, [session?.user?.id]);

  // Handle queue position updates
  const handleQueuePositionUpdate = useCallback((data: unknown) => {
    console.log('🔔 Queue position updated:', data);
    setLastUpdate(new Date());
    
    if (data && typeof data === 'object' && 'entry' in data && data.entry && typeof data.entry === 'object' && 'userId' in data.entry && data.entry.userId === session?.user?.id) {
      setUserQueueStatus(data.entry as QueueEntry);
      
      // Show notification for position changes
      if ('position' in data.entry && typeof data.entry.position === 'number') {
        if (data.entry.position <= 3) {
          toast.warning(`You're next! Position: ${data.entry.position}`);
        } else if (data.entry.position <= 5) {
          toast.info(`You're almost there! Position: ${data.entry.position}`);
        }
      }
    }

    // Update queue entries if provided
    if (data && typeof data === 'object' && 'entries' in data && Array.isArray(data.entries)) {
      setQueueEntries(data.entries as QueueEntry[]);
    }
  }, [session?.user?.id]);

  // Handle user queue status
  const handleUserQueueStatus = useCallback((data: unknown) => {
    console.log('🔔 User queue status:', data);
    setLastUpdate(new Date());
    
    if (data && typeof data === 'object' && 'queueEntry' in data && data.queueEntry) {
      setUserQueueStatus(data.queueEntry as QueueEntry);
    }
  }, []);

  // Request queue update
  const requestQueueUpdate = useCallback(() => {
    if (socket && connectionStatus.connected) {
      socket.requestQueueUpdate();
      setIsLoading(true);
      
      // Reset loading after a short delay
      setTimeout(() => setIsLoading(false), 2000);
    }
  }, [socket, connectionStatus.connected]);

  // Request user queue status
  const requestUserQueueStatus = useCallback(() => {
    if (socket && connectionStatus.connected && session?.user?.id) {
      socket.requestUserQueueStatus(session.user.id);
      setIsLoading(true);
      
      // Reset loading after a short delay
      setTimeout(() => setIsLoading(false), 2000);
    }
  }, [socket, connectionStatus.connected, session?.user?.id]);

  // Request guruji queue
  const requestGurujiQueue = useCallback((gurujiId: string) => {
    if (socket && connectionStatus.connected) {
      socket.requestGurujiQueue(gurujiId);
      setIsLoading(true);
      
      // Reset loading after a short delay
      setTimeout(() => setIsLoading(false), 2000);
    }
  }, [socket, connectionStatus.connected]);

  // Set up event listeners
  useEffect(() => {
    if (!socket) return;

    // Queue events with proper type casting
    const queueUpdateHandler = (...args: unknown[]) => {
      if (args[0]) {
        handleQueueUpdate(args[0]);
      }
    };

    const queueEntryUpdateHandler = (...args: unknown[]) => {
      if (args[0]) {
        handleQueueEntryUpdate(args[0] as QueueEntry);
      }
    };

    const queueEntryAddedHandler = (...args: unknown[]) => {
      if (args[0]) {
        handleQueueEntryAdded(args[0] as QueueEntry);
      }
    };

    const queueEntryRemovedHandler = (...args: unknown[]) => {
      if (args[0]) {
        handleQueueEntryRemoved(args[0] as QueueEntry);
      }
    };

    const queuePositionUpdateHandler = (...args: unknown[]) => {
      if (args[0]) {
        handleQueuePositionUpdate(args[0]);
      }
    };

    const userQueueStatusHandler = (...args: unknown[]) => {
      if (args[0]) {
        handleUserQueueStatus(args[0]);
      }
    };

    socket.on(SocketEvents.QUEUE_UPDATED, queueUpdateHandler);
    socket.on(SocketEvents.QUEUE_ENTRY_UPDATED, queueEntryUpdateHandler);
    socket.on(SocketEvents.QUEUE_ENTRY_ADDED, queueEntryAddedHandler);
    socket.on(SocketEvents.QUEUE_ENTRY_REMOVED, queueEntryRemovedHandler);
    socket.on(SocketEvents.QUEUE_POSITION_UPDATED, queuePositionUpdateHandler);
    socket.on(SocketEvents.USER_QUEUE_STATUS, userQueueStatusHandler);

    // Cleanup
    return () => {
      socket.off(SocketEvents.QUEUE_UPDATED, queueUpdateHandler);
      socket.off(SocketEvents.QUEUE_ENTRY_UPDATED, queueEntryUpdateHandler);
      socket.off(SocketEvents.QUEUE_ENTRY_ADDED, queueEntryAddedHandler);
      socket.off(SocketEvents.QUEUE_ENTRY_REMOVED, queueEntryRemovedHandler);
      socket.off(SocketEvents.QUEUE_POSITION_UPDATED, queuePositionUpdateHandler);
      socket.off(SocketEvents.USER_QUEUE_STATUS, userQueueStatusHandler);
    };
  }, [
    socket,
    handleQueueUpdate,
    handleQueueEntryUpdate,
    handleQueueEntryAdded,
    handleQueueEntryRemoved,
    handleQueuePositionUpdate,
    handleUserQueueStatus
  ]);

  // Auto-request updates when connected
  useEffect(() => {
    if (connectionStatus.connected && session?.user) {
      // Request initial queue status
      requestUserQueueStatus();
      
      // Set up periodic updates (every 30 seconds)
      const interval = setInterval(() => {
        requestQueueUpdate();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [connectionStatus.connected, session?.user, requestUserQueueStatus, requestQueueUpdate]);

  return {
    // State
    queueEntries,
    userQueueStatus,
    isLoading,
    lastUpdate,
    connectionStatus,
    
    // Actions
    requestQueueUpdate,
    requestUserQueueStatus,
    requestGurujiQueue,
    
    // Computed values
    waitingCount: queueEntries.filter(entry => entry.status === 'WAITING').length,
    inProgressCount: queueEntries.filter(entry => entry.status === 'IN_PROGRESS').length,
    userPosition: userQueueStatus?.position || null,
    userEstimatedWait: userQueueStatus?.estimatedWait || null,
    isUserInQueue: !!userQueueStatus && userQueueStatus.status === 'WAITING',
    isUserInProgress: !!userQueueStatus && userQueueStatus.status === 'IN_PROGRESS'
  };
};

export default useQueueRealtime;
