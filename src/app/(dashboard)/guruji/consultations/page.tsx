'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  UserCheck,
  Users,
  Clock,
  User,
  Search,
  Filter,
  Phone,
  Calendar
} from 'lucide-react';
import { PageSpinner } from '@/components/ui/page-spinner';
// import { showToast } from '@/lib/toast'; // Not used in current implementation
import { useQueueUnified } from '@/hooks/use-queue-unified';
import { useGurujiConsultations } from '@/hooks/queries/use-guruji';
import { QueueEntry } from '@/types';
import { formatTimeIST } from '@/store/time-store';

export default function GurujiConsultationsPage() {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Get queue entries for current guruji
  const {
    queueEntries,
    loading: queueLoading,
    startConsultation,
    completeConsultation
  } = useQueueUnified({
    role: 'guruji',
    autoRefresh: true,
    refreshInterval: 5000,
    enableRealtime: true
  });

  // Get consultation data
  const { data: consultations = [], isLoading: consultationsLoading } = useGurujiConsultations(session?.user?.id);

  // Filter queue entries for consultation view
  const filteredQueueEntries = queueEntries.filter((entry) => {
    const matchesSearch = entry.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;

    return matchesSearch && matchesStatus;
  });


  // Handle consultation completion with remedy requirement
  const onCompleteConsultation = async (entry: QueueEntry) => {
    // For now, allow completion without remedy check
    // TODO: Implement proper remedy checking when consultation data is available
    await completeConsultation(entry.id);
  };

  if (queueLoading || consultationsLoading) {
    return <PageSpinner text="Loading consultations..." />;
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consultations</h1>
          <p className="text-muted-foreground">Manage your consultation sessions and patient interactions</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredQueueEntries.filter(entry => entry.status === 'WAITING').length}
            </div>
            <p className="text-xs text-muted-foreground">Patients in queue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredQueueEntries.filter(entry => entry.status === 'IN_PROGRESS').length}
            </div>
            <p className="text-xs text-muted-foreground">Active consultations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredQueueEntries.filter(entry => entry.status === 'COMPLETED').length}
            </div>
            <p className="text-xs text-muted-foreground">Finished sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {consultations.length}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Current Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
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

          {filteredQueueEntries.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Patients in Queue</h3>
              <p className="text-muted-foreground">
                No devotees are currently checked in and waiting for consultation.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredQueueEntries
                .filter(entry => entry.status === 'IN_PROGRESS')
                .map((entry) => {
                  return (
                    <div key={entry.id} className="space-y-4">
                      {/* Devotee Info and Controls */}
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 border-blue-200">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{entry.user.name || 'Unknown User'}</h3>
                              <Badge className="bg-blue-100 text-blue-800">
                                IN CONSULTATION
                              </Badge>
                              <Badge variant="outline">
                                Position {entry.position}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span className="flex items-center">
                                <Phone className="mr-1 h-3 w-3" />
                                {entry.user.phone || 'No phone'}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="mr-1 h-3 w-3" />
                                Checked in: {formatTimeIST(entry.checkedInAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            onClick={() => onCompleteConsultation(entry)}
                            className="flex-1 sm:flex-none"
                          >
                            Complete Consultation
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* Waiting Queue */}
              {filteredQueueEntries.filter(entry => entry.status === 'WAITING').map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{entry.user.name || 'Unknown User'}</h3>
                        <Badge variant="secondary">WAITING</Badge>
                        <Badge variant="outline">Position {entry.position}</Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Wait time: {entry.estimatedWait || 'Calculating...'}</span>
                        <span>{entry.user.phone || 'No phone'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => startConsultation(entry.id)}
                      variant="outline"
                    >
                      Start Consultation
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Consultations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Completed Consultations</CardTitle>
        </CardHeader>
        <CardContent>
          {consultations.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Past Consultations</h3>
              <p className="text-muted-foreground">
                No completed consultations found.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {consultations.map((consultation: Record<string, unknown>) => (
                <div key={consultation.id as string} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{(consultation.devotee as Record<string, unknown>)?.name as string || 'Unknown'}</h4>
                      <p className="text-sm text-muted-foreground">
                        Completed: {consultation.completedAt ? formatTimeIST(consultation.completedAt as Date) : 'N/A'}
                      </p>
                      {Boolean(consultation.remedyDocument) && (
                        <Badge variant="secondary" className="mt-2">
                          Remedy Prescribed
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Duration: {(consultation.duration as string) || 'N/A'}
                      </p>
                      {Boolean(consultation.remedyDocument) && (
                        <Button size="sm" variant="outline" className="mt-2">
                          View Remedy
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