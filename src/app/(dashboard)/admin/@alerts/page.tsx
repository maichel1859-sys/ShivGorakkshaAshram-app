import { Suspense } from 'react';
import { getSystemAlerts } from '@/lib/actions/dashboard-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Shield, Activity } from 'lucide-react';
import { format } from 'date-fns';

async function AlertsContent() {
  const result = await getSystemAlerts();
  
  if (!result.success || !result.data) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Failed to load system alerts</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { recentErrors, failedLogins, systemHealth } = result.data;

  return (
    <div className="space-y-4">
      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>System Health</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-sm">Status: {systemHealth.status}</span>
            </div>
            <Badge variant="outline" className="text-green-600">
              Healthy
            </Badge>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Uptime: {Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m
          </div>
        </CardContent>
      </Card>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Recent Errors</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent errors</p>
          ) : (
            <div className="space-y-2">
              {recentErrors.slice(0, 5).map((error) => (
                <div key={error.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="text-sm font-medium">{error.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(error.createdAt), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                  <Badge variant="destructive">Error</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Failed Logins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-red-500" />
            <span>Failed Login Attempts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {failedLogins.length === 0 ? (
            <p className="text-sm text-muted-foreground">No failed login attempts</p>
          ) : (
            <div className="space-y-2">
              {failedLogins.slice(0, 5).map((login) => (
                <div key={login.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="text-sm font-medium">Failed Login</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(login.createdAt), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                  <Badge variant="destructive">Security</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AlertsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminAlertsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">System Alerts</h2>
      <Suspense fallback={<AlertsSkeleton />}>
        <AlertsContent />
      </Suspense>
    </div>
  );
}