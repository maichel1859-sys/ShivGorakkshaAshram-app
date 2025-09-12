"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Clock,
  Users,
  CheckCircle,
  Play,
  Square,
  Timer,
  Pill,
  Phone,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { PrescribeRemedyModal } from "@/components/guruji/prescribe-remedy-modal";
import { PageSpinner } from "@/components/loading";
import { useLoadingState } from "@/store";
import { useQueueUnified } from "@/hooks/use-queue-unified";
import type { QueueEntry } from "@/types/queue";
import { showToast, commonToasts } from "@/lib/toast";

export default function GurujiDashboard() {
  const { data: session } = useSession();
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [prescribeModalOpen, setPrescribeModalOpen] = useState(false);
  const [selectedQueueEntry, setSelectedQueueEntry] = useState<QueueEntry | null>(null);
  const [consultationSessionId, setConsultationSessionId] = useState<string | null>(null);
  
  // Use simple toast utility

  // Use unified queue hook with React Query caching and socket fallback
  const {
    queueEntries,
    stats,
  } = useQueueUnified({
    role: 'guruji',
    autoRefresh: true,
    refreshInterval: 15000, // More frequent for guruji
    enableRealtime: true,
  });

  // Queue action handlers
  const handleStartConsultation = async (entry: QueueEntry) => {
    try {
      // TODO: Implement start consultation logic
      console.log('Starting consultation for:', entry.user.name);
      commonToasts.consultationStarted(entry.user.name || 'Unknown User');
    } catch (err) {
      console.error('Error starting consultation:', err);
      showToast.error('Failed to start consultation');
    }
  };

  const handleCompleteConsultation = async (entry: QueueEntry, onRemedyRequired?: (entry: QueueEntry) => void) => {
    try {
      // TODO: Implement complete consultation logic
      console.log('Completing consultation for:', entry.user.name);
      commonToasts.consultationCompleted(entry.user.name || 'Unknown User');
      
      // Check if remedy is required
      if (onRemedyRequired) {
        onRemedyRequired(entry);
      }
    } catch (err) {
      console.error('Error completing consultation:', err);
      showToast.error('Failed to complete consultation');
    }
  };

  const handlePrescribeRemedy = async (entry: QueueEntry, onSuccess?: (consultationSessionId: string, entry: QueueEntry) => void) => {
    try {
      // TODO: Implement prescribe remedy logic
      console.log('Prescribing remedy for:', entry.user.name);
      const mockConsultationSessionId = `consultation-${Date.now()}`;
      
      if (onSuccess) {
        onSuccess(mockConsultationSessionId, entry);
      }
    } catch (err) {
      console.error('Error prescribing remedy:', err);
      showToast.error('Failed to prescribe remedy');
    }
  };

  // Filter entries by status for display
  const waitingEntries = queueEntries?.filter(entry => entry.status === 'WAITING') || [];
  const inProgressEntries = queueEntries?.filter(entry => entry.status === 'IN_PROGRESS') || [];

  // Custom handlers that integrate with dashboard-specific state
  const onStartConsultation = async (entry: QueueEntry) => {
    await handleStartConsultation(entry);
    setSessionActive(true);
    setSessionStartTime(new Date());
  };

  const onCompleteConsultation = async (entry: QueueEntry) => {
    await handleCompleteConsultation(entry, (entry) => {
      // Handle remedy requirement
      setSelectedQueueEntry(entry);
      setPrescribeModalOpen(true);
    });
    setSessionActive(false);
    setSessionStartTime(null);
  };

  const onPrescribeRemedy = async (entry: QueueEntry) => {
    await handlePrescribeRemedy(entry, (consultationSessionId, entry) => {
      setConsultationSessionId(consultationSessionId);
      setSelectedQueueEntry(entry);
      setPrescribeModalOpen(true);
    });
  };

  const getSessionDuration = () => {
    if (!sessionStartTime) return "0:00";
    const now = new Date();
    const diff = now.getTime() - sessionStartTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "text-red-600 bg-red-100";
      case "HIGH":
        return "text-orange-600 bg-orange-100";
      case "NORMAL":
        return "text-blue-600 bg-blue-100";
      case "LOW":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // Get current patient from in-progress entries
  const currentPatient = inProgressEntries[0] || null;

  const isLoading = useLoadingState("queue-loading");
  
  if (isLoading) {
    return <PageSpinner message="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Welcome, {session?.user.name?.split(" ")[0]}!
          </h2>
          <p className="text-muted-foreground">
            Your consultation dashboard for today
          </p>
        </div>

        {/* Session Timer */}
        {sessionActive && (
          <div className="flex items-center space-x-2 bg-green-50 p-3 rounded-lg">
            <Timer className="h-5 w-5 text-green-600" />
            <span className="font-mono text-lg font-semibold text-green-700">
              {getSessionDuration()}
            </span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Total
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Total patients today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              Consultations completed
            </p>
          </CardContent>
        </Card>

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
            <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageWaitTime}
            </div>
            <p className="text-xs text-muted-foreground">Minutes per session</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Patient Section */}
      {currentPatient && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Play className="h-5 w-5" />
              Current Consultation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-green-100 text-green-700">
                    {currentPatient.user.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-green-800">
                    {currentPatient.user.name || 'Unknown User'}
                  </h3>
                  <p className="text-sm text-green-600">
                    Priority: {currentPatient.priority || 'NORMAL'}
                  </p>
                  <p className="text-xs text-green-500">
                    Started: {sessionStartTime?.toLocaleTimeString()}
                  </p>
                  {currentPatient.user.phone && (
                    <p className="text-xs text-green-500">
                      Phone: {currentPatient.user.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => onPrescribeRemedy(currentPatient)}
                  variant="outline"
                  className="border-green-600 text-green-700 hover:bg-green-50"
                >
                  <Pill className="h-4 w-4 mr-2" />
                  Prescribe Remedy
                </Button>
                <Button
                  onClick={() => onCompleteConsultation(currentPatient)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Complete Session
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Patient Queue
          </CardTitle>
          <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 mt-2">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            <strong>Important:</strong> Remedies must be prescribed before completing consultations
          </div>
        </CardHeader>
        <CardContent>
          {waitingEntries.length > 0 ? (
            <div className="space-y-3">
              {waitingEntries.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                      <span className="text-sm font-semibold text-primary">
                        {patient.position}
                      </span>
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {patient.user.name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">
                        {patient.user.name || 'Unknown User'}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Position: #{patient.position}</span>
                        {patient.user.phone && (
                          <span className="flex items-center">
                            <Phone className="mr-1 h-3 w-3" />
                            {patient.user.phone}
                          </span>
                        )}
                        {patient.estimatedWait && (
                          <span className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            Est. wait: {patient.estimatedWait}m
                          </span>
                        )}
                      </div>
                      {patient.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Reason:</strong> {patient.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge
                      className={`${getPriorityColor(patient.priority || 'NORMAL')} px-2 py-1`}
                    >
                      {patient.priority || 'NORMAL'}
                    </Badge>
                    {!currentPatient && (
                      <Button
                        onClick={() => onStartConsultation(patient)}
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        if (patient.user.phone) {
                          window.open(`tel:${patient.user.phone}`, '_blank');
                        } else {
                          commonToasts.noPhoneNumber();
                        }
                      }}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Contact
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">
                No patients in queue
              </h3>
              <p className="text-sm text-muted-foreground">
                All patients have been seen or no appointments scheduled
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
