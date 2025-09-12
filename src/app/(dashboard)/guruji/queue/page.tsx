'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, CheckCircle, AlertCircle, User, Phone, MessageSquare, Pill, RefreshCw } from 'lucide-react';
import { startConsultation, updateQueueStatus, getConsultationSessionId } from '@/lib/actions/queue-actions';
import { PageSpinner } from '@/components/loading';
import { ErrorBoundary, QueueErrorFallback } from '@/components/error-boundary';
import { PrescribeRemedyModal } from '@/components/guruji/prescribe-remedy-modal';
import { useQueueUnified } from '@/hooks/use-queue-unified';
import { showToast, commonToasts } from '@/lib/toast';
import type { QueueEntry } from '@/types/queue';


function GurujiQueuePageContent() {
  const [consultationSessionId, setConsultationSessionId] = useState<string | null>(null);
  const [selectedQueueEntry, setSelectedQueueEntry] = useState<QueueEntry | null>(null);
  const [prescribeModalOpen, setPrescribeModalOpen] = useState(false);
  
  // Use unified queue hook with React Query caching and socket fallback
  const {
    queueEntries,
    loading,
    stats,
    refetch: loadQueueEntries,
  } = useQueueUnified({
    role: 'guruji',
    autoRefresh: true,
    refreshInterval: 15000, // Faster refresh for guruji
    enableRealtime: true,
  });


  const handleStartConsultation = async (entry: QueueEntry) => {
    try {
      const formData = new FormData();
      formData.append('queueEntryId', entry.id);
      
      const result = await startConsultation(formData);
      if (result.success) {
        commonToasts.consultationStarted(entry.user.name || 'Unknown User');
        // Store the consultation session ID for prescribing remedies
        if (result.consultationSessionId) {
          setConsultationSessionId(result.consultationSessionId);
        }
        await loadQueueEntries(); // Refresh the queue
      } else {
        showToast.error(result.error || 'Failed to start consultation');
      }
    } catch (error) {
      console.error('Error starting consultation:', error);
      showToast.error('Error starting consultation');
    }
  };

  const handleCompleteConsultation = async (entry: QueueEntry) => {
    try {
      const formData = new FormData();
      formData.append('queueEntryId', entry.id);
      formData.append('status', 'COMPLETED');
      
      const result = await updateQueueStatus(formData);
      if (result.success) {
        commonToasts.consultationCompleted(entry.user.name || 'Unknown User');
        setConsultationSessionId(null); // Clear consultation session ID
        await loadQueueEntries(); // Refresh the queue
      } else {
        // Check if the error is about missing remedy
        if (result.error?.includes('remedy')) {
          showToast.error(result.error);
          // Automatically open the prescribe remedy modal
          setSelectedQueueEntry(entry);
          setPrescribeModalOpen(true);
        } else {
          showToast.error(result.error || 'Failed to complete consultation');
        }
      }
    } catch (error) {
      console.error('Error completing consultation:', error);
      showToast.error('Error completing consultation');
    }
  };

  const handlePrescribeRemedy = async (entry: QueueEntry) => {
    try {
      // Check if the entry is in progress
      if (entry.status !== 'IN_PROGRESS') {
        showToast.error('Can only prescribe remedies for consultations in progress.');
        return;
      }
      
      // Get the consultation session ID for this queue entry
      const result = await getConsultationSessionId(entry.id);
      if (!result.success) {
        showToast.error(result.error || 'Failed to get consultation session');
        return;
      }
      
      // Store the consultation session ID temporarily for the modal
      if (result.consultationSessionId) {
        setConsultationSessionId(result.consultationSessionId);
        setSelectedQueueEntry(entry);
        setPrescribeModalOpen(true);
      } else {
        showToast.error('Failed to get consultation session ID');
      }
    } catch (error) {
      console.error('Error preparing to prescribe remedy:', error);
      showToast.error('Error preparing to prescribe remedy');
    }
  };

  const handleCallNext = () => {
    const nextWaiting = queueEntries.find((entry: QueueEntry) => entry.status === 'WAITING');
    if (nextWaiting) {
      handleStartConsultation(nextWaiting);
    } else {
      showToast.info('No patients waiting in queue');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'NORMAL':
        return 'bg-blue-100 text-blue-800';
      case 'LOW':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  if (loading) {
    return <PageSpinner message="Loading queue..." />;
  }


  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Queue Management</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Manage the queue of patients waiting for spiritual consultation
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => loadQueueEntries()} className="flex-1 sm:flex-none">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={handleCallNext} 
            disabled={!queueEntries.some((entry: QueueEntry) => entry.status === 'WAITING')}
            className="flex-1 sm:flex-none"
          >
            <Users className="h-4 w-4 mr-2" />
            Call Next
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.waiting}</div>
            <p className="text-xs text-muted-foreground">Patients in queue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Currently consulting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Consultations finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Today</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All patients today</p>
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
            <div className="flex items-center justify-between text-sm">
              <span>Queue Progress</span>
              <span>{stats.completed} / {stats.total}</span>
            </div>
            <Progress 
              value={stats.total > 0 ? (stats.completed / stats.total) * 100 : 0} 
              className="h-2" 
            />
            <p className="text-xs text-muted-foreground">
              {stats.total - stats.completed} consultations remaining today
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Current Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Current Queue</h2>
          </div>
          <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            <strong>Important:</strong> Remedies must be prescribed before completing consultations
          </div>
        </div>
        
        <div className="grid gap-4">
          {queueEntries.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Queue is Empty</h3>
                <p className="text-muted-foreground mb-4">
                  No patients are currently waiting in the queue.
                </p>
                <Button variant="outline" onClick={() => loadQueueEntries()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Queue
                </Button>
              </CardContent>
            </Card>
          ) : (
            queueEntries.map((entry: QueueEntry) => (
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
                            <h3 className="font-semibold text-lg">{entry.user.name || 'Unknown User'}</h3>
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
                              <span>{entry.user.phone || 'No phone'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>#{entry.position} in queue</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-13">
                        <p className="text-sm text-muted-foreground mb-2">
                          <strong>Reason:</strong> {entry.notes || 'General consultation'}
                        </p>
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Checked in: {new Date(entry.checkedInAt).toLocaleTimeString()}</span>
                          </div>
                          {entry.estimatedWait && entry.status === 'WAITING' && (
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
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button size="sm" variant="outline" className="flex-1 sm:flex-none">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Contact
                        </Button>
                        {entry.status === 'WAITING' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStartConsultation(entry)}
                            className="flex-1 sm:flex-none"
                          >
                            Start
                          </Button>
                        )}
                        {entry.status === 'IN_PROGRESS' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handlePrescribeRemedy(entry)}
                              className="flex-1 sm:flex-none"
                            >
                              <Pill className="h-3 w-3 mr-1" />
                              Prescribe Remedy
                            </Button>
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => handleCompleteConsultation(entry)}
                              className="relative flex-1 sm:flex-none"
                              title="Remedy must be prescribed before completing consultation"
                            >
                              Complete
                              {/* Show indicator that remedy is required */}
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" title="Remedy required"></div>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Prescribe Remedy Modal */}
      {selectedQueueEntry && consultationSessionId && (
        <PrescribeRemedyModal
          isOpen={prescribeModalOpen}
          onClose={() => {
            setPrescribeModalOpen(false);
            setSelectedQueueEntry(null);
          }}
          consultationId={consultationSessionId}
          patientName={selectedQueueEntry.user.name || "Patient"}
        />
      )}
    </div>
  );
}

export default function GurujiQueuePage() {
  return (
    <ErrorBoundary fallback={QueueErrorFallback}>
      <GurujiQueuePageContent />
    </ErrorBoundary>
  );
}
