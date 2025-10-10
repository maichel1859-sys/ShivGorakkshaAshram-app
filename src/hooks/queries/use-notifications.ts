import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification 
} from '@/lib/actions/notification-actions';
import { toast } from 'sonner';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket, SocketEvents } from '@/lib/socket/socket-client';
import { showToast } from '@/lib/toast';
import { AppNotification, AppNotificationUpdate } from '@/store/notification-store';

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...notificationKeys.lists(), filters] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: string) => [...notificationKeys.details(), id] as const,
  unreadCount: () => [...notificationKeys.all, 'unreadCount'] as const,
};

// Hook for fetching user notifications with real-time updates
export function useNotifications(options?: { limit?: number; offset?: number }) {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const lastUpdateRef = useRef<number>(0);

  const query = useQuery({
    queryKey: notificationKeys.list(options || {}),
    queryFn: async () => {
      const result = await getUserNotifications(options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch notifications');
      }
      return {
        notifications: result.notifications?.map(notification => ({
          ...notification,
          createdAt: notification.createdAt.toISOString(),
          data: notification.data as Record<string, unknown> | undefined,
        })) || [],
        unreadCount: result.unreadCount || 0,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleNotificationUpdate = (...args: unknown[]) => {
      const data = args[0] as AppNotificationUpdate;
      const now = Date.now();
      if (now - lastUpdateRef.current < 100) return; // Debounce rapid updates
      lastUpdateRef.current = now;

      console.log('Real-time notification update received:', data);

      queryClient.setQueryData(notificationKeys.list(options || {}), (oldData: { notifications: AppNotification[]; unreadCount: number } | undefined) => {
        if (!oldData) return oldData;

        switch (data.type) {
          case 'NOTIFICATION_SENT':
            // Add new notification
            const exists = oldData.notifications?.find((n: AppNotification) => n.id === data.data.id);
            if (!exists) {
              return {
                ...oldData,
                notifications: [data.data, ...(oldData.notifications || [])],
                unreadCount: (oldData.unreadCount || 0) + 1,
              };
            }
            return oldData;

          case 'NOTIFICATION_READ':
            // Mark notification as read
            return {
              ...oldData,
              notifications: oldData.notifications?.map((n: AppNotification) =>
                n.id === data.notificationId ? { ...n, read: true } : n
              ) || [],
              unreadCount: Math.max(0, (oldData.unreadCount || 0) - 1),
            };

          case 'NOTIFICATION_DELETED':
            // Remove notification
            const notification = oldData.notifications?.find((n: AppNotification) => n.id === data.notificationId);
            return {
              ...oldData,
              notifications: oldData.notifications?.filter((n: AppNotification) => n.id !== data.notificationId) || [],
              unreadCount: notification && !notification.read 
                ? Math.max(0, (oldData.unreadCount || 0) - 1) 
                : oldData.unreadCount,
            };

          default:
            return oldData;
        }
      });
    };

    socket.on(SocketEvents.NOTIFICATION_UPDATE, handleNotificationUpdate);

    return () => {
      socket.off(SocketEvents.NOTIFICATION_UPDATE, handleNotificationUpdate);
    };
  }, [socket, queryClient, options]);

  return query;
}

// Hook for marking notification as read
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const formData = new FormData();
      formData.append('notificationId', notificationId);
      const result = await markNotificationAsRead(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to mark notification as read');
      }
      return result;
    },
    onSuccess: (_, notificationId) => {
      // Optimistically update the notification
      queryClient.setQueryData(notificationKeys.lists(), (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object' || oldData === null) return oldData;
        const data = oldData as { notifications: Array<{ id: string; read: boolean }>; unreadCount?: number };
        return {
          ...data,
          notifications: data.notifications.map((n) => 
            n.id === notificationId ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, (data.unreadCount || 0) - 1),
        };
      });
      
      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to mark notification as read');
    },
  });
}

// Hook for marking all notifications as read
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const result = await markAllNotificationsAsRead();
      if (!result.success) {
        throw new Error(result.error || 'Failed to mark all notifications as read');
      }
      return result;
    },
    onSuccess: () => {
      // Optimistically update all notifications
      queryClient.setQueryData(notificationKeys.lists(), (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object' || oldData === null) return oldData;
        const data = oldData as { notifications: Array<{ id: string; read: boolean }>; unreadCount?: number };
        return {
          ...data,
          notifications: data.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        };
      });
      
      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      toast.success('All notifications marked as read');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to mark all notifications as read');
    },
  });
}

// Hook for deleting notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const formData = new FormData();
      formData.append('notificationId', notificationId);
      const result = await deleteNotification(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete notification');
      }
      return result;
    },
    onSuccess: (_, notificationId) => {
      // Optimistically remove the notification
      queryClient.setQueryData(notificationKeys.lists(), (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object' || oldData === null) return oldData;
        const data = oldData as { notifications: Array<{ id: string; read: boolean }>; unreadCount?: number };
        const notification = data.notifications.find((n) => n.id === notificationId);
        return {
          ...data,
          notifications: data.notifications.filter((n) => n.id !== notificationId),
          unreadCount: notification && !notification.read 
            ? Math.max(0, (data.unreadCount || 0) - 1) 
            : data.unreadCount,
        };
      });
      
      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      toast.success('Notification deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete notification');
    },
  });
}

// Comprehensive hook that combines React Query with real-time updates
export function useNotificationsWithRealtime(options?: { 
  limit?: number; 
  offset?: number;
  enableRealtime?: boolean;
}) {
  const { enableRealtime = true, ...queryOptions } = options || {};
  const { socket, connectionStatus } = useSocket();
  const queryClient = useQueryClient();
  const [realtimeNotifications, setRealtimeNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Use the enhanced notifications hook
  const notificationsQuery = useNotifications(queryOptions);
  
  // Show toast notification based on type
  const showToastNotification = useCallback((notification: AppNotification) => {
    const toastOptions = {
      duration: 5000,
    };

    switch (notification.type) {
      case 'SUCCESS':
        showToast.success(notification.title, toastOptions);
        break;
      case 'WARNING':
        showToast.warning(notification.title, toastOptions);
        break;
      case 'ERROR':
        showToast.error(notification.title, toastOptions);
        break;
      case 'APPOINTMENT':
        showToast.info(`📅 ${notification.title}`, toastOptions);
        break;
      case 'QUEUE':
        showToast.info(`📍 ${notification.title}`, toastOptions);
        break;
      case 'REMEDY':
        showToast.info(`🌿 ${notification.title}`, toastOptions);
        break;
      case 'CONSULTATION':
        showToast.info(`💬 ${notification.title}`, toastOptions);
        break;
      default:
        showToast.info(notification.title, toastOptions);
    }
  }, []);

  // Handle real-time notification updates
  const handleNotificationUpdate = useCallback((...args: unknown[]) => {
    const data = args[0] as AppNotificationUpdate;
    const now = Date.now();
    if (now - lastUpdateRef.current < 100) return; // Debounce rapid updates
    lastUpdateRef.current = now;

    console.log('Real-time notification update received:', data);
    setLastUpdate(new Date());

    switch (data.type) {
      case 'NOTIFICATION_SENT':
        // Add new notification
        setRealtimeNotifications(prev => {
          const exists = prev.find(n => n.id === data.data.id);
          if (!exists) {
            const updated = [data.data, ...prev];
            setUnreadCount(prev => prev + 1);
            return updated;
          }
          return prev;
        });
        
        // Show toast notification
        showToastNotification(data.data);
        break;
        
      case 'NOTIFICATION_READ':
        // Mark notification as read
        setRealtimeNotifications(prev => {
          const updated = prev.map(n => 
            n.id === data.notificationId ? { ...n, read: true } : n
          );
          setUnreadCount(updated.filter(n => !n.read).length);
          return updated;
        });
        break;
        
      case 'NOTIFICATION_DELETED':
        // Remove notification
        setRealtimeNotifications(prev => {
          const updated = prev.filter(n => n.id !== data.notificationId);
          setUnreadCount(updated.filter(n => !n.read).length);
          return updated;
        });
        break;
    }
  }, [showToastNotification]);

  // Real-time socket integration
  useEffect(() => {
    if (!enableRealtime || !socket) return;

    socket.on(SocketEvents.NOTIFICATION_UPDATE, handleNotificationUpdate);

    return () => {
      socket.off(SocketEvents.NOTIFICATION_UPDATE, handleNotificationUpdate);
    };
  }, [socket, enableRealtime, handleNotificationUpdate]);

  // Sync real-time data with React Query cache
  useEffect(() => {
    if (!enableRealtime || !realtimeNotifications.length) return;
    
    // Update React Query cache with real-time data
    queryClient.setQueryData(notificationKeys.list(queryOptions), (oldData: { notifications: AppNotification[]; unreadCount: number } | undefined) => {
      if (!oldData) return oldData;
      
      // Merge real-time notifications with cached data
      const realtimeIds = new Set(realtimeNotifications.map(n => n.id));
      const cachedNotifications = oldData.notifications?.filter((n: AppNotification) => !realtimeIds.has(n.id)) || [];
      
      return {
        ...oldData,
        notifications: [...realtimeNotifications, ...cachedNotifications],
        unreadCount: unreadCount,
      };
    });
  }, [realtimeNotifications, unreadCount, enableRealtime, queryOptions, queryClient]);

  // Update unread count when notifications change
  useEffect(() => {
    setUnreadCount(realtimeNotifications.filter(n => !n.read).length);
  }, [realtimeNotifications]);

  return {
    // React Query data
    ...notificationsQuery,
    
    // Real-time features
    realtime: enableRealtime ? {
      connectionStatus,
      lastUpdate,
      hasUnread: unreadCount > 0,
      totalCount: realtimeNotifications.length,
      notifications: realtimeNotifications,
      unreadCount,
    } : null,
    
    // Combined actions
    markAsRead: (notificationId: string) => {
      setRealtimeNotifications(prev => {
        const updated = prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        );
        setUnreadCount(updated.filter(n => !n.read).length);
        return updated;
      });
    },
    markAllAsRead: () => {
      setRealtimeNotifications(prev => {
        const updated = prev.map(n => ({ ...n, read: true }));
        setUnreadCount(0);
        return updated;
      });
    },
    deleteNotification: (notificationId: string) => {
      setRealtimeNotifications(prev => {
        const updated = prev.filter(n => n.id !== notificationId);
        setUnreadCount(updated.filter(n => !n.read).length);
        return updated;
      });
    },
  };
}

// Hook for unread count with real-time updates
export function useUnreadNotificationCount() {
  const queryClient = useQueryClient();
  const { socket, connectionStatus } = useSocket();
  const [realtimeUnreadCount, setRealtimeUnreadCount] = useState<number | null>(null);

  const query = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const result = await getUserNotifications({ unreadOnly: true });
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch unread count');
      }
      return result.unreadCount || 0;
    },
    staleTime: 60 * 1000, // 1 minute
    // Poll only when socket is disconnected
    refetchInterval: connectionStatus.connected ? false : 5 * 60 * 1000,
  });

  // Handle real-time unread count updates
  useEffect(() => {
    if (!socket) return;

    const handleNotificationUpdate = (...args: unknown[]) => {
      const data = args[0] as AppNotificationUpdate;
      if (data.type === 'NOTIFICATION_SENT') {
        setRealtimeUnreadCount(prev => (prev || 0) + 1);
      } else if (data.type === 'NOTIFICATION_READ') {
        setRealtimeUnreadCount(prev => Math.max(0, (prev || 0) - 1));
      } else if (data.type === 'NOTIFICATION_DELETED') {
        // We need to check if the deleted notification was unread
        setRealtimeUnreadCount(prev => Math.max(0, (prev || 0) - 1));
      }
    };

    socket.on(SocketEvents.NOTIFICATION_UPDATE, handleNotificationUpdate);

    return () => {
      socket.off(SocketEvents.NOTIFICATION_UPDATE, handleNotificationUpdate);
    };
  }, [socket]);

  // Sync with real-time updates
  useEffect(() => {
    if (realtimeUnreadCount !== null) {
      queryClient.setQueryData(notificationKeys.unreadCount(), realtimeUnreadCount);
    }
  }, [realtimeUnreadCount, queryClient]);

  return {
    ...query,
    data: realtimeUnreadCount ?? query.data ?? 0,
    isRealtime: connectionStatus.connected,
  };
}
