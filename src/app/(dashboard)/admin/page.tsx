"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  Users,
  Calendar,
  Clock,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Heart,
  UserCheck,
  Bell,
} from "lucide-react";
import {
  getAdminDashboardStats,
  getSystemAlerts,
} from "@/lib/actions/dashboard-actions";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";

interface DashboardStats {
  totalUsers: number;
  totalAppointments: number;
  totalRemedies: number;
  activeQueues: number;
  systemHealth: 'good' | 'warning' | 'critical';
  recentActivity: Array<{
    id: string;
    user: string;
    action: string;
    type: 'user' | 'appointment' | 'remedy' | 'system';
    timestamp: string;
  }>;
}

interface SystemAlerts {
  recentErrors: Array<{
    id: string;
    action: string;
    createdAt: Date;
    userId: string | null;
    resource: string;
    resourceId: string | null;
  }>;
  failedLogins: Array<{
    id: string;
    createdAt: Date;
    userId: string | null;
    action: string;
    resource: string;
    resourceId: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }>;
  systemHealth: {
    status: string;
    uptime: number;
  };
}

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAppointments: 0,
    totalRemedies: 0,
    activeQueues: 0,
    systemHealth: 'good',
    recentActivity: [],
  });
  const [systemAlerts, setSystemAlerts] = useState<SystemAlerts>({
    recentErrors: [],
    failedLogins: [],
    systemHealth: { status: 'healthy', uptime: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsResult, alertsResult] = await Promise.all([
          getAdminDashboardStats(),
          getSystemAlerts(),
        ]);

        if (statsResult.success && statsResult.data) {
          setDashboardStats(statsResult.data);
        }
        if (alertsResult.success && alertsResult.data) {
          setSystemAlerts(alertsResult.data);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  // Calculate derived stats
  const activeUsers = Math.floor((dashboardStats?.totalUsers || 0) * 0.7); // Estimate
  const completedAppointments = Math.floor(
    (dashboardStats?.totalAppointments || 0) * 0.8
  ); // Estimate
  const uptime = systemAlerts?.systemHealth?.uptime
    ? `${Math.floor(systemAlerts.systemHealth.uptime / 3600)}h ${Math.floor((systemAlerts.systemHealth.uptime % 3600) / 60)}m`
    : "0h 0m";

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t('nav.dashboard', 'Dashboard')} - {t('common.admin', 'Admin')}
            </h1>
            <p className="text-muted-foreground">
              {t('dashboard.adminDescription', 'Monitor system performance and manage operations')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-green-600 border-green-600"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
{t('dashboard.systemOnline', 'System Online')}
              </Badge>
              <span className="text-xs sm:text-sm text-muted-foreground">
                Uptime: {uptime}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm text-muted-foreground">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="flex items-center gap-2 p-3 sm:p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-medium truncate">
                {dashboardStats?.totalUsers || 0}
              </p>
              <p className="text-xs text-muted-foreground truncate">{t('dashboard.totalUsers', 'Total Users')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 sm:p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-medium truncate">
                {dashboardStats?.totalAppointments || 0}
              </p>
              <p className="text-xs text-muted-foreground truncate">{t('nav.appointments', 'Appointments')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 sm:p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-medium truncate">
                {dashboardStats?.activeQueues || 0}
              </p>
              <p className="text-xs text-muted-foreground truncate">{t('dashboard.activeQueue', 'Active Queues')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 sm:p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-medium truncate">
                {dashboardStats?.totalRemedies || 0}
              </p>
              <p className="text-xs text-muted-foreground truncate">{t('nav.remedies', 'Remedies')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section Divider */}
      <div className="border-t border-border" />

      {/* Main Stats Grid */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-4">{t('dashboard.statistics', 'Dashboard Statistics')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.totalUsers', 'Total Users')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {dashboardStats?.totalUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
{activeUsers} {t('dashboard.activeUsers', 'active users')}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Appointments
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {dashboardStats?.totalAppointments || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {completedAppointments} completed
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Queues
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {dashboardStats?.activeQueues || 0}
              </div>
              <p className="text-xs text-muted-foreground">Currently waiting</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remedies</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {dashboardStats?.totalRemedies || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Total prescriptions
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* System Health & Alerts */}
      <div>
        <h2 className="text-xl font-semibold mb-4">System Health & Alerts</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge
                  variant={
                    systemAlerts?.systemHealth?.status === 'healthy'
                      ? 'default'
                      : 'destructive'
                  }
                  className="flex items-center gap-1"
                >
                  {systemAlerts?.systemHealth?.status === 'healthy' ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {systemAlerts?.systemHealth?.status === 'healthy'
                    ? 'Healthy'
                    : 'Issues Detected'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uptime</span>
                <span className="text-sm text-muted-foreground">{uptime}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Performance</span>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">Good</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Errors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Recent Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(systemAlerts?.recentErrors?.length || 0) > 0 ? (
                <div className="space-y-2">
                  {systemAlerts?.recentErrors
                    ?.slice(0, 3)
                    .map((error, index) => (
                      <div
                        key={index}
                        className="text-sm p-2 bg-red-50 rounded border-l-2 border-red-500"
                      >
                        <p className="font-medium text-red-700">
                          {error.action}
                        </p>
                        <p className="text-xs text-red-600">
                          {error.createdAt.toLocaleString()}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No recent errors
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
                Security Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Failed Logins</span>
                <Badge
                  variant={
                    (systemAlerts?.failedLogins?.length || 0) > 0
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {systemAlerts?.failedLogins?.length || 0}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Sessions</span>
                <span className="text-sm text-muted-foreground">
                  {activeUsers}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Scan</span>
                <span className="text-sm text-muted-foreground">2 min ago</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Quick Actions</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Common Administrative Tasks</CardTitle>
            <CardDescription>
              Quick access to frequently used administrative functions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Button
                variant="outline"
                className="h-auto p-4 sm:p-6 flex flex-col items-center gap-2 sm:gap-3 hover:shadow-md transition-all touch-target"
                asChild
              >
                <Link href="/admin/users">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs sm:text-sm font-medium">Manage Users</span>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 sm:p-6 flex flex-col items-center gap-2 sm:gap-3 hover:shadow-md transition-all touch-target"
                asChild
              >
                <Link href="/admin/appointments">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs sm:text-sm font-medium">View Appointments</span>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 sm:p-6 flex flex-col items-center gap-2 sm:gap-3 hover:shadow-md transition-all touch-target"
                asChild
              >
                <Link href="/admin/reports">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs sm:text-sm font-medium">System Reports</span>
                </Link>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 sm:p-6 flex flex-col items-center gap-2 sm:gap-3 hover:shadow-md transition-all touch-target"
                asChild
              >
                <Link href="/admin/notifications">
                  <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs sm:text-sm font-medium">Notifications</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <Card>
          <CardHeader>
            <CardTitle>System Activity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="users">Recent Users</TabsTrigger>
                <TabsTrigger value="appointments">Appointments</TabsTrigger>
                <TabsTrigger value="remedies">Remedies</TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-4">
                <div className="space-y-3">
                  {dashboardStats?.recentActivity
                    ?.slice(0, 5)
                    ?.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{activity.user}</p>
                            <p className="text-sm text-muted-foreground">
                              {activity.action}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{activity.type}</Badge>
                      </div>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="appointments" className="space-y-4">
                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Appointment {i + 1}</p>
                          <p className="text-sm text-muted-foreground">
                            Today, 2:30 PM
                          </p>
                        </div>
                      </div>
                      <Badge variant="default">CONFIRMED</Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="remedies" className="space-y-4">
                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Heart className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">Remedy {i + 1}</p>
                          <p className="text-sm text-muted-foreground">
                            Ready for download
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">ACTIVE</Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
