"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserCheck,
  Clock,
  User,
  Search,
  Download,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { useGurujiConsultations } from "@/hooks/queries/use-guruji";

interface ConsultationSession {
  id: string;
  appointmentId: string;
  patientId: string;
  gurujiId: string;
  startTime: string;
  endTime?: string;
  duration?: number | null;
  symptoms?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  recordings?: unknown;
  createdAt: Date;
  updatedAt: Date;
  patient: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  appointment: {
    id: string;
    date: string;
    startTime: string;
    reason: string | null;
  };
}

export default function GurujiConsultationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Use React Query for data fetching
  const {
    data: consultations = [],
    isLoading,
    error,
  } = useGurujiConsultations();

  // Helper function to determine consultation status
  const getConsultationStatus = (consultation: ConsultationSession): string => {
    if (consultation.endTime) {
      return "COMPLETED";
    } else if (consultation.startTime) {
      return "IN_PROGRESS";
    } else {
      return "SCHEDULED";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredConsultations = consultations.filter((consultation) => {
    const matchesSearch =
      consultation.patient.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      false ||
      consultation.patient.email
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      false;
    const consultationStatus = getConsultationStatus(consultation);
    const matchesStatus =
      statusFilter === "all" || consultationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeConsultations = consultations.filter(
    (c) => getConsultationStatus(c) === "IN_PROGRESS"
  ).length;
  const completedToday = consultations.filter(
    (c) =>
      getConsultationStatus(c) === "COMPLETED" &&
      c.endTime &&
      new Date(c.endTime).toDateString() === new Date().toDateString()
  ).length;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-600">
              Error loading consultations
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              My Consultations
            </h1>
            <p className="text-muted-foreground">
              Manage your consultation sessions
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Start Consultation
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Consultations
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{consultations.length}</div>
              <p className="text-xs text-muted-foreground">
                All time consultations
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Sessions
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeConsultations}</div>
              <p className="text-xs text-muted-foreground">
                Currently in progress
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Today
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedToday}</div>
              <p className="text-xs text-muted-foreground">
                Sessions completed today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Search and filter consultation sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by patient name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Consultations List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Consultation Sessions</CardTitle>
                <CardDescription>
                  {filteredConsultations.length} sessions found
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredConsultations.length === 0 ? (
                <div className="text-center py-8">
                  <UserCheck className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">
                    No consultations
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No consultation sessions found matching your criteria.
                  </p>
                </div>
              ) : (
                filteredConsultations.map((consultation) => (
                  <div
                    key={consultation.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <UserCheck className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">
                            {consultation.patient.name}
                          </h3>
                          <Badge
                            className={getStatusColor(
                              getConsultationStatus(consultation)
                            )}
                          >
                            {getConsultationStatus(consultation).replace(
                              "_",
                              " "
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {consultation.patient.email}
                        </p>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            {new Date(
                              consultation.startTime
                            ).toLocaleDateString()}{" "}
                            at{" "}
                            {new Date(
                              consultation.startTime
                            ).toLocaleTimeString()}
                          </span>
                          {consultation.appointment.reason && (
                            <span className="flex items-center">
                              <User className="mr-1 h-3 w-3" />
                              {consultation.appointment.reason}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
