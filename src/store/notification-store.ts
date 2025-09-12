import { create } from 'zustand';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'appointment' | 'remedy' | 'queue' | 'system' | 'reminder';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  lastFetch: number | null;

  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  updateUnreadCount: () => void;
  setLastFetch: (timestamp: number) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  lastFetch: null,

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    set({ 
      notifications, 
      unreadCount,
      lastFetch: Date.now()
    });
  },

  addNotification: (notification) => {
    const { notifications } = get();
    const newNotifications = [notification, ...notifications];
    const unreadCount = newNotifications.filter(n => !n.isRead).length;
    
    set({ 
      notifications: newNotifications, 
      unreadCount 
    });
  },

  markAsRead: (notificationId) => {
    const { notifications } = get();
    const updatedNotifications = notifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, isRead: true }
        : notification
    );
    const unreadCount = updatedNotifications.filter(n => !n.isRead).length;
    
    set({ 
      notifications: updatedNotifications, 
      unreadCount 
    });
  },

  markAllAsRead: () => {
    const { notifications } = get();
    const updatedNotifications = notifications.map(notification =>
      ({ ...notification, isRead: true })
    );
    
    set({ 
      notifications: updatedNotifications, 
      unreadCount: 0 
    });
  },

  removeNotification: (notificationId) => {
    const { notifications } = get();
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    const unreadCount = updatedNotifications.filter(n => !n.isRead).length;
    
    set({ 
      notifications: updatedNotifications, 
      unreadCount 
    });
  },

  updateUnreadCount: () => {
    const { notifications } = get();
    const unreadCount = notifications.filter(n => !n.isRead).length;
    set({ unreadCount });
  },

  setLastFetch: (timestamp) => set({ lastFetch: timestamp }),
}));

// Selector hooks for better performance
export const useNotifications = () => useNotificationStore((state) => state.notifications);
export const useUnreadCount = () => useNotificationStore((state) => state.unreadCount);
export const useUnreadNotificationCount = () => useNotificationStore((state) => state.unreadCount);
export const useMarkAsRead = () => useNotificationStore((state) => state.markAsRead);
export const useAddNotification = () => useNotificationStore((state) => state.addNotification);
export const useClearNotifications = () => useNotificationStore((state) => state.markAllAsRead);