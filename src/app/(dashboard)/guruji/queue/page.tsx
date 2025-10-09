"use client";

import { useState } from "react";
// import { useSession } from "next-auth/react"; // Not used in current implementation
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageSpinner } from "@/components/loading";
import { useQueueUnified } from "@/hooks/use-queue-unified";
import { formatTimeIST } from "@/store/time-store";
import { showToast } from "@/lib/toast";
import { 
  Clock, 
  Users, 
  Play, 
  CheckCircle, 
  AlertCircle,
  Search,
  Filter,
  Loader2
} from "lucide-react";
import type { QueueEntry } from "@/types/queue";

export default function GurujiQueuePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startingConsultationId, setStartingConsultationId] = useState<string | null>(null);

  // Use unified queue hook
  const { 
    queueEntries, 
    stats, 
    loading, 
    startConsultation, 
    completeConsultation,
    refetch 
  } = useQueueUnified({
    role: "guruji",
    autoRefresh: true,
    refreshInterval: 5000,
    enableRealtime: true,
  });

  // Filter queue entries
  const filteredQueueEntries = queueEntries.filter((entry) => {
    const matchesSearch = entry.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handle starting consultation
  const handleStartConsultation = async (entry: QueueEntry) => {
    setStartingConsultationId(entry.id);
    try {
      await startConsultation(entry.id);
      showToast.success(`Started consultation with ${entry.user.name}`);
    } catch (error) {
      console.error('Error starting consultation:', error);
      showToast.error('Failed to start consultation');
    } finally {
      setStartingConsultationId(null);
    }
  };

  // Handle completing consultation
  const handleCompleteConsultation = async (entry: QueueEntry) => {
    try {
      await completeConsultation(entry.id);
      showToast.success(`Completed consultation with ${entry.user.name}`);
    } catch (error) {
      console.error('Error completing consultation:', error);
      showToast.error('Failed to complete consultation');
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return <PageSpinner message="Loading queue..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Queue Management</h1>
          <p className="text-muted-foreground">
            Manage your consultation queue and devotees
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          Refresh Queue
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total in Queue</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Waiting</p>
                <p className="text-2xl font-bold">{stats.waiting}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Play className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Completed Today</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Queue Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="WAITING">Waiting</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Queue Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Entries ({filteredQueueEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredQueueEntries.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Queue Entries</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No entries match your current filters.' 
                  : 'No devotees are currently in the queue.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQueueEntries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-lg">{entry.user.name}</h4>
                        <Badge className={getPriorityColor(entry.priority || 'NORMAL')}>
                          {entry.priority || 'NORMAL'}
                        </Badge>
                        <Badge variant={entry.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
                          {entry.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                          <p><strong>Email:</strong> {entry.user.email}</p>
                          <p><strong>Phone:</strong> {entry.user.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <p><strong>Joined Queue:</strong> {formatTimeIST(new Date(entry.checkedInAt))}</p>
                          <p><strong>Estimated Wait:</strong> {entry.estimatedWait ? `${entry.estimatedWait} min` : 'N/A'}</p>
                        </div>
                      </div>
                      
                      {entry.notes && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm"><strong>Notes:</strong> {entry.notes}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-4">
                      {entry.status === 'WAITING' && (
                        <Button
                          onClick={() => handleStartConsultation(entry)}
                          disabled={startingConsultationId === entry.id}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {startingConsultationId === entry.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Starting...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Start Consultation
                            </>
                          )}
                        </Button>
                      )}
                      
                      {entry.status === 'IN_PROGRESS' && (
                        <Button
                          onClick={() => handleCompleteConsultation(entry)}
                          variant="outline"
                          className="border-green-600 text-green-600 hover:bg-green-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Complete Consultation
                        </Button>
                      )}
                    </div>
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
