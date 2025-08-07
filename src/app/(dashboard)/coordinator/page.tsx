"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  Phone,
  Activity,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { useCoordinatorDashboard } from "@/hooks/queries/use-coordinator";

export default function CoordinatorDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

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
      <DashboardLayout
        title="Coordinator Dashboard"
        allowedRoles={["COORDINATOR"]}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        title="Coordinator Dashboard"
        allowedRoles={["COORDINATOR"]}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600">
              Error Loading Dashboard
            </h3>
            <p className="text-muted-foreground">
              Failed to load coordinator data. Please try again.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Coordinator Dashboard"
      allowedRoles={["COORDINATOR"]}
    >
      <div className="space-y-6">
        {/* Header with Time */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Coordinator Dashboard
            </h2>
            <p className="text-muted-foreground">
              Manage daily operations and assist with patient flow
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono">
              {currentTime.toLocaleTimeString()}
            </div>
            <div className="text-sm text-muted-foreground">
              {currentTime.toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today&apos;s Appointments
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalAppointmentsToday || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Total scheduled today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Checked In Today
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.checkedInToday || 0}
              </div>
              <p className="text-xs text-muted-foreground">Patients arrived</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Waiting in Queue
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.waitingInQueue || 0}
              </div>
              <p className="text-xs text-muted-foreground">Currently waiting</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Today
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.completedToday || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Consultations finished
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Queue Summary */}
        {stats?.queueSummary && stats.queueSummary.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Queue Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stats.queueSummary.map((summary) => (
                  <div
                    key={summary.gurujiId}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{summary.gurujiName}</h3>
                      <Badge variant="outline">
                        {summary.waitingCount + summary.inProgressCount} total
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Waiting:</span>
                        <span className="font-medium">
                          {summary.waitingCount}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>In Progress:</span>
                        <span className="font-medium">
                          {summary.inProgressCount}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Avg Wait:</span>
                        <span className="font-medium">
                          {summary.averageWaitTime}m
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Appointments */}
        {stats?.upcomingAppointments &&
          stats.upcomingAppointments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Recent Check-ins</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.upcomingAppointments.slice(0, 5).map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>
                            {appointment.patientName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">
                            {appointment.patientName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {appointment.gurujiName} •{" "}
                            {new Date(appointment.time).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                        <Badge
                          className={getPriorityColor(appointment.priority)}
                        >
                          {appointment.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto p-4">
                <div className="flex flex-col items-center space-y-2">
                  <Users className="h-6 w-6" />
                  <span>Manage Queue</span>
                </div>
              </Button>

              <Button variant="outline" className="h-auto p-4">
                <div className="flex flex-col items-center space-y-2">
                  <Calendar className="h-6 w-6" />
                  <span>View Schedule</span>
                </div>
              </Button>

              <Button variant="outline" className="h-auto p-4">
                <div className="flex flex-col items-center space-y-2">
                  <Phone className="h-6 w-6" />
                  <span>Contact Support</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
