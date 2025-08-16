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
  // User, // Temporarily unused
} from "lucide-react";
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
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
    );
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
                    {currentPatient.appointment.user.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-green-800">
                    {currentPatient.appointment.user.name}
                  </h3>
                  <p className="text-sm text-green-600">
                    Priority: {currentPatient.appointment.priority}
                  </p>
                  <p className="text-xs text-green-500">
                    Started: {sessionStartTime?.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleCompleteConsultation}
                className="bg-green-600 hover:bg-green-700"
              >
                <Square className="h-4 w-4 mr-2" />
                Complete Session
              </Button>
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
        </CardHeader>
        <CardContent>
          {queuePatients.length > 0 ? (
            <div className="space-y-3">
              {queuePatients.map((patient, index) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                      <span className="text-sm font-semibold text-primary">
                        {index + 1}
                      </span>
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {patient.appointment.user.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">
                        {patient.appointment.user.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Position: #{patient.position}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge
                      className={`${getPriorityColor(patient.appointment.priority)} px-2 py-1`}
                    >
                      {patient.appointment.priority}
                    </Badge>
                    {!currentPatient && (
                      <Button
                        onClick={() => handleStartConsultation(patient.id)}
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
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
    </div>
  );
}
