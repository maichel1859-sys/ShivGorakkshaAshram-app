"use client";

import { useState, useEffect } from "react";
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
  AlertTriangle,
  Timer,
  User,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/layout";
import {
  useGurujiQueue,
  useStartConsultation,
  useCompleteConsultation,
} from "@/hooks/queries/use-guruji";

export default function GurujiDashboard() {
  const { data: session } = useSession();
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // React Query hooks
  const { data: queueData, isLoading, error } = useGurujiQueue();
  const startConsultationMutation = useStartConsultation();
  const completeConsultationMutation = useCompleteConsultation();

  const queuePatients = queueData?.queuePatients || [];
  const currentPatient = queueData?.currentPatient || null;
  const stats = queueData?.stats || {
    todayTotal: 0,
    todayCompleted: 0,
    currentWaiting: 0,
    averageConsultationTime: 15,
  };

  // Auto-refresh queue data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // The useGurujiQueue hook handles refetching automatically
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStartConsultation = async (queueEntryId: string) => {
    try {
      await startConsultationMutation.mutateAsync(queueEntryId);
      setSessionActive(true);
      setSessionStartTime(new Date());
    } catch (error) {
      console.error("Failed to start consultation:", error);
    }
  };

  const handleCompleteConsultation = async () => {
    if (!currentPatient) return;

    try {
      await completeConsultationMutation.mutateAsync(currentPatient.id);
      setSessionActive(false);
      setSessionStartTime(null);
    } catch (error) {
      console.error("Failed to complete consultation:", error);
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

  if (isLoading) {
    return (
      <DashboardLayout title="Consultation Dashboard" allowedRoles={["GURUJI"]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Consultation Dashboard" allowedRoles={["GURUJI"]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600">
              Error Loading Dashboard
            </h3>
            <p className="text-muted-foreground">
              Failed to load queue data. Please try again.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Consultation Dashboard" allowedRoles={["GURUJI"]}>
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
              <CardTitle className="text-sm font-medium">
                Avg. Duration
              </CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.averageConsultationTime}m
              </div>
              <p className="text-xs text-muted-foreground">
                Minutes per consultation
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Current Patient */}
        {currentPatient && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-green-800">
                <User className="h-5 w-5" />
                <span>Current Patient</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarFallback>
                      {currentPatient.appointment.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">
                      {currentPatient.appointment.user.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Position: #{currentPatient.position} • Wait:{" "}
                      {currentPatient.estimatedWait}m
                    </p>
                    {currentPatient.appointment.reason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Reason: {currentPatient.appointment.reason}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleCompleteConsultation}
                  disabled={completeConsultationMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {completeConsultationMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  Complete Consultation
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Queue List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Queue ({queuePatients.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queuePatients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">
                  No patients in queue
                </h3>
                <p className="text-sm text-muted-foreground">
                  Patients will appear here when they check in
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {queuePatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback>
                          {patient.appointment.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">
                          {patient.appointment.user.name}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>Position: #{patient.position}</span>
                          <span>•</span>
                          <span>Wait: {patient.estimatedWait}m</span>
                          {patient.appointment.user.age && (
                            <>
                              <span>•</span>
                              <span>Age: {patient.appointment.user.age}</span>
                            </>
                          )}
                        </div>
                        {patient.appointment.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Reason: {patient.appointment.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        className={getPriorityColor(
                          patient.appointment.priority
                        )}
                      >
                        {patient.appointment.priority}
                      </Badge>
                      <Button
                        onClick={() => handleStartConsultation(patient.id)}
                        disabled={startConsultationMutation.isPending}
                        size="sm"
                      >
                        {startConsultationMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Start
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
