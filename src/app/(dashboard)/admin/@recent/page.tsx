import { Suspense } from 'react';
import { getUsers } from '@/lib/actions/user-actions';
import { getNotifications } from '@/lib/actions/notification-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Bell, Clock } from 'lucide-react';
import { format } from 'date-fns';

async function RecentContent() {
  // Fetch recent data in parallel
  const [recentUsersData, recentNotificationsData] = await Promise.all([
    getUsers({ limit: 5, offset: 0 }),
    getNotifications({ limit: 5, offset: 0 }).catch(() => ({ notifications: [], total: 0 })),
  ]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Recent Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Recent Users</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentUsersData?.users?.map((user) => (
              <div key={user.id} className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={''} alt={user.name || undefined} />
                  <AvatarFallback>
                    {(user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name || 'Unknown User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <Badge 
                    variant={user.role === 'ADMIN' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {user.role}
                  </Badge>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {format(new Date(user.createdAt), 'MMM dd')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {!recentNotificationsData.notifications || recentNotificationsData.notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent notifications</p>
            ) : (
              recentNotificationsData.notifications?.map((notification) => (
                <div key={notification.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      notification.type === 'system' ? 'bg-red-500' :
                      notification.type === 'appointment' ? 'bg-blue-500' :
                      notification.type === 'queue' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{notification.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center mt-1 space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {notification.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(notification.createdAt), 'MMM dd, HH:mm')}
                      </span>
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RecentSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminRecentPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Recent Activity</h2>
      <Suspense fallback={<RecentSkeleton />}>
        <RecentContent />
      </Suspense>
    </div>
  );
}