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
import { Clock, User, Search, Download, Plus, AlertCircle } from "lucide-react";
import { useAdminQueue } from "@/hooks/queries";

interface QueueEntry {
  id: string;
  appointmentId: string;
  userId: string;
  gurujiId: string | null;
  position: number;
  status: string;
  priority: string;
  estimatedWait: number | null;
  checkedInAt: string;
  startedAt?: string;
  completedAt?: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  guruji?: {
    id: string;
    name: string | null;
  } | null;
  appointment: {
    id: string;
    date: string;
    startTime: Date;
    reason: string | null;
  };
}

export default function AdminQueuePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Use React Query for data fetching
  const { data: queueEntries = [], isLoading, error } = useAdminQueue();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "WAITING":
        return "bg-yellow-100 text-yellow-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "NORMAL":
        return "bg-blue-100 text-blue-800";
      case "LOW":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredQueueEntries = queueEntries.filter((entry: QueueEntry) => {
    const matchesSearch =
      entry.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      entry.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;
    const matchesStatus =
      statusFilter === "all" || entry.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const waitingCount = queueEntries.filter(
    (entry: QueueEntry) => entry.status === "WAITING"
  ).length;
  const inProgressCount = queueEntries.filter(
    (entry: QueueEntry) => entry.status === "IN_PROGRESS"
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
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-600">
              Error loading queue data
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
              Queue Management
            </h1>
            <p className="text-muted-foreground">
              Monitor and manage all queue entries across the system
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add to Queue
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total in Queue
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueEntries.length}</div>
              <p className="text-xs text-muted-foreground">All queue entries</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waiting</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{waitingCount}</div>
              <p className="text-xs text-muted-foreground">Patients waiting</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressCount}</div>
              <p className="text-xs text-muted-foreground">
                Currently being served
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Search and filter queue entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
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
                  <SelectItem value="WAITING">Waiting</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Queue List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Queue Entries</CardTitle>
                <CardDescription>
                  {filteredQueueEntries.length} entries found
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
              {filteredQueueEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">
                    No queue entries
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No queue entries found matching your criteria.
                  </p>
                </div>
              ) : (
                filteredQueueEntries.map((entry: QueueEntry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                          {entry.position}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{entry.user.name}</h3>
                          <Badge className={getStatusColor(entry.status)}>
                            {entry.status.replace("_", " ")}
                          </Badge>
                          <Badge className={getPriorityColor(entry.priority)}>
                            {entry.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {entry.user.email}
                        </p>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            Checked in:{" "}
                            {new Date(entry.checkedInAt).toLocaleTimeString()}
                          </span>
                          {entry.estimatedWait && (
                            <span className="flex items-center">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Est. wait: {entry.estimatedWait}m
                            </span>
                          )}
                          {entry.guruji && (
                            <span className="flex items-center">
                              <User className="mr-1 h-3 w-3" />
                              {entry.guruji.name}
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
