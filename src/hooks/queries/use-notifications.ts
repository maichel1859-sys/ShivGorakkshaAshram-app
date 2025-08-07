import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification 
} from '@/lib/actions/notification-actions';
import { toast } from 'sonner';

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...notificationKeys.lists(), filters] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: string) => [...notificationKeys.details(), id] as const,
  unreadCount: () => [...notificationKeys.all, 'unreadCount'] as const,
};

// Hook for fetching user notifications
export function useNotifications(options?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: notificationKeys.list(options),
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
      toast.success('Notification deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete notification');
    },
  });
} 