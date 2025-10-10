"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket, SocketEvents } from "@/lib/socket/socket-client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  Search,
  Filter,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  Users,
  CalendarDays,
  History,
} from "lucide-react";
import { PageSpinner } from "@/components/loading";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, isToday, isTomorrow, isThisWeek, isPast } from "date-fns";
import { useUserAppointments } from "@/hooks/queries/use-appointments";
import { useTimeStore } from "@/store/time-store";

interface AppointmentData {
  id: string;
  userId: string;
  gurujiId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  priority: string;
  reason: string | null;
  notes: string | null;
  checkedInAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  queueEntry: {
    id: string;
    position: number;
    status: string;
    checkedInAt: string | null;
    estimatedWait: number | null;
  } | null;
}

export default function GurujiAppointmentsPage() {
  const router = useRouter();
  const { socket } = useSocket();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");

  const {
    data: appointmentsData,
    isLoading,
    error,
    refetch,
  } = useUserAppointments();
  // Memoize appointments to prevent dependency issues
  const appointments = useMemo(() =>
    appointmentsData?.appointments || [],
    [appointmentsData?.appointments]
  );

  // Socket listener for appointment updates
  useEffect(() => {
    const handleAppointmentUpdate = (...args: unknown[]) => {
      const data = args[0] as {
        appointmentId: string;
        gurujiId?: string;
        status: string;
        action: string;
        devoteeName?: string;
        timestamp: string;
      };

      console.log('🔌 [Guruji] Received appointment update:', data);

      // Refresh appointments list
      refetch();
      router.refresh();

      // Show notifications based on action
      if (data.action === 'booked' || data.action === 'created') {
        toast.success('New appointment assigned to you!');
      } else if (data.status === 'CHECKED_IN') {
        const devoteeName = data.devoteeName || 'A devotee';
        toast.info(`${devoteeName} has checked in`);
      } else if (data.status === 'COMPLETED') {
        const devoteeName = data.devoteeName || 'A devotee';
        toast.success(`Consultation completed for ${devoteeName}`);
      }
    };

    socket.on(SocketEvents.APPOINTMENT_UPDATE, handleAppointmentUpdate);

    return () => {
      socket.off(SocketEvents.APPOINTMENT_UPDATE, handleAppointmentUpdate);
    };
  }, [socket, refetch, router]);

  // Filter appointments based on search and filters
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (appointment) =>
          appointment.user.name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          appointment.user.phone?.includes(searchTerm) ||
          appointment.reason?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (appointment) => appointment.status === statusFilter
      );
    }

    // Time filter
    if (timeFilter !== "all") {
      filtered = filtered.filter((appointment) => {
        const appointmentDate = new Date(appointment.date);
        switch (timeFilter) {
          case "today":
            return isToday(appointmentDate);
          case "tomorrow":
            return isTomorrow(appointmentDate);
          case "this-week":
            return isThisWeek(appointmentDate);
          case "past":
            return isPast(appointmentDate) && !isToday(appointmentDate);
          case "upcoming":
            return !isPast(appointmentDate);
          default:
            return true;
        }
      });
    }

    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [appointments, searchTerm, statusFilter, timeFilter]);

  // Group appointments for different views
  const appointmentGroups = useMemo(() => {
    if (!filteredAppointments) return { today: [], upcoming: [], past: [] };

    const today = filteredAppointments.filter((appointment) =>
      isToday(new Date(appointment.date))
    );
    const upcoming = filteredAppointments.filter(
      (appointment) =>
        !isPast(new Date(appointment.date)) &&
        !isToday(new Date(appointment.date))
    );
    const past = filteredAppointments.filter(
      (appointment) =>
        isPast(new Date(appointment.date)) &&
        !isToday(new Date(appointment.date))
    );

    return { today, upcoming, past };
  }, [filteredAppointments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "BOOKED":
        return "bg-blue-100 text-blue-800";
      case "CHECKED_IN":
        return "bg-green-100 text-green-800";
      case "COMPLETED":
        return "bg-gray-100 text-gray-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "NO_SHOW":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-700 border-red-200";
      case "HIGH":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "NORMAL":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "LOW":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getTimeLabel = (appointment: AppointmentData) => {
    const appointmentDate = new Date(appointment.date);
    if (isToday(appointmentDate)) return "Today";
    if (isTomorrow(appointmentDate)) return "Tomorrow";
    if (isPast(appointmentDate)) return "Past";
    return format(appointmentDate, "MMM dd, yyyy");
  };

  const AppointmentCard = ({ appointment }: { appointment: unknown }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apt = appointment as any;
    return (
      <Card
        key={apt.id as string}
        className="hover:shadow-md transition-shadow"
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              {/* Devotee Info */}
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {apt.user.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">
                    {apt.user.name || "Unknown Devotee"}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    {apt.user.phone && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{apt.user.phone}</span>
                      </div>
                    )}
                    {apt.user.email && (
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{apt.user.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="ml-12 space-y-2">
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {getTimeLabel(apt)} -{" "}
                      {useTimeStore.getState().formatDate(apt.date)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {useTimeStore.getState().formatTimeRange(apt.startTime, apt.endTime)}
                    </span>
                  </div>
                </div>

                {apt.reason && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Reason:</strong> {apt.reason}
                  </p>
                )}

                {apt.notes && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Notes:</strong> {apt.notes}
                  </p>
                )}

                {apt.queueEntry && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Queue Position:</strong> #{apt.queueEntry.position}{" "}
                    |                    <strong> Checked in:</strong>{" "}
                    {apt.queueEntry.checkedInAt
                      ? useTimeStore.getState().formatTime(apt.queueEntry.checkedInAt)
                      : "Not checked in"}
                  </div>
                )}
              </div>
            </div>

            {/* Status and Priority */}
            <div className="flex flex-col items-end space-y-2">
              <Badge className={getStatusColor(apt.status)}>
                {apt.status.replace("_", " ")}
              </Badge>
              <Badge
                variant="outline"
                className={getPriorityColor(apt.priority)}
              >
                {apt.priority}
              </Badge>
              {apt.checkedInAt && (
                <div className="text-xs text-green-600 flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Checked In</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <PageSpinner message="Loading appointments..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-muted-foreground">Failed to load appointments</p>
            <Button onClick={() => refetch()} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            My Appointments
          </h1>
          <p className="text-muted-foreground mt-2">
            View and manage all your scheduled appointments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <Calendar className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointmentGroups.today.length}
            </div>
            <p className="text-xs text-muted-foreground">Appointments today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointmentGroups.upcoming.length}
            </div>
            <p className="text-xs text-muted-foreground">Future appointments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                appointments.filter(
                  (appointment) =>
                    appointment.status === "COMPLETED"
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Total completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments.length}</div>
            <p className="text-xs text-muted-foreground">All appointments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search Devotees</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, phone, or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="BOOKED">Booked</SelectItem>
                  <SelectItem value="CHECKED_IN">Checked In</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="NO_SHOW">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="time">Time Period</Label>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List with Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({filteredAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="today">
            Today ({appointmentGroups.today.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming ({appointmentGroups.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({appointmentGroups.past.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No appointments found
                </h3>
                <p className="text-muted-foreground">
                  {appointments.length === 0
                    ? "You don't have any appointments scheduled yet."
                    : "Try adjusting your search criteria."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="today" className="space-y-4">
          {appointmentGroups.today.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No appointments today
                </h3>
                <p className="text-muted-foreground">
                  You have no appointments scheduled for today.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {appointmentGroups.today.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {appointmentGroups.upcoming.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No upcoming appointments
                </h3>
                <p className="text-muted-foreground">
                  You have no future appointments scheduled.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {appointmentGroups.upcoming.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {appointmentGroups.past.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No past appointments
                </h3>
                <p className="text-muted-foreground">
                  You have no appointment history to display.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {appointmentGroups.past.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
