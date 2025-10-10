"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  Activity,
  Plus,
  UserPlus,
  ListChecks,
  Search,
  UserCheck,
} from "lucide-react";
import { useCoordinatorDashboard } from "@/hooks/queries/use-coordinator";
import { PageSpinner } from "@/components/loading";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatTimeIST, formatDateIST } from "@/store/time-store";
import Link from "next/link";

export default function CoordinatorDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { t } = useLanguage();

  // React Query hook
  const { data: stats, isLoading, error } = useCoordinatorDashboard();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-700";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-700";
      case "LOW":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-green-100 text-green-700";
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      case "CANCELLED":
        return "bg-red-100 text-red-700";
      case "COMPLETED":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (isLoading) {
    return (
      <PageSpinner message={t("common.loading", "Loading dashboard...")} />
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600">
            {t("common.error", "Error Loading Dashboard")}
          </h3>
          <p className="text-muted-foreground">
            {t(
              "dashboard.failedToLoad",
              "Failed to load coordinator data. Please try again."
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("dashboard.coordinatorDashboard", "Coordinator Dashboard")}
          </h2>
          <p className="text-muted-foreground">
            {t(
              "dashboard.manageAppointments",
              "Manage appointments and devotee flow"
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="text-left sm:text-right">
            <div className="text-xl lg:text-2xl font-mono font-semibold">
              {formatTimeIST(currentTime)}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDateIST(currentTime)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/coordinator/reception">
              <Button className="text-sm">
                <Users className="h-4 w-4 mr-2" />
                {t("nav.reception", "Reception")}
              </Button>
            </Link>
            <Link href="/coordinator/appointments">
              <Button variant="outline" className="text-sm">
                <UserPlus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">
                  {t("appointments.book", "Book")}{" "}
                </span>
                {t("nav.appointments", "Appointment")}
              </Button>
            </Link>
            <Link href="/coordinator/queue">
              <Button variant="outline" className="text-sm">
                <ListChecks className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">
                  {t("queue.manage", "Manage")}{" "}
                </span>
                {t("nav.queue", "Queue")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="spiritual-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.todaysAppointments", "Today's Appointments")}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalAppointmentsToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.totalScheduled", "Total scheduled")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.pending", "Pending")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.pendingApprovals || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.awaitingConfirmation", "Awaiting confirmation")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.activeQueue", "Active Queue")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.waitingInQueue || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.waitingInQueue", "Devotees waiting")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.recentCheckIns", "Recent Check-ins")}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.checkedInToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.lastHour", "Last hour")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t("dashboard.quickActions", "Quick Actions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Link href="/coordinator/reception">
              <Button
                className="h-24 flex-col gap-2 text-left w-full"
                variant="outline"
              >
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="font-medium">New Devotee Visit</div>
                  <div className="text-sm text-gray-500">
                    Start triage assessment
                  </div>
                </div>
              </Button>
            </Link>

            <Link href="/coordinator/reception?action=lookup">
              <Button
                className="h-24 flex-col gap-2 text-left w-full"
                variant="outline"
              >
                <Search className="h-8 w-8 text-green-500" />
                <div>
                  <div className="font-medium">Find Existing Devotee</div>
                  <div className="text-sm text-gray-500">
                    Search by phone/name
                  </div>
                </div>
              </Button>
            </Link>

            <Link href="/coordinator/reception?action=checkin">
              <Button
                className="h-24 flex-col gap-2 text-left border-green-200 hover:bg-green-50 w-full"
                variant="outline"
              >
                <UserCheck className="h-8 w-8 text-green-500" />
                <div>
                  <div className="font-medium text-green-700">
                    Manual Check-in
                  </div>
                  <div className="text-sm text-green-500">
                    Help with appointment check-in
                  </div>
                </div>
              </Button>
            </Link>

            <Link href="/coordinator/reception?action=emergency">
              <Button
                className="h-24 flex-col gap-2 text-left border-red-200 hover:bg-red-50 w-full"
                variant="outline"
              >
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                  <div className="font-medium text-red-700">
                    Emergency Devotee
                  </div>
                  <div className="text-sm text-red-500">
                    Priority registration
                  </div>
                </div>
              </Button>
            </Link>

            <Link href="/coordinator/reception?action=registration">
              <Button
                className="h-24 flex-col gap-2 text-left w-full"
                variant="outline"
              >
                <UserPlus className="h-8 w-8 text-purple-500" />
                <div>
                  <div className="font-medium">Quick Registration</div>
                  <div className="text-sm text-gray-500">New devotee form</div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("appointments.upcoming", "Upcoming Appointments")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.upcomingAppointments &&
            stats.upcomingAppointments.length > 0 ? (
              stats.upcomingAppointments
                .slice(0, 5)
                .map(
                  (appointment: {
                    id: string;
                    devoteeName: string;
                    gurujiName: string;
                    time: string;
                    status: string;
                    priority: string;
                  }) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {appointment.devoteeName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {appointment.devoteeName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.gurujiName} •{" "}
                            {useTimeStore.getState().formatTime(appointment.time)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(appointment.status)}>
                          {t(
                            `appointments.status.${appointment.status.toLowerCase()}`,
                            appointment.status
                          )}
                        </Badge>
                        <Badge
                          className={getPriorityColor(appointment.priority)}
                        >
                          {t(
                            `common.priority.${appointment.priority.toLowerCase()}`,
                            appointment.priority
                          )}
                        </Badge>
                      </div>
                    </div>
                  )
                )
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t("appointments.noUpcoming", "No upcoming appointments")}
                </p>
                <Link
                  href="/coordinator/appointments"
                  className="inline-block mt-2"
                >
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("appointments.bookFirst", "Book First Appointment")}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useTimeStore } from "@/store/time-store";


