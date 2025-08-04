"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";
import { 
  Users, 
  Clock, 
  CheckCircle, 
  Calendar, 
  Heart,
  UserCheck,
  FileText,
  Activity,
  Play
} from "lucide-react";
import Link from "next/link";

interface QueuePatient {
  id: string;
  position: number;
  estimatedWait: number;
  status: "WAITING" | "IN_PROGRESS";
  appointment: {
    id: string;
    reason?: string;
    priority: string;
    startTime: string;
    user: {
      id: string;
      name: string;
      age?: number;
    };
  };
  checkedInAt: string;
}

interface ConsultationStats {
  todayTotal: number;
  todayCompleted: number;
  currentWaiting: number;
  averageConsultationTime: number;
}

export default function GurujiDashboard() {
  const { data: session } = useSession();
  const [queuePatients, setQueuePatients] = useState<QueuePatient[]>([]);
  const [currentPatient, setCurrentPatient] = useState<QueuePatient | null>(null);
  const [stats, setStats] = useState<ConsultationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueueData = async () => {
    try {
      const response = await fetch("/api/guruji/queue");
      if (response.ok) {
        const data = await response.json();
        setQueuePatients(data.queuePatients);
        setCurrentPatient(data.currentPatient);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch queue data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartConsultation = async (queueEntryId: string) => {
    try {
      const response = await fetch(`/api/guruji/consultation/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueEntryId }),
      });

      if (response.ok) {
        setSessionActive(true);
        setSessionStartTime(new Date());
        fetchQueueData();
      }
    } catch (error) {
      console.error("Failed to start consultation:", error);
    }
  };

  const handleCompleteConsultation = async () => {
    if (!currentPatient) return;

    try {
      const response = await fetch(`/api/guruji/consultation/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueEntryId: currentPatient.id }),
      });

      if (response.ok) {
        setSessionActive(false);
        setSessionStartTime(null);
        setCurrentPatient(null);
        fetchQueueData();
      }
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
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT": return "text-red-600 bg-red-100";
      case "HIGH": return "text-orange-600 bg-orange-100";
      case "NORMAL": return "text-blue-600 bg-blue-100";
      case "LOW": return "text-gray-600 bg-gray-100";
      default: return "text-gray-600 bg-gray-100";
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
          <div className="flex items-center space-x-2">
            {sessionActive && sessionStartTime && (
              <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                Active Session: {getSessionDuration()}
              </div>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today&apos;s Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todayTotal}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.todayCompleted} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Currently Waiting</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.currentWaiting}</div>
                <p className="text-xs text-muted-foreground">
                  Patients in queue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Consultation</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageConsultationTime}m</div>
                <p className="text-xs text-muted-foreground">
                  Average duration
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.todayTotal > 0 ? Math.round((stats.todayCompleted / stats.todayTotal) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Today&apos;s progress
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="current" className="space-y-4">
          <TabsList>
            <TabsTrigger value="current">Current Session</TabsTrigger>
            <TabsTrigger value="queue">Patient Queue</TabsTrigger>
            <TabsTrigger value="history">Today&apos;s History</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4">
            {currentPatient ? (
              <Card className="border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="h-5 w-5" />
                      <span>Current Patient</span>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(currentPatient.appointment.priority)}`}>
                      {currentPatient.appointment.priority}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Patient Name</p>
                      <p className="font-medium text-lg">{currentPatient.appointment.user.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Appointment Time</p>
                      <p className="font-medium">{new Date(currentPatient.appointment.startTime).toLocaleTimeString()}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Reason for Visit</p>
                      <p className="font-medium">{currentPatient.appointment.reason || "General consultation"}</p>
                    </div>
                  </div>

                  {sessionActive && (
                    <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg">
                      <Activity className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-green-700">Session Active</p>
                        <p className="text-sm text-green-600">Duration: {getSessionDuration()}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    {!sessionActive ? (
                      <Button onClick={() => handleStartConsultation(currentPatient.id)} className="flex-1">
                        <Play className="mr-2 h-4 w-4" />
                        Start Consultation
                      </Button>
                    ) : (
                      <>
                        <Button onClick={handleCompleteConsultation} className="flex-1">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Complete Session
                        </Button>
                        <Button variant="outline" asChild>
                          <Link href={`/guruji/consultation/${currentPatient.appointment.id}`}>
                            <FileText className="mr-2 h-4 w-4" />
                            Add Notes
                          </Link>
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Active Session</h3>
                  <p className="text-muted-foreground mb-4">
                    {queuePatients.length > 0 
                      ? "Start a consultation with the next patient"
                      : "No patients currently waiting"
                    }
                  </p>
                  {queuePatients.length > 0 && (
                    <Button onClick={() => handleStartConsultation(queuePatients[0].id)}>
                      <Play className="mr-2 h-4 w-4" />
                      Start Next Consultation
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="queue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Patient Queue ({queuePatients.length})</span>
                </CardTitle>
                <CardDescription>
                  Patients waiting for consultation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {queuePatients.length > 0 ? (
                  <div className="space-y-4">
                    {queuePatients.map((patient, index) => (
                      <div key={patient.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                            {patient.position}
                          </div>
                          <div>
                            <p className="font-medium">{patient.appointment.user.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {patient.appointment.reason || "General consultation"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Checked in: {new Date(patient.checkedInAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(patient.appointment.priority)}`}>
                            {patient.appointment.priority}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ~{patient.estimatedWait}m wait
                          </div>
                          {index === 0 && !currentPatient && (
                            <Button size="sm" onClick={() => handleStartConsultation(patient.id)}>
                              <Play className="mr-1 h-3 w-3" />
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
                    <h3 className="text-lg font-medium mb-2">No Patients in Queue</h3>
                    <p className="text-muted-foreground">
                      All caught up! Patients will appear here when they check in.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Today&apos;s Consultations</span>
                </CardTitle>
                <CardDescription>
                  Completed sessions for today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Consultation History</h3>
                  <p className="text-muted-foreground mb-4">
                    View detailed history of today&apos;s completed consultations
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/guruji/consultations">
                      View Full History
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto p-4" asChild>
                <Link href="/guruji/remedies" className="flex flex-col items-center space-y-2">
                  <Heart className="h-6 w-6" />
                  <span>Manage Remedies</span>
                </Link>
              </Button>
              
              <Button variant="outline" className="h-auto p-4" asChild>
                <Link href="/guruji/consultations" className="flex flex-col items-center space-y-2">
                  <FileText className="h-6 w-6" />
                  <span>Session Notes</span>
                </Link>
              </Button>
              
              <Button variant="outline" className="h-auto p-4" asChild>
                <Link href="/guruji/appointments" className="flex flex-col items-center space-y-2">
                  <Calendar className="h-6 w-6" />
                  <span>View Schedule</span>
                </Link>
              </Button>
              
              <Button variant="outline" className="h-auto p-4" asChild>
                <Link href="/guruji/settings" className="flex flex-col items-center space-y-2">
                  <Users className="h-6 w-6" />
                  <span>Preferences</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}