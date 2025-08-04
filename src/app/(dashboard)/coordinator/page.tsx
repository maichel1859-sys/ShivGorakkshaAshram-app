"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Activity,
  TrendingUp,
  UserCheck,
  Settings,
  Bell,
  QrCode,
  Phone,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

interface CoordinatorStats {
  totalAppointmentsToday: number;
  checkedInToday: number;
  waitingInQueue: number;
  completedToday: number;
  pendingApprovals: number;
  upcomingAppointments: Array<{
    id: string;
    patientName: string;
    gurujiName: string;
    time: string;
    status: string;
    priority: string;
  }>;
  queueSummary: Array<{
    gurujiId: string;
    gurujiName: string;
    waitingCount: number;
    inProgressCount: number;
    averageWaitTime: number;
  }>;
  todayStats: {
    appointments: number;
    checkins: number;
    completions: number;
    cancellations: number;
  };
}

export default function CoordinatorDashboard() {
  const [stats, setStats] = useState<CoordinatorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/coordinator/dashboard");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch coordinator dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
                {stats?.checkedInToday || 0} checked in
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Queue</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
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
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.completedToday || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Consultations done
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Approvals
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.pendingApprovals || 0}
              </div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="queue">Queue Management</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Upcoming Appointments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Upcoming Appointments</span>
                  </CardTitle>
                  <CardDescription>
                    Next appointments requiring attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.upcomingAppointments
                      ?.slice(0, 5)
                      .map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">
                              {appointment.patientName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              with {appointment.gurujiName}
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="font-mono text-sm">
                              {appointment.time}
                            </div>
                            <div className="flex space-x-1">
                              <Badge
                                className={getStatusColor(appointment.status)}
                              >
                                {appointment.status}
                              </Badge>
                              <Badge
                                className={getPriorityColor(
                                  appointment.priority
                                )}
                              >
                                {appointment.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    {(!stats?.upcomingAppointments ||
                      stats.upcomingAppointments.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center">
                        No upcoming appointments
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Today's Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Today&apos;s Summary</span>
                  </CardTitle>
                  <CardDescription>Daily activity overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Appointments</span>
                      </div>
                      <span className="font-medium">
                        {stats?.todayStats?.appointments || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Check-ins</span>
                      </div>
                      <span className="font-medium">
                        {stats?.todayStats?.checkins || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-purple-600" />
                        <span className="text-sm">Completions</span>
                      </div>
                      <span className="font-medium">
                        {stats?.todayStats?.completions || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">Cancellations</span>
                      </div>
                      <span className="font-medium">
                        {stats?.todayStats?.cancellations || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="queue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Queue Status by Guruji</span>
                </CardTitle>
                <CardDescription>
                  Real-time queue management overview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.queueSummary?.map((queue) => (
                    <div key={queue.gurujiId} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{queue.gurujiName}</h3>
                        <div className="flex space-x-2">
                          <Badge variant="outline">
                            {queue.waitingCount} waiting
                          </Badge>
                          <Badge variant="outline">
                            {queue.inProgressCount} in progress
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Average wait time</span>
                        <span>{queue.averageWaitTime} minutes</span>
                      </div>
                    </div>
                  ))}
                  {(!stats?.queueSummary ||
                    stats.queueSummary.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center">
                      No active queues
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Management</CardTitle>
                <CardDescription>
                  Tools to manage patient appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Link href="/coordinator/appointments">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-4">
                          <Calendar className="h-8 w-8 text-primary" />
                          <div>
                            <h3 className="font-medium">
                              View All Appointments
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Browse and manage appointments
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link href="/coordinator/appointments/create">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-4">
                          <Calendar className="h-8 w-8 text-primary" />
                          <div>
                            <h3 className="font-medium">Book Appointment</h3>
                            <p className="text-sm text-muted-foreground">
                              Create new appointment
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link href="/coordinator/appointments/pending">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-4">
                          <AlertTriangle className="h-8 w-8 text-primary" />
                          <div>
                            <h3 className="font-medium">Pending Approvals</h3>
                            <p className="text-sm text-muted-foreground">
                              Review and approve
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Coordinator Tools</CardTitle>
                <CardDescription>
                  Essential tools for daily coordination tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Link href="/coordinator/checkin">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-4">
                          <QrCode className="h-8 w-8 text-primary" />
                          <div>
                            <h3 className="font-medium">Manual Check-in</h3>
                            <p className="text-sm text-muted-foreground">
                              Help patients check in
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link href="/coordinator/queue">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-4">
                          <Users className="h-8 w-8 text-primary" />
                          <div>
                            <h3 className="font-medium">Manage Queue</h3>
                            <p className="text-sm text-muted-foreground">
                              Reorder and manage queues
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link href="/coordinator/notifications">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-4">
                          <Bell className="h-8 w-8 text-primary" />
                          <div>
                            <h3 className="font-medium">Send Notifications</h3>
                            <p className="text-sm text-muted-foreground">
                              Notify patients and gurujis
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link href="/coordinator/reports">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-4">
                          <TrendingUp className="h-8 w-8 text-primary" />
                          <div>
                            <h3 className="font-medium">Daily Reports</h3>
                            <p className="text-sm text-muted-foreground">
                              Generate activity reports
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link href="/coordinator/settings">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-4">
                          <Settings className="h-8 w-8 text-primary" />
                          <div>
                            <h3 className="font-medium">Preferences</h3>
                            <p className="text-sm text-muted-foreground">
                              Configure settings
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-4">
                        <Phone className="h-8 w-8 text-primary" />
                        <div>
                          <h3 className="font-medium">Emergency Contact</h3>
                          <p className="text-sm text-muted-foreground">
                            Quick access to help
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
