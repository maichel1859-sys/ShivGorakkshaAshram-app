'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, CheckCircle, AlertCircle, User, Phone, MessageSquare } from 'lucide-react';
import { getGurujiQueueEntries, startConsultation, updateQueueStatus } from '@/lib/actions/queue-actions';
import { useAdaptivePolling } from '@/hooks/use-adaptive-polling';
import { useLoadingStore } from '@/lib/stores/loading-store';
import { LoadingOverlay } from '@/components/ui/loading-overlay';

interface QueueEntry {
  id: string;
  user: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  reason: string;
  status: string;
  createdAt: string;
  estimatedWait?: number;
  priority?: string;
}

interface GurujiQueueStatus {
  waiting: number;
  inProgress: number;
  completedToday: number;
  totalToday: number;
  averageWaitTime: number;
  currentQueue: QueueEntry[];
}

export default function GurujiQueuePage() {
  const [queueStatus, setQueueStatus] = useState<GurujiQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { setGurujiQueueLoading } = useLoadingStore();
  // Note: selectedEntry is currently unused but may be needed for future features
  // const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null);

  const loadQueueStatus = async () => {
    try {
      setLoading(true);
      setGurujiQueueLoading(true);
      const result = await getGurujiQueueEntries();
      
      if (result.success && result.queueEntries) {
        const waiting = result.queueEntries.filter(entry => entry.status === 'WAITING').length;
        const inProgress = result.queueEntries.filter(entry => entry.status === 'IN_PROGRESS').length;
        
        // Calculate estimated wait times
        const queueWithWaitTimes = result.queueEntries.map((entry, index) => ({
          ...entry,
          estimatedWait: (index + 1) * 15, // 15 minutes per position
        }));

        const queueStatus: GurujiQueueStatus = {
          waiting,
          inProgress,
          completedToday: Math.floor(Math.random() * 20) + 10, // Mock completed count
          totalToday: Math.floor(Math.random() * 30) + 20, // Mock total count
          averageWaitTime: 25, // Mock average wait time
          currentQueue: queueWithWaitTimes.map(entry => ({
            id: entry.id,
            user: {
              id: entry.user.id,
              name: entry.user.name || 'Unknown User',
              phone: entry.user.phone || 'No phone',
              email: (entry.user as { email?: string }).email || undefined
            },
            reason: entry.notes || 'General consultation',
            status: entry.status,
            createdAt: entry.createdAt.toISOString(),
            estimatedWait: entry.estimatedWait,
            priority: entry.priority
          }))
        };
        
        setQueueStatus(queueStatus);
      } else {
        console.error('Failed to load queue:', result.error);
      }
    } catch (error) {
      console.error('Error loading queue status:', error);
    } finally {
      setLoading(false);
      setGurujiQueueLoading(false);
    }
  };

  // Use adaptive polling instead of fixed interval
  const { isPolling, currentInterval } = useAdaptivePolling({
    enabled: true,
    interval: 15000, // Default 15 seconds
    onPoll: loadQueueStatus,
    onError: (error: Error) => {
      console.error('Queue polling error:', error);
    }
  });

  const handleStartConsultation = async (entry: QueueEntry) => {
    try {
      const { setConsultationLoading } = useLoadingStore.getState();
      setConsultationLoading(true);
      
      const formData = new FormData();
      formData.append('queueEntryId', entry.id);
      
      const result = await startConsultation(formData);
      if (result.success) {
        // setSelectedEntry(entry); // Temporarily disabled
        await loadQueueStatus(); // Refresh the queue
        console.log('Started consultation for:', entry.user.name);
      } else {
        console.error('Failed to start consultation:', result.error);
      }
    } catch (error) {
      console.error('Error starting consultation:', error);
    } finally {
      const { setConsultationLoading } = useLoadingStore.getState();
      setConsultationLoading(false);
    }
  };

  const handleCompleteConsultation = async (entry: QueueEntry) => {
    try {
      const formData = new FormData();
      formData.append('queueEntryId', entry.id);
      formData.append('status', 'COMPLETED');
      
      const result = await updateQueueStatus(formData);
      if (result.success) {
        await loadQueueStatus(); // Refresh the queue
        console.log('Completed consultation for:', entry.user.name);
      } else {
        console.error('Failed to complete consultation:', result.error);
      }
    } catch (error) {
      console.error('Error completing consultation:', error);
    }
  };

  const handleCallNext = () => {
    const nextWaiting = queueStatus?.currentQueue.find(entry => entry.status === 'WAITING');
    if (nextWaiting) {
      handleStartConsultation(nextWaiting);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'NORMAL':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LOW':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'WAITING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        <LoadingOverlay loadingKey="gurujiQueueLoading" />
      </div>
    );
  }

  if (!queueStatus) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Unable to Load Queue</h3>
        <p className="text-muted-foreground">Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Queue Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage the queue of patients waiting for spiritual consultation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadQueueStatus}>
            <Clock className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCallNext} disabled={!queueStatus.currentQueue.some(entry => entry.status === 'WAITING')}>
            <Users className="h-4 w-4 mr-2" />
            Call Next
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStatus.waiting}</div>
            <p className="text-xs text-muted-foreground">
              Patients in queue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStatus.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              Active consultations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStatus.completedToday}</div>
            <p className="text-xs text-muted-foreground">
              Total consultations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Wait Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStatus.averageWaitTime}m</div>
            <p className="text-xs text-muted-foreground">
              Minutes per patient
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Queue Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{queueStatus.completedToday} / {queueStatus.totalToday}</span>
            </div>
            <Progress value={(queueStatus.completedToday / queueStatus.totalToday) * 100} />
            <p className="text-xs text-muted-foreground">
              {queueStatus.totalToday - queueStatus.completedToday} consultations remaining today
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Current Queue */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Current Queue</h2>
        </div>
        
        <div className="grid gap-4">
          {queueStatus.currentQueue.map((entry, index) => (
            <Card key={entry.id} className={`hover:shadow-md transition-shadow ${
              entry.status === 'IN_PROGRESS' ? 'ring-2 ring-primary' : ''
            }`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-lg">{entry.user.name}</h3>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getPriorityColor(entry.priority || 'NORMAL')}`}
                          >
                            {entry.priority || 'NORMAL'}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{entry.user.phone}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>#{index + 1} in queue</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-13">
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Reason:</strong> {entry.reason}
                      </p>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Arrived: {new Date(entry.createdAt).toLocaleTimeString()}</span>
                        </div>
                        {entry.estimatedWait && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Est. wait: {entry.estimatedWait} min</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <Badge 
                      variant="outline" 
                      className={`capitalize ${getStatusColor(entry.status)}`}
                    >
                      {entry.status.replace('_', ' ').toLowerCase()}
                    </Badge>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Contact
                      </Button>
                      {entry.status === 'WAITING' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleStartConsultation(entry)}
                        >
                          Start
                        </Button>
                      )}
                      {entry.status === 'IN_PROGRESS' && (
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => handleCompleteConsultation(entry)}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {queueStatus.currentQueue.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Queue is Empty</h3>
            <p className="text-muted-foreground mb-4">
              No patients are currently waiting in the queue.
            </p>
            <Button variant="outline" onClick={loadQueueStatus}>
              <Clock className="h-4 w-4 mr-2" />
              Refresh Queue
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
