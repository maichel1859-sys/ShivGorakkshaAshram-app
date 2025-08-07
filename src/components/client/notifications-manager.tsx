'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
} from 'lucide-react';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/actions';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'system' | 'appointment' | 'queue' | 'general';
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  readAt?: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'appointment':
      return <Calendar className="h-4 w-4 text-blue-500" />;
    case 'system':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'queue':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-green-500" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-300';
    case 'medium':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300';
    case 'low':
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300';
  }
};

export function NotificationsManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [notificationsData, setNotificationsData] = useState<{
    notifications: Array<{
      id: string;
      title: string;
      message: string;
      type: string;
      read: boolean;
      createdAt: string;
    }>;
    total: number;
    unreadCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const options: Record<string, unknown> = {};
      if (typeFilter !== 'all') options.type = typeFilter;
      if (statusFilter === 'unread') options.read = false;
      else if (statusFilter === 'read') options.read = true;
      
      const result = await getNotifications(options);
      if (!result.success) {
        setError(result.error || 'Failed to load notifications');
      } else if (result.notifications) {
        setNotificationsData({
          notifications: result.notifications.map(notif => ({
            ...notif,
            createdAt: notif.createdAt.toISOString(),
          })),
          total: result.pagination.total,
          unreadCount: result.notifications.filter(n => !n.read).length,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch notifications on mount and filter changes
  useEffect(() => {
    startTransition(() => {
      fetchNotifications();
    });
  }, [typeFilter, statusFilter]);

  const handleMarkAsRead = (notificationId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('notificationId', notificationId);
      const result = await markNotificationAsRead(formData);
      if (result.success) {
        toast.success('Notification marked as read');
        fetchNotifications(); // Refetch notifications
      } else {
        toast.error(result.error || 'Failed to mark notification as read');
      }
    });
  };

  const handleMarkAllAsRead = () => {
    if (confirm('Mark all notifications as read?')) {
      startTransition(async () => {
        const result = await markAllNotificationsAsRead();
        if (result.success) {
          toast.success('All notifications marked as read');
          fetchNotifications(); // Refetch notifications
        } else {
          toast.error(result.error || 'Failed to mark all notifications as read');
        }
      });
    }
  };

  const notifications = notificationsData?.notifications || [];
  const totalNotifications = notificationsData?.total || 0;
  const unreadCount = notifications.filter(n => !n.read).length;

  // Filter notifications based on search
  const filteredNotifications = notifications.filter(notification => {
    if (!searchTerm) return true;
    return notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           notification.message.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const notificationsByType = {
    system: notifications.filter((n) => n.type === 'system').length,
    appointment: notifications.filter((n) => n.type === 'appointment').length,
    queue: notifications.filter((n) => n.type === 'queue').length,
    general: notifications.filter((n) => n.type === 'general').length,
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>Failed to load notifications: {error}</p>
            <Button 
              variant="outline" 
              onClick={() => startTransition(() => fetchNotifications())}
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
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              onClick={handleMarkAllAsRead}
              disabled={isPending}
            >
              {isPending ? (
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
            <p className="text-xs text-muted-foreground">
              all notifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Bell className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{unreadCount}</div>
            <p className="text-xs text-muted-foreground">
              need attention
            </p>
          </CardContent>
        </Card>

        {Object.entries(notificationsByType).map(([type, count]) => (
          <Card key={type}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium capitalize">{type}</CardTitle>
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
          <CardTitle>All Notifications ({filteredNotifications.length})</CardTitle>
          <CardDescription>
            Your recent notifications and system updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded">
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
                    !notification.read ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
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
                            {format(new Date(notification.createdAt), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/user/notifications/${notification.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {!notification.read && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={isPending}
                          >
                            {isPending ? (
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