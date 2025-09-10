"use client";

import { useState, useEffect, useCallback } from "react";
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
import { getGurujiQueueEntries, startConsultation, updateQueueStatus, getConsultationSessionId } from "@/lib/actions/queue-actions";
import { PrescribeRemedyModal } from "@/components/guruji/prescribe-remedy-modal";
import { toast } from "sonner";
import { PageSpinner } from "@/components/ui/global-spinner";
import { useAppStore, useLoadingState } from "@/store/app-store";

interface QueueEntry {
  id: string;
  position: number;
  status: string;
  estimatedWait?: number;
  priority?: string;
  checkedInAt: string;
  notes?: string;
  user: {
    id: string;
    name: string | null;
    phone: string | null;
    dateOfBirth?: string | null; // Transformed to string
  };
}

interface QueueEntryFromDB {
  id: string;
  position: number;
  status: string;
  estimatedWait: number | null;
  priority: string | null;
  checkedInAt: Date | string; // Can be Date or string from server
  notes: string | null;
  user: {
    id: string;
    name: string | null;
    phone: string | null;
    dateOfBirth: Date | string | null; // Can be Date or string from server
  };
}

export default function GurujiDashboard() {
  const { data: session } = useSession();
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [prescribeModalOpen, setPrescribeModalOpen] = useState(false);
  const [selectedQueueEntry, setSelectedQueueEntry] = useState<QueueEntry | null>(null);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const { setLoadingState } = useAppStore();
  const [consultationSessionId, setConsultationSessionId] = useState<string | null>(null);

  // Load queue entries
  const loadQueueEntries = useCallback(async () => {
    try {
      setLoadingState("queue-loading", true);
      const result = await getGurujiQueueEntries();
      
      if (result.success && result.queueEntries) {
        const entries = result.queueEntries;
        const transformedQueue = entries.map((entry: QueueEntryFromDB, index: number) => ({
          id: entry.id,
          position: entry.position,
          status: entry.status,
          estimatedWait: entry.status === 'WAITING' ? (index + 1) * 15 : (entry.estimatedWait || undefined),
          priority: entry.priority || undefined,
          checkedInAt: entry.checkedInAt instanceof Date ? entry.checkedInAt.toISOString() : entry.checkedInAt,
          notes: entry.notes || undefined,
          user: {
            id: entry.user.id,
            name: entry.user.name,
            phone: entry.user.phone,
            dateOfBirth: entry.user.dateOfBirth instanceof Date ? entry.user.dateOfBirth.toISOString() : entry.user.dateOfBirth,
          },
        }));
        setQueueEntries(transformedQueue);
      } else {
        console.error('Failed to load queue entries:', result.error);
        toast.error('Failed to load queue data');
      }
    } catch (error) {
      console.error('Error loading queue entries:', error);
      toast.error('Error loading queue data');
    } finally {
      setLoadingState("queue-loading", false);
    }
  }, [setLoadingState]);

  // Load queue entries on component mount
  useEffect(() => {
    loadQueueEntries();
  }, [loadQueueEntries]);
  

  // Auto-refresh queue data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadQueueEntries();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadQueueEntries]);

  const handleStartConsultation = async (entry: QueueEntry) => {
    try {
      const formData = new FormData();
      formData.append('queueEntryId', entry.id);
      
      const result = await startConsultation(formData);
      if (result.success) {
        toast.success(`Started consultation with ${entry.user.name}`);
        setSessionActive(true);
        setSessionStartTime(new Date());
        // Store the consultation session ID for prescribing remedies
        if (result.consultationSessionId) {
          setConsultationSessionId(result.consultationSessionId);
        }
        await loadQueueEntries(); // Refresh the queue
      } else {
        toast.error(result.error || 'Failed to start consultation');
      }
    } catch (error) {
      console.error('Error starting consultation:', error);
      toast.error('Error starting consultation');
    }
  };

  const handleCompleteConsultation = async (entry: QueueEntry) => {
    try {
      const formData = new FormData();
      formData.append('queueEntryId', entry.id);
      formData.append('status', 'COMPLETED');
      
      const result = await updateQueueStatus(formData);
      if (result.success) {
        toast.success(`Completed consultation with ${entry.user.name}`);
        setSessionActive(false);
        setSessionStartTime(null);
        setConsultationSessionId(null); // Clear consultation session ID
        await loadQueueEntries(); // Refresh the queue
      } else {
        // Check if the error is about missing remedy
        if (result.error?.includes('remedy')) {
          toast.error(result.error);
          // Automatically open the prescribe remedy modal
          setSelectedQueueEntry(entry);
          setPrescribeModalOpen(true);
        } else {
          toast.error(result.error || 'Failed to complete consultation');
        }
      }
    } catch (error) {
      console.error('Error completing consultation:', error);
      toast.error('Error completing consultation');
    }
  };

  const handlePrescribeRemedy = async (entry: QueueEntry) => {
    try {
      // Check if the entry is in progress
      if (entry.status !== 'IN_PROGRESS') {
        toast.error('Can only prescribe remedies for consultations in progress.');
        return;
      }
      
      // Get the consultation session ID for this queue entry
      const result = await getConsultationSessionId(entry.id);
      if (!result.success) {
        toast.error(result.error || 'Failed to get consultation session');
        return;
      }
      
              // Store the consultation session ID temporarily for the modal
        if (result.consultationSessionId) {
          setConsultationSessionId(result.consultationSessionId);
          setSelectedQueueEntry(entry);
          setPrescribeModalOpen(true);
        } else {
          toast.error('Failed to get consultation session ID');
        }
    } catch (error) {
      console.error('Error preparing to prescribe remedy:', error);
      toast.error('Error preparing to prescribe remedy');
    }
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

  // Calculate stats
  const waitingPatients = queueEntries.filter(entry => entry.status === 'WAITING');
  const inProgressPatients = queueEntries.filter(entry => entry.status === 'IN_PROGRESS');
  const completedPatients = queueEntries.filter(entry => entry.status === 'COMPLETED');
  const currentPatient = inProgressPatients[0] || null;

  const stats = {
    todayTotal: queueEntries.length,
    todayCompleted: completedPatients.length,
    currentWaiting: waitingPatients.length,
    averageConsultationTime: 15,
  };

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
            <div className="text-2xl font-bold">{stats.todayTotal}</div>
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
            <div className="text-2xl font-bold">{stats.todayCompleted}</div>
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
            <div className="text-2xl font-bold">{stats.currentWaiting}</div>
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
              {stats.averageConsultationTime}
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
                  onClick={() => handlePrescribeRemedy(currentPatient)}
                  variant="outline"
                  className="border-green-600 text-green-700 hover:bg-green-50"
                >
                  <Pill className="h-4 w-4 mr-2" />
                  Prescribe Remedy
                </Button>
                <Button
                  onClick={() => handleCompleteConsultation(currentPatient)}
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
          {waitingPatients.length > 0 ? (
            <div className="space-y-3">
              {waitingPatients.map((patient) => (
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
                        onClick={() => handleStartConsultation(patient)}
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
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
