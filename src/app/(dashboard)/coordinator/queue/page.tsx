"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  Clock,
  Search,
  RefreshCw,
  Phone,
  UserCheck,
  CheckCircle,
  XCircle
} from "lucide-react";
import { PageSpinner } from "@/components/loading";
import { useQueueUnified } from "@/hooks/use-queue-unified";
import type { QueueStatus, QueueEntry } from "@/types/queue";
import { showToast, commonToasts } from "@/lib/toast";
import { startConsultation, updateQueueStatus } from "@/lib/actions/queue-actions";
import { formatTimeIST } from "@/store/time-store";

export default function CoordinatorQueuePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Use unified queue hook with React Query caching and socket fallback
  const {
    queueEntries,
    loading,
    stats,
    refetch: loadQueueEntries,
  } = useQueueUnified({
    role: 'coordinator',
    autoRefresh: true,
    refreshInterval: 30000,
    enableRealtime: true,
  });

  // Filter entries manually since filterEntries function is not available
  const filteredEntries = queueEntries.filter((entry: QueueEntry) => {
    const matchesSearch = !searchTerm || 
      entry.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.user.phone?.includes(searchTerm) ||
      entry.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || entry.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

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
        return "bg-blue-100 text-blue-800";
    }
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "WAITING":
        return <Clock className="h-4 w-4" />;
      case "IN_PROGRESS":
        return <UserCheck className="h-4 w-4" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Queue action handlers
  const handleStartConsultation = async (entry: QueueEntry) => {
    try {
      const formData = new FormData();
      formData.append('queueEntryId', entry.id);
      
      const result = await startConsultation(formData);
      if (result.success) {
        commonToasts.consultationStarted(entry.user.name || 'Unknown User');
        await loadQueueEntries();
      } else {
        showToast.error(result.error || 'Failed to start consultation');
      }
    } catch (error) {
      console.error('Error starting consultation:', error);
      showToast.error('Failed to start consultation');
    }
  };

  const handleUpdateStatus = async (entryId: string, newStatus: QueueStatus) => {
    try {
      const formData = new FormData();
      formData.append('queueEntryId', entryId);
      formData.append('status', newStatus);
      
      const result = await updateQueueStatus(formData);
      if (result.success) {
        showToast.success(`Status updated to ${newStatus}`);
        await loadQueueEntries();
      } else {
        showToast.error(result.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showToast.error('Failed to update status');
    }
  };


  if (loading) {
    return <PageSpinner message="Loading queue..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Queue Management</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage devotee queues across all gurujis
          </p>
        </div>
        <Button onClick={() => loadQueueEntries()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search devotees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
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
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Queue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.waiting}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.inProgress}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.completed}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Wait</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageWaitTime}m
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Queue Entries</h3>
              <p className="text-muted-foreground">
                {queueEntries.length === 0 
                  ? "No devotees in queue currently."
                  : "No entries match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry: QueueEntry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="font-semibold text-primary">#{entry.position}</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{entry.user.name || 'Unknown User'}</h3>
                        <Badge className={getPriorityColor(entry.priority || 'NORMAL')}>
                          {entry.priority || 'NORMAL'}
                        </Badge>
                        <Badge className={getStatusColor(entry.status)} variant="outline">
                          {getStatusIcon(entry.status)}
                          <span className="ml-1">{entry.status}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Phone className="mr-1 h-3 w-3" />
                          {entry.user.phone || 'No phone'}
                        </span>
                        <span className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          Checked in: {formatTimeIST(entry.checkedInAt)}
                        </span>
                        {entry.estimatedWait && (
                          <span className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            Est. wait: {entry.estimatedWait}m
                          </span>
                        )}
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Notes:</strong> {entry.notes}
                        </p>
                      )}
                      {entry.guruji && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Assigned to:</strong> {entry.guruji.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {entry.status === 'WAITING' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleStartConsultation(entry)}
                      >
                        Start Consultation
                      </Button>
                    )}
                    {entry.status === 'IN_PROGRESS' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleUpdateStatus(entry.id, 'COMPLETED')}
                      >
                        Mark Complete
                      </Button>
                    )}
                    {(entry.status === 'WAITING' || entry.status === 'IN_PROGRESS') && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleUpdateStatus(entry.id, 'CANCELLED')}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

