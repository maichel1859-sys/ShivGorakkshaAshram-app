/**
 * Enhanced Notification Store with Real-time Integration
 * 
 * This store combines Zustand for state management with real-time socket updates
 * and React Query for server synchronization
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Notification interface
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'APPOINTMENT' | 'QUEUE' | 'REMEDY' | 'CONSULTATION';
  read: boolean;
  userId: string;
  createdAt: string;
  data?: Record<string, unknown>;
}

// Notification update interface
export interface AppNotificationUpdate {
  type: 'NOTIFICATION_SENT' | 'NOTIFICATION_READ' | 'NOTIFICATION_DELETED';
  notificationId: string;
  data: AppNotification;
  timestamp: number;
}

// Store state interface
interface NotificationState {
  // State
  notifications: AppNotification[];
  unreadCount: number;
  lastUpdate: Date | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  isRealtimeEnabled: boolean;
  
  // Actions
  addNotification: (notification: AppNotification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  setNotifications: (notifications: AppNotification[]) => void;
  setUnreadCount: (count: number) => void;
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
  setRealtimeEnabled: (enabled: boolean) => void;
  handleRealtimeUpdate: (update: AppNotificationUpdate) => void;
  
  // Computed getters
  getUnreadNotifications: () => AppNotification[];
  getReadNotifications: () => AppNotification[];
  getNotificationsByType: (type: string) => AppNotification[];
  hasUnread: () => boolean;
  getTotalCount: () => number;
}

// Create the notification store
export const useNotificationStore = create<NotificationState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      notifications: [],
      unreadCount: 0,
      lastUpdate: null,
      connectionStatus: 'disconnected',
      isRealtimeEnabled: true,

      // Actions
      addNotification: (notification: AppNotification) => {
        set((state) => {
          // Check if notification already exists
          const exists = state.notifications.find((n: AppNotification) => n.id === notification.id);
          if (!exists) {
            state.notifications.unshift(notification);
            if (!notification.read) {
              state.unreadCount += 1;
            }
            state.lastUpdate = new Date();
          }
        });
      },

      markAsRead: (notificationId: string) => {
        set((state) => {
          const notification = state.notifications.find((n: AppNotification) => n.id === notificationId);
          if (notification && !notification.read) {
            notification.read = true;
            state.unreadCount = Math.max(0, state.unreadCount - 1);
            state.lastUpdate = new Date();
          }
        });
      },

      markAllAsRead: () => {
        set((state) => {
          state.notifications.forEach((notification: AppNotification) => {
            notification.read = true;
          });
          state.unreadCount = 0;
          state.lastUpdate = new Date();
        });
      },

      deleteNotification: (notificationId: string) => {
        set((state) => {
          const notification = state.notifications.find((n: AppNotification) =>n.id === notificationId);
          if (notification) {
            state.notifications = state.notifications.filter((n: AppNotification) =>n.id !== notificationId);
            if (!notification.read) {
              state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
            state.lastUpdate = new Date();
          }
        });
      },

      clearAllNotifications: () => {
        set((state) => {
          state.notifications = [];
          state.unreadCount = 0;
          state.lastUpdate = new Date();
        });
      },

      setNotifications: (notifications: AppNotification[]) => {
        set((state) => {
          state.notifications = notifications;
          state.unreadCount = notifications.filter((n: AppNotification) =>!n.read).length;
          state.lastUpdate = new Date();
        });
      },

      setUnreadCount: (count: number) => {
        set((state) => {
          state.unreadCount = count;
        });
      },

      setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => {
        set((state) => {
          state.connectionStatus = status;
        });
      },

      setRealtimeEnabled: (enabled: boolean) => {
        set((state) => {
          state.isRealtimeEnabled = enabled;
        });
      },

      handleRealtimeUpdate: (update: AppNotificationUpdate) => {
        set((state) => {
          switch (update.type) {
            case 'NOTIFICATION_SENT':
              // Add new notification
              const exists = state.notifications.find((n: AppNotification) =>n.id === update.data.id);
              if (!exists) {
                state.notifications.unshift(update.data);
                if (!update.data.read) {
                  state.unreadCount += 1;
                }
                state.lastUpdate = new Date();
              }
              break;

            case 'NOTIFICATION_READ':
              // Mark notification as read
              const notification = state.notifications.find((n: AppNotification) =>n.id === update.notificationId);
              if (notification && !notification.read) {
                notification.read = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
                state.lastUpdate = new Date();
              }
              break;

            case 'NOTIFICATION_DELETED':
              // Remove notification
              const deletedNotification = state.notifications.find((n: AppNotification) =>n.id === update.notificationId);
              if (deletedNotification) {
                state.notifications = state.notifications.filter((n: AppNotification) =>n.id !== update.notificationId);
                if (!deletedNotification.read) {
                  state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
                state.lastUpdate = new Date();
              }
              break;
          }
        });
      },

      // Computed getters
      getUnreadNotifications: () => {
        return get().notifications.filter((n: AppNotification) =>!n.read);
      },

      getReadNotifications: () => {
        return get().notifications.filter((n: AppNotification) =>n.read);
      },

      getNotificationsByType: (type: string) => {
        return get().notifications.filter((n: AppNotification) =>n.type === type);
      },

      hasUnread: () => {
        return get().unreadCount > 0;
      },

      getTotalCount: () => {
        return get().notifications.length;
      },
    }))
  )
);

// Selectors for optimized re-renders
export const notificationSelectors = {
  notifications: (state: NotificationState) => state.notifications,
  unreadCount: (state: NotificationState) => state.unreadCount,
  connectionStatus: (state: NotificationState) => state.connectionStatus,
  hasUnread: (state: NotificationState) => state.unreadCount > 0,
  unreadNotifications: (state: NotificationState) => state.notifications.filter((n: AppNotification) =>!n.read),
  readNotifications: (state: NotificationState) => state.notifications.filter((n: AppNotification) =>n.read),
  totalCount: (state: NotificationState) => state.notifications.length,
  lastUpdate: (state: NotificationState) => state.lastUpdate,
  isRealtimeEnabled: (state: NotificationState) => state.isRealtimeEnabled,
};

// Actions selector
export const notificationActions = {
  addNotification: (state: NotificationState) => state.addNotification,
  markAsRead: (state: NotificationState) => state.markAsRead,
  markAllAsRead: (state: NotificationState) => state.markAllAsRead,
  deleteNotification: (state: NotificationState) => state.deleteNotification,
  clearAllNotifications: (state: NotificationState) => state.clearAllNotifications,
  setNotifications: (state: NotificationState) => state.setNotifications,
  setUnreadCount: (state: NotificationState) => state.setUnreadCount,
  setConnectionStatus: (state: NotificationState) => state.setConnectionStatus,
  setRealtimeEnabled: (state: NotificationState) => state.setRealtimeEnabled,
  handleRealtimeUpdate: (state: NotificationState) => state.handleRealtimeUpdate,
};

// Hook for subscribing to specific notification changes
export const useNotificationSubscription = <T>(
  selector: (state: NotificationState) => T,
  callback: (value: T) => void
) => {
  const store = useNotificationStore;
  
  return store.subscribe(selector, callback);
};

// Hook for real-time notification updates
export const useRealtimeNotifications = () => {
  const store = useNotificationStore;
  
  return {
    notifications: store(notificationSelectors.notifications),
    unreadCount: store(notificationSelectors.unreadCount),
    connectionStatus: store(notificationSelectors.connectionStatus),
    hasUnread: store(notificationSelectors.hasUnread),
    unreadNotifications: store(notificationSelectors.unreadNotifications),
    readNotifications: store(notificationSelectors.readNotifications),
    totalCount: store(notificationSelectors.totalCount),
    lastUpdate: store(notificationSelectors.lastUpdate),
    isRealtimeEnabled: store(notificationSelectors.isRealtimeEnabled),
    
    // Actions
    addNotification: store(notificationActions.addNotification),
    markAsRead: store(notificationActions.markAsRead),
    markAllAsRead: store(notificationActions.markAllAsRead),
    deleteNotification: store(notificationActions.deleteNotification),
    clearAllNotifications: store(notificationActions.clearAllNotifications),
    setNotifications: store(notificationActions.setNotifications),
    setUnreadCount: store(notificationActions.setUnreadCount),
    setConnectionStatus: store(notificationActions.setConnectionStatus),
    setRealtimeEnabled: store(notificationActions.setRealtimeEnabled),
    handleRealtimeUpdate: store(notificationActions.handleRealtimeUpdate),
  };
};

// Export types
export type { NotificationState };
