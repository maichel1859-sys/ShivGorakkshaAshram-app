"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "next-auth/react";
import Link from "next/link";
import React from "react";
import {
  Calendar,
  Clock,
  Heart,
  Plus,
  AlertCircle,
  Activity,
} from "lucide-react";
import { useUserDashboard, useNotifications } from "@/hooks/queries";
import { useLoadingStore } from "@/lib/stores/loading-store";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

export default function UserDashboard() {
  const { data: session } = useSession();
  const { data: dashboardData, isLoading, error } = useUserDashboard();
  const { data: notificationsData } = useNotifications({ limit: 5 });
  const { setDashboardLoading } = useLoadingStore();

  // Update loading state
  React.useEffect(() => {
    setDashboardLoading(isLoading);
  }, [isLoading, setDashboardLoading]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <LoadingOverlay loadingKey="dashboardLoading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-muted-foreground">
              Failed to load dashboard data
            </p>
          </div>
        </div>
      </div>
    );
  }

  const appointmentCount = dashboardData?.stats?.appointmentCount || 0;
  const currentQueuePosition = dashboardData?.stats?.currentQueuePosition;
  const currentQueueStatus = dashboardData?.stats?.currentQueueStatus;
  const recentAppointments = dashboardData?.recentAppointments || [];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Welcome back, {session?.user.name?.split(" ")[0]}!
          </h2>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your appointments today.
          </p>
        </div>
        <Button asChild>
          <Link href="/user/appointments/book">
            <Plus className="mr-2 h-4 w-4" />
            Book Appointment
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Next Appointment
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">No upcoming</div>
            <p className="text-xs text-muted-foreground">
              Book your next appointment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Queue Position
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentQueuePosition ? `#${currentQueuePosition}` : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentQueuePosition && currentQueueStatus ? currentQueueStatus.toLowerCase() : 'Not in queue'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Remedies
            </CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Ready for download</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Appointments
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointmentCount}</div>
            <p className="text-xs text-muted-foreground">0 completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Appointments
            </CardTitle>
            <CardDescription>Your recent appointments</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAppointments.length > 0 ? (
              <div className="space-y-3">
                {recentAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {new Date(appointment.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.guruji?.name || 'Unknown Guruji'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {appointment.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                No recent appointments
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
            <CardDescription>Latest updates and reminders</CardDescription>
          </CardHeader>
          <CardContent>
            {notificationsData?.notifications &&
            notificationsData.notifications.length > 0 ? (
              <div className="space-y-3">
                {notificationsData.notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{n.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {n.message}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                No recent notifications
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Access frequently used features</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" asChild>
            <Link href="/user/appointments/book">Book Appointment</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/user/queue">My Queue</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/user/remedies">My Remedies</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/user/qr">QR Scanner</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
