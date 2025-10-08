"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/loading";
import {
  Bell,
  Search,
  Plus,
  Eye,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  Info,
  Calendar,
  Loader2,
} from "lucide-react";
import {
  useNotificationsWithRealtime,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useUnreadNotificationCount
} from "@/hooks/queries/use-notifications";
import { usePollingNotifications } from "@/hooks/use-polling-notifications";
import { format } from "date-fns";
import { toast } from "sonner";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "appointment":
      return <Calendar className="h-4 w-4 text-blue-500" />;
    case "system":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "queue":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-green-500" />;
  }
};

export function NotificationsManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Use real-time notifications hook with automatic socket fallback
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch: refetchNotifications
  } = useNotificationsWithRealtime({
    enableRealtime: true
  });

  // Get unread count with real-time updates
  useUnreadNotificationCount();

  // Real-time notification polling with socket fallback
  usePollingNotifications();

  // Mutations with optimistic updates
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  // No need for manual fetching - real-time hooks handle this automatically

  // Real-time hooks automatically handle filter changes

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId, {
      onSuccess: () => {
        toast.success("Notification marked as read");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to mark notification as read");
      }
    });
  };

  const handleMarkAllAsRead = () => {
    if (confirm("Mark all notifications as read?")) {
      markAllAsReadMutation.mutate(undefined, {
        onSuccess: () => {
          toast.success("All notifications marked as read");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to mark all notifications as read");
        }
      });
    }
  };

  const notifications = notificationsData?.notifications || [];
  const totalNotifications = notifications.length;
  const unreadCountLocal = notifications.filter((n) => !n.read).length;

  // Filter notifications based on search
  const filteredNotifications = notifications.filter((notification) => {
    if (!searchTerm) return true;
    return (
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const notificationsByType = {
    system: notifications.filter((n) => n.type === "system").length,
    appointment: notifications.filter((n) => n.type === "appointment").length,
    queue: notifications.filter((n) => n.type === "queue").length,
    general: notifications.filter((n) => n.type === "general").length,
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>Failed to load notifications: {error?.message || String(error)}</p>
            <Button
              variant="outline"
              onClick={() => {
                refetchNotifications();
              }}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground">
            Stay updated with system notifications and alerts
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCountLocal > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              {markAllAsReadMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="mr-2 h-4 w-4" />
              )}
              Mark All Read
            </Button>
          )}
          <Button asChild>
            <Link href="/admin/notifications/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Notification
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNotifications}</div>
            <p className="text-xs text-muted-foreground">all notifications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Bell className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{unreadCountLocal}</div>
            <p className="text-xs text-muted-foreground">need attention</p>
          </CardContent>
        </Card>

        {Object.entries(notificationsByType).map(([type, count]) => (
          <Card key={type}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium capitalize">
                {type}
              </CardTitle>
              {getNotificationIcon(type)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count}</div>
              <p className="text-xs text-muted-foreground">
                {type} notifications
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="appointment">Appointment</SelectItem>
                <SelectItem value="queue">Queue</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread Only</SelectItem>
                <SelectItem value="read">Read Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Notifications ({filteredNotifications.length})
          </CardTitle>
          <CardDescription>
            Your recent notifications and system updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 p-4 border rounded"
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="mx-auto h-12 w-12 mb-4" />
              <h3 className="text-lg font-semibold">No notifications found</h3>
              <p>No notifications match your current filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start space-x-4 p-4 border rounded-lg transition-colors ${
                    !notification.read
                      ? "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center mt-2 space-x-2">
                          <Badge
                            variant="outline"
                            className="text-yellow-600 border-yellow-200"
                          >
                            Normal
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {notification.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(
                              new Date(notification.createdAt),
                              "MMM dd, HH:mm"
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/user/notifications/${notification.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {!notification.read && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={markAsReadMutation.isPending}
                          >
                            {markAsReadMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
