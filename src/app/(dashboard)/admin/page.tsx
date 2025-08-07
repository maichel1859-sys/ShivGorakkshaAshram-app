import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/core/auth";
import { getAdminDashboardStats, getSystemAlerts } from "@/lib/actions/dashboard-actions";
import { DashboardStats } from "@/components/server/dashboard-stats";
import { SystemAlerts } from "@/components/server/system-alerts";
import { QuickActions } from "@/components/dashboard/shared/quick-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CogIcon,
} from "@heroicons/react/24/outline";

// Server Component for Dashboard Stats
async function DashboardStatsServer() {
  const statsResult = await getAdminDashboardStats();

  if (!statsResult.success) {
    return (
      <Alert>
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard statistics: {statsResult.error}
        </AlertDescription>
      </Alert>
    );
  }

  return <DashboardStats />;
}

// Server Component for System Alerts
async function SystemAlertsServer() {
  const alertsResult = await getSystemAlerts();

  if (!alertsResult.success || !alertsResult.data) {
    return (
      <Alert>
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertDescription>
          Failed to load system alerts: {alertsResult.error}
        </AlertDescription>
      </Alert>
    );
  }

  // Transform the data to match the expected interface
  const transformedAlerts = {
    recentErrors: alertsResult.data.recentErrors?.map((error) => ({
      id: error.id,
      action: error.action,
      resource: error.resource,
      createdAt: error.createdAt.toISOString(),
    })),
    failedLogins: alertsResult.data.failedLogins?.map((login) => ({
      id: login.id,
      action: login.action,
      ipAddress: login.ipAddress,
      createdAt: login.createdAt.toISOString(),
    })),
    systemHealth: alertsResult.data.systemHealth,
  };

  return <SystemAlerts alerts={transformedAlerts} />;
}

// Server Component for Recent Activity
async function RecentActivityServer() {
  const statsResult = await getAdminDashboardStats();

  if (
    !statsResult.success ||
    !statsResult.data ||
    !statsResult.data.recentActivity
  ) {
    return (
      <Alert>
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertDescription>
          Failed to load recent activity:{" "}
          {statsResult.error || "No data available"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Latest system activities and user actions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statsResult.data.recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Badge variant={getActivityVariant(activity.type)}>
                  {activity.type}
                </Badge>
                <div>
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.user} • {activity.timestamp}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function getActivityVariant(type: string) {
  switch (type) {
    case "user":
      return "default";
    case "appointment":
      return "secondary";
    case "remedy":
      return "outline";
    case "system":
      return "destructive";
    default:
      return "default";
  }
}

// Server Component for System Health Status
async function SystemHealthServer() {
  const statsResult = await getAdminDashboardStats();

  if (!statsResult.success || !statsResult.data) {
    return (
      <Alert>
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertDescription>
          Failed to load system health:{" "}
          {statsResult.error || "No data available"}
        </AlertDescription>
      </Alert>
    );
  }

  const { systemHealth } = statsResult.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {systemHealth === "good" && (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          )}
          {systemHealth === "warning" && (
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
          )}
          {systemHealth === "critical" && (
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
          )}
          System Health
        </CardTitle>
        <CardDescription>Current system status and performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              systemHealth === "good"
                ? "default"
                : systemHealth === "warning"
                  ? "secondary"
                  : "destructive"
            }
          >
            {systemHealth.toUpperCase()}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {systemHealth === "good" && "All systems operational"}
            {systemHealth === "warning" && "Some issues detected"}
            {systemHealth === "critical" && "Critical issues require attention"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name}. Here&apos;s what&apos;s happening
          with your system.
        </p>
      </div>

      {/* System Health and Alerts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Suspense fallback={<div>Loading system health...</div>}>
          <SystemHealthServer />
        </Suspense>

        <Suspense fallback={<div>Loading system alerts...</div>}>
          <SystemAlertsServer />
        </Suspense>
      </div>

      {/* Dashboard Stats */}
      <Suspense fallback={<div>Loading dashboard statistics...</div>}>
        <DashboardStatsServer />
      </Suspense>

      {/* Recent Activity and Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<div>Loading recent activity...</div>}>
          <RecentActivityServer />
        </Suspense>

        <QuickActions
          actions={[
            {
              id: "manage-users",
              title: "Manage Users",
              description: "View and manage user accounts",
              onClick: () => (window.location.href = "/admin/users"),
              icon: UsersIcon,
            },
            {
              id: "view-appointments",
              title: "View Appointments",
              description: "Monitor appointment bookings",
              onClick: () => (window.location.href = "/admin/appointments"),
              icon: CalendarDaysIcon,
            },
            {
              id: "system-settings",
              title: "System Settings",
              description: "Configure system preferences",
              onClick: () => (window.location.href = "/admin/settings"),
              icon: CogIcon,
            },
            {
              id: "generate-reports",
              title: "Generate Reports",
              description: "Create and export reports",
              onClick: () => (window.location.href = "/admin/reports"),
              icon: ChartBarIcon,
            },
          ]}
        />
      </div>
    </div>
  );
}
