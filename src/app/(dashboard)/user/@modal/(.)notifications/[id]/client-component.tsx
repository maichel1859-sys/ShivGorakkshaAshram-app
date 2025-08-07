'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Bell, Calendar, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { getNotification, markNotificationAsRead } from '@/lib/actions';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
  emailSent?: boolean;
  smsSent?: boolean;
}

interface NotificationViewModalClientProps {
  notificationId: string;
  initialNotification?: Notification | null;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'appointment':
      return <Calendar className="h-4 w-4" />;
    case 'system':
      return <AlertTriangle className="h-4 w-4" />;
    case 'reminder':
      return <Bell className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
};

const getNotificationBadgeVariant = (type: string) => {
  switch (type) {
    case 'appointment':
      return 'default' as const;
    case 'system':
      return 'destructive' as const;
    case 'reminder':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
};

export default function NotificationViewModalClient({ 
  notificationId, 
  initialNotification 
}: NotificationViewModalClientProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(initialNotification || null);
  const [isLoading, setIsLoading] = useState(!initialNotification);
  const [isPending, startTransition] = useTransition();

  // Fetch notification data if not provided initially
  useEffect(() => {
    if (!initialNotification && notificationId) {
      startTransition(async () => {
        const result = await getNotification(notificationId);
        if (result.success && result.notification) {
          setNotification({
            ...result.notification,
            createdAt: result.notification.createdAt.toISOString(),
          } as Notification);
        } else {
          toast.error(result.error || 'Failed to load notification');
        }
        setIsLoading(false);
      });
    }
  }, [notificationId, initialNotification]);

  // Mark as read function
  const handleMarkAsRead = () => {
    if (!notification || notification.read) return;
    
    startTransition(async () => {
      const formData = new FormData();
      formData.append('notificationId', notificationId);
      
      const result = await markNotificationAsRead(formData);
      if (result.success) {
        setNotification(prev => prev ? { ...prev, read: true } : null);
        toast.success('Notification marked as read');
      } else {
        toast.error(result.error || 'Failed to mark notification as read');
      }
    });
  };

  // Auto-mark as read when modal opens (if unread)
  useEffect(() => {
    if (notification && !notification.read) {
      handleMarkAsRead();
    }
  }, [notification]);

  const handleClose = () => {
    setIsOpen(false);
    router.back();
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading notification...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!notification) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="text-center p-6">
            <p className="text-muted-foreground">Notification not found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {getNotificationIcon(notification.type)}
            <DialogTitle>{notification.title}</DialogTitle>
          </div>
          <DialogDescription>
            <div className="flex items-center justify-between mt-2">
              <Badge variant={getNotificationBadgeVariant(notification.type)}>
                {notification.type}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {format(new Date(notification.createdAt), 'PPP p')}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm leading-relaxed">
                  {notification.message}
                </p>
              </div>

              {/* Additional notification data */}
              {notification.data && Object.keys(notification.data).length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Additional Details</h4>
                  <div className="space-y-1">
                    {Object.entries(notification.data as Record<string, unknown>).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="capitalize text-muted-foreground">
                          {key.replace(/([A-Z])/g, ' $1')}:
                        </span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status indicators */}
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
                <div className="flex items-center gap-4">
                  <span className={notification.read ? 'text-green-600' : 'text-orange-600'}>
                    {notification.read ? '● Read' : '● Unread'}
                  </span>
                  {notification.emailSent && (
                    <span className="text-blue-600">✉ Email sent</span>
                  )}
                  {notification.smsSent && (
                    <span className="text-purple-600">📱 SMS sent</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          {!notification.read && (
            <Button 
              onClick={handleMarkAsRead}
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Mark as Read
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}