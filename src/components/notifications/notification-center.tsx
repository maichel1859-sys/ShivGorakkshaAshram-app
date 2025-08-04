"use client";

import { useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  Heart,
  Users,
  Settings,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNotificationStore } from "@/store/notification-store";
import { useAppStore } from "@/store/app-store";

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    setLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    setNotifications,
  } = useNotificationStore();

  const { network } = useAppStore();

  const fetchNotifications = useCallback(async () => {
    if (!network.isOnline) return;

    setLoading(true);
    try {
      const response = await fetch("/api/notifications?limit=20");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [network.isOnline, setNotifications, setLoading]);

  const handleMarkAsRead = async (notificationId: string) => {
    // Optimistically update UI
    markAsRead(notificationId);

    if (!network.isOnline) return;

    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      // TODO: Queue for retry when online
    }
  };

  const handleMarkAllAsRead = async () => {
    // Optimistically update UI
    markAllAsRead();

    if (!network.isOnline) return;

    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      // TODO: Queue for retry when online
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    // Optimistically update UI
    removeNotification(notificationId);

    if (!network.isOnline) return;

    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to delete notification:", error);
      // TODO: Queue for retry when online
    }
  };

  // Fetch notifications when dropdown opens
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Fetch notifications periodically when online
  useEffect(() => {
    if (!network.isOnline) return;

    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [network.isOnline, fetchNotifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "appointment":
        return <Calendar className="h-4 w-4" />;
      case "remedy":
        return <Heart className="h-4 w-4" />;
      case "queue":
        return <Users className="h-4 w-4" />;
      case "system":
        return <Settings className="h-4 w-4" />;
      case "reminder":
        return <Clock className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "text-red-600";
      case "MEDIUM":
        return "text-yellow-600";
      case "LOW":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "appointment":
        return "bg-blue-100 text-blue-700";
      case "remedy":
        return "bg-green-100 text-green-700";
      case "queue":
        return "bg-purple-100 text-purple-700";
      case "system":
        return "bg-gray-100 text-gray-700";
      case "reminder":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`relative ${className}`}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {!network.isOnline && (
          <div className="p-2 text-center">
            <div className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
              Offline - showing cached notifications
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 hover:bg-muted/50 transition-colors ${
                    !notification.isRead ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`mt-1 ${getPriorityColor(notification.priority)}`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4
                          className={`text-sm font-medium truncate ${
                            !notification.isRead ? "font-semibold" : ""
                          }`}
                        >
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-1">
                          <Badge
                            className={`${getTypeColor(notification.type)} text-xs`}
                          >
                            {notification.type}
                          </Badge>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(
                            new Date(notification.createdAt),
                            {
                              addSuffix: true,
                            }
                          )}
                        </span>
                        <div className="flex space-x-1">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteNotification(notification.id)
                            }
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Button variant="ghost" className="w-full justify-center">
                View All Notifications
              </Button>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
