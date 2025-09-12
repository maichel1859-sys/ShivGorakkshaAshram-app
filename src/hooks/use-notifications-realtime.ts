"use client";

import { useEffect, useState, useCallback } from 'react';
import { useSocket, SocketEvents } from '@/lib/socket/socket-client';
import { showToast } from '@/lib/toast';

// Notification interface
interface Notification {
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
interface NotificationUpdate {
  type: 'NOTIFICATION_SENT' | 'NOTIFICATION_READ' | 'NOTIFICATION_DELETED';
  notificationId: string;
  data: Notification;
}

// Hook for real-time notifications
export const useNotificationsRealtime = () => {
  const { socket, connectionStatus } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Show toast notification based on type
  const showToastNotification = useCallback((notification: Notification) => {
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

  // Handle notification updates
  const handleNotificationUpdate = useCallback((data: NotificationUpdate) => {
    console.log('🔔 Notification update received:', data);
    setLastUpdate(new Date());
    
    switch (data.type) {
      case 'NOTIFICATION_SENT':
        // Add new notification
        setNotifications(prev => {
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
        setNotifications(prev => {
          const updated = prev.map(n => 
            n.id === data.notificationId ? { ...n, read: true } : n
          );
          setUnreadCount(updated.filter(n => !n.read).length);
          return updated;
        });
        break;
        
      case 'NOTIFICATION_DELETED':
        // Remove notification
        setNotifications(prev => {
          const updated = prev.filter(n => n.id !== data.notificationId);
          setUnreadCount(updated.filter(n => !n.read).length);
          return updated;
        });
        break;
    }
  }, [showToastNotification]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      setUnreadCount(updated.filter(n => !n.read).length);
      return updated;
    });
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      setUnreadCount(0);
      return updated;
    });
  }, []);

  // Delete notification
  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notificationId);
      setUnreadCount(updated.filter(n => !n.read).length);
      return updated;
    });
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (!socket) return;

    const notificationHandler = (...args: unknown[]) => {
      if (args[0]) {
        handleNotificationUpdate(args[0] as NotificationUpdate);
      }
    };

    socket.on(SocketEvents.NOTIFICATION_UPDATE, notificationHandler);

    return () => {
      socket.off(SocketEvents.NOTIFICATION_UPDATE, notificationHandler);
    };
  }, [socket, handleNotificationUpdate]);

  // Update unread count when notifications change
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  return {
    // State
    notifications,
    unreadCount,
    lastUpdate,
    connectionStatus,
    
    // Actions
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    
    // Computed values
    unreadNotifications: notifications.filter(n => !n.read),
    readNotifications: notifications.filter(n => n.read),
    hasUnread: unreadCount > 0,
    totalCount: notifications.length
  };
};

export default useNotificationsRealtime;
