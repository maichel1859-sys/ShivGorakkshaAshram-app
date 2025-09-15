"use client";

import { useState, useEffect, useMemo } from "react";
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
  Timer,
  Phone,
  MessageSquare,
  AlertCircle,
  Loader2,
  Calendar,
  CalendarDays,
} from "lucide-react";
import { PrescribeRemedyModal } from "@/components/guruji/prescribe-remedy-modal";
import { ConsultationTimer } from "@/components/guruji/consultation-timer";
import { CompleteConsultationButton } from "@/components/guruji/complete-consultation-button";
import { PageSpinner } from "@/components/loading";
import { useLoadingState } from "@/store";
import { useQueueUnified } from "@/hooks/use-queue-unified";
import { useGurujiAppointments } from "@/hooks/queries/use-guruji-appointments";
import { useSocket, SocketEvents } from "@/lib/socket/socket-client";
import type { QueueEntry } from "@/types/queue";
import { showToast, commonToasts } from "@/lib/toast";
import {
  startConsultation,
  completeConsultation,
  getConsultationSessionId
} from "@/lib/actions/queue-actions";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

export default function GurujiDashboard() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const { socket } = useSocket();
  const [prescribeModalOpen, setPrescribeModalOpen] = useState(false);
  const [selectedQueueEntry, setSelectedQueueEntry] = useState<QueueEntry | null>(null);
  const [consultationSessionId, setConsultationSessionId] = useState<string | null>(null);
  const [startingConsultationId, setStartingConsultationId] = useState<string | null>(null);
  const [prescribingForId, setPrescribingForId] = useState<string | null>(null);
  const [consultationStartTime, setConsultationStartTime] = useState<Date | null>(null);
  const [activeConsultationId, setActiveConsultationId] = useState<string | null>(null);
  
  // Use simple toast utility

  // Use unified queue hook with hybrid approach: socket primary + polling fallback
  const {
    queueEntries,
    stats,
    refetch,
    invalidateCache,
  } = useQueueUnified({
    role: 'guruji',
    autoRefresh: true,
    refreshInterval: 15000, // Smart polling: 15s fallback, 30s when socket active
    enableRealtime: true, // Socket primary with polling backup
  });

  // Get appointment data
  const { data: appointments = [], refetch: refetchAppointments } = useGurujiAppointments();

  // Calculate appointment statistics
  const appointmentStats = useMemo(() => {
    const safeParseDate = (dateValue: unknown): Date => {
      if (dateValue instanceof Date) return dateValue;
      if (typeof dateValue === 'string' && dateValue) {
        const parsed = new Date(dateValue);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
      }
      return new Date();
    };

    const today = appointments.filter(apt => isToday(safeParseDate(apt.date)));
    const tomorrow = appointments.filter(apt => isTomorrow(safeParseDate(apt.date)));
    const thisWeek = appointments.filter(apt => isThisWeek(safeParseDate(apt.date)));
    const total = appointments.length;

    return {
      today: today.length,
      tomorrow: tomorrow.length,
      thisWeek: thisWeek.length,
      total
    };
  }, [appointments]);

  // Socket listener for appointment updates
  useEffect(() => {
    if (!session?.user?.id) return;

    const handleAppointmentUpdate = (...args: unknown[]) => {
      const data = args[0] as {
        appointmentId: string;
        status: string;
        action: string;
        gurujiId: string;
        userId: string;
        appointment?: unknown;
        timestamp: string;
      };

      console.log('🔌 Received appointment update:', data);

      // If this appointment update is for this Guruji, refresh appointments
      if (data.gurujiId === session.user.id) {
        console.log('🔌 Refreshing appointments for action:', data.action, 'status:', data.status);
        refetchAppointments();

        // Also refresh queue if consultation was completed
        if (data.action === 'completed') {
          invalidateCache();
          refetch();
        }

        // Show notification for new bookings
        if (data.action === 'booked') {
          const devoteeName = (data as { devoteeName?: string }).devoteeName || 'A devotee';
          showToast.success(`${devoteeName} has booked a new appointment with you`);
        } else if (data.action === 'cancelled') {
          const devoteeName = (data as { devoteeName?: string }).devoteeName || 'A devotee';
          showToast.error(`${devoteeName} has cancelled their appointment`);
        }
      }
    };

    socket.on(SocketEvents.APPOINTMENT_UPDATE, handleAppointmentUpdate);

    return () => {
      socket.off(SocketEvents.APPOINTMENT_UPDATE, handleAppointmentUpdate);
    };
  }, [socket, session?.user?.id, refetchAppointments, invalidateCache, refetch]);



  // Queue action handlers
  const handleStartConsultation = async (entry: QueueEntry) => {
    setStartingConsultationId(entry.id);
    try {
      const formData = new FormData();
      formData.append('queueEntryId', entry.id);
      
      const result = await startConsultation(formData);
      
      if (result.success) {
        console.log('Consultation started for:', entry.user.name);
        commonToasts.consultationStarted(entry.user.name || 'Unknown User');

        // Invalidate cache and refetch data immediately
        invalidateCache();
        await refetch();

        // Force an additional refresh after a short delay to ensure consistency
        setTimeout(async () => {
          invalidateCache();
          await refetch();
        }, 1000);
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to start consultation');
      }
    } catch (err) {
      console.error('Error starting consultation:', err);
      showToast.error(err instanceof Error ? err.message : 'Failed to start consultation');
      throw err;
    } finally {
      setStartingConsultationId(null);
    }
  };

  const handleCompleteConsultation = async (entry: QueueEntry, onRemedyRequired?: (entry: QueueEntry) => void) => {
    try {
      const formData = new FormData();
      formData.append('queueEntryId', entry.id);
      
      const result = await completeConsultation(formData);
      
      if (result.success) {
        console.log('Consultation completed for:', entry.user.name);
        commonToasts.consultationCompleted(entry.user.name || 'Unknown User');
        
        // Invalidate cache and refetch data
        invalidateCache();
        await refetch();
        
        return result;
      } else {
        // Check if error is about missing remedy
        if (result.error?.includes('remedy')) {
          showToast.error('Please prescribe a remedy before completing the consultation');
          // Trigger remedy prescription flow
          if (onRemedyRequired) {
            onRemedyRequired(entry);
          }
        } else {
          throw new Error(result.error || 'Failed to complete consultation');
        }
      }
    } catch (err) {
      console.error('Error completing consultation:', err);
      showToast.error(err instanceof Error ? err.message : 'Failed to complete consultation');
      throw err;
    }
  };

  const handlePrescribeRemedy = async (entry: QueueEntry, onSuccess?: (consultationSessionId: string, entry: QueueEntry) => void) => {
    setPrescribingForId(entry.id);
    try {
      // Get the consultation session ID
      const sessionResult = await getConsultationSessionId(entry.id);
      
      if (sessionResult.success && sessionResult.consultationSessionId) {
        console.log('Opening remedy prescription for:', entry.user.name);
        
        if (onSuccess) {
          onSuccess(sessionResult.consultationSessionId, entry);
        }
      } else {
        // If no active consultation session, start one first
        const startResult = await handleStartConsultation(entry);
        if (startResult.success && startResult.consultationSessionId) {
          if (onSuccess) {
            onSuccess(startResult.consultationSessionId, entry);
          }
        } else {
          throw new Error('No active consultation session found');
        }
      }
    } catch (err) {
      console.error('Error preparing remedy prescription:', err);
      showToast.error(err instanceof Error ? err.message : 'Failed to prepare remedy prescription');
    } finally {
      setPrescribingForId(null);
    }
  };

  // Filter entries by status for display
  const waitingEntries = queueEntries?.filter(entry => entry.status === 'WAITING') || [];
  const inProgressEntries = queueEntries?.filter(entry => entry.status === 'IN_PROGRESS') || [];

  // Custom handlers that integrate with dashboard-specific state
  const onStartConsultation = async (entry: QueueEntry) => {
    try {
      const result = await handleStartConsultation(entry);
      if (result && result.success) {
        // Set consultation tracking info
        setConsultationStartTime(new Date());
        setActiveConsultationId(result.consultationSessionId || `session-${entry.id}`);
      }
    } catch {
      // Error already handled in handleStartConsultation
    }
  };

  const onCompleteConsultation = async (entry: QueueEntry, skipRemedy = false) => {
    if (!skipRemedy) {
      // Show remedy prescription dialog first
      setSelectedQueueEntry(entry);
      setPrescribeModalOpen(true);
      return;
    }
    
    try {
      // Complete without remedy
      const result = await handleCompleteConsultation(entry);
      
      if (result && result.success) {
        // Clear consultation state
        setConsultationStartTime(null);
        setActiveConsultationId(null);
      }
    } catch {
      // Error already handled in handleCompleteConsultation
    }
  };

  // const _onPrescribeRemedy = async (entry: QueueEntry) => {
  //   await handlePrescribeRemedy(entry, (consultationSessionId, entry) => {
  //     setConsultationSessionId(consultationSessionId);
  //     setSelectedQueueEntry(entry);
  //     setPrescribeModalOpen(true);
  //   });
  // };

  // Handlers for the new complete consultation options
  const onPrescribeAndCompleteHandler = (entry: QueueEntry) => {
    // Open prescribe modal first
    setSelectedQueueEntry(entry);
    setPrescribeModalOpen(true);
    setPrescribingForId(entry.id);
  };

  const onSkipAndCompleteHandler = async (entry: QueueEntry) => {
    try {
      // Complete without remedy directly
      const result = await handleCompleteConsultation(entry);

      if (result && result.success) {
        // Clear consultation state
        setConsultationStartTime(null);
        setActiveConsultationId(null);

        // Force queue refresh to remove completed consultation
        invalidateCache();
        await refetch();

        // Additional refresh to ensure UI consistency
        setTimeout(async () => {
          invalidateCache();
          await refetch();
        }, 500);
      }
    } catch {
      // Error already handled in handleCompleteConsultation
    }
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

  // Get current devotee from in-progress entries
  const currentDevotee = inProgressEntries[0] || null;

  // Create consultation session data for timer (when devotee is in progress)
  const activeConsultation = useMemo(() => {
    if (!currentDevotee || !consultationStartTime) return null;
    
    return {
      id: activeConsultationId || `temp-${currentDevotee.id}`,
      appointmentId: currentDevotee.appointment?.id || currentDevotee.id,
      devoteeId: currentDevotee.user.id,
      gurujiId: session?.user?.id || '',
      startTime: consultationStartTime.toISOString(),
      devotee: {
        id: currentDevotee.user.id,
        name: currentDevotee.user.name,
        phone: currentDevotee.user.phone || null,
      }
    };
  }, [currentDevotee, consultationStartTime, activeConsultationId, session?.user?.id]);

  // Update consultation start time when devotee consultation begins
  useEffect(() => {
    if (currentDevotee && !consultationStartTime) {
      // Set start time when first devotee becomes current
      setConsultationStartTime(new Date());
    } else if (!currentDevotee && consultationStartTime) {
      // Clear start time when no current devotee
      setConsultationStartTime(null);
      setActiveConsultationId(null);
    }
  }, [currentDevotee, consultationStartTime]);

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
            {t("dashboard.welcome", "Welcome")}, {session?.user.name?.split(" ")[0]}!
          </h2>
          <p className="text-muted-foreground">
            {t("dashboard.spiritualConsultation", "Your consultation dashboard for today")}
          </p>
        </div>

        {/* Active Consultation Indicator */}
        {currentDevotee && (
          <div className="flex items-center space-x-2 bg-green-50 p-3 rounded-lg">
            <Timer className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-700">
              {t("consultation.inProgress", "Active consultation in progress")}
            </span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.todaysAppointments", "Today's Total")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {t("queue.waitingDevotees", "Total devotees today")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("queue.completed", "Completed")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {t("consultation.summary", "Consultations completed")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("queue.waitingDevotees", "Waiting")}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.waiting}</div>
            <p className="text-xs text-muted-foreground">{t("queue.waitingDevotees", "Devotees in queue")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("queue.waitTime", "Avg. Time")}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageWaitTime}
            </div>
            <p className="text-xs text-muted-foreground">{t("queue.minutes", "Minutes")} {t("consultation.duration", "per session")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("appointments.upcoming", "Appointment Overview")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <CalendarDays className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-700">{appointmentStats.today}</div>
              <p className="text-sm text-blue-600">{t("common.today", "Today")}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700">{appointmentStats.tomorrow}</div>
              <p className="text-sm text-green-600">{t("common.tomorrow", "Tomorrow")}</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <CalendarDays className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-700">{appointmentStats.thisWeek}</div>
              <p className="text-sm text-purple-600">{t("common.thisWeek", "This Week")}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Calendar className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-700">{appointmentStats.total}</div>
              <p className="text-sm text-gray-600">{t("common.total", "Total")}</p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" asChild>
              <a href="/guruji/appointments">
                <Calendar className="h-4 w-4 mr-2" />
                {t("nav.myAppointments", "View All Appointments")}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Devotee Section */}
      {currentDevotee && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Devotee Info Card */}
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Play className="h-5 w-5" />
                Current Consultation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {currentDevotee.user.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-green-800">
                      {currentDevotee.user.name || 'Unknown User'}
                    </h3>
                    <div className="space-y-1">
                      <p className="text-sm text-green-600">
                        Priority: {currentDevotee.priority || 'NORMAL'}
                      </p>
                      {currentDevotee.user.phone && (
                        <p className="text-xs text-green-500">
                          Phone: {currentDevotee.user.phone}
                        </p>
                      )}
                      {currentDevotee.appointment && (
                        <div className="text-xs text-green-500 space-y-1">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {(() => {
                                if (!currentDevotee.appointment) return 'No appointment details';

                                const rawDate = currentDevotee.appointment.date;
                                const rawStartTime = currentDevotee.appointment.startTime;

                                const date = rawDate ? new Date(rawDate) : new Date();
                                const startTime = rawStartTime ? new Date(rawStartTime) : new Date();

                                return `${format(isNaN(date.getTime()) ? new Date() : date, "MMM dd")} at ${format(isNaN(startTime.getTime()) ? new Date() : startTime, "h:mm a")}`;
                              })()}
                            </span>
                          </div>
                          {currentDevotee.appointment.reason && (
                            <p><strong>Reason:</strong> {currentDevotee.appointment.reason}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Complete Button */}
                <div className="flex justify-end">
                  <CompleteConsultationButton
                    onPrescribeAndComplete={() => onPrescribeAndCompleteHandler(currentDevotee)}
                    onSkipAndComplete={() => onSkipAndCompleteHandler(currentDevotee)}
                    isLoading={prescribingForId === currentDevotee.id}
                    loadingText="Opening..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consultation Timer */}
          {activeConsultation && (
            <ConsultationTimer
              consultation={activeConsultation}
              onUpdate={async (updatedConsultation) => {
                if (updatedConsultation.endTime) {
                  // Consultation completed, refresh data immediately
                  invalidateCache();
                  await refetch();

                  // Clear consultation state
                  setConsultationStartTime(null);
                  setActiveConsultationId(null);

                  // Additional refresh to ensure completed consultation is removed from queue
                  setTimeout(async () => {
                    invalidateCache();
                    await refetch();
                  }, 1000);
                }
              }}
              onPrescribeAndComplete={() => {
                const currentDevotee = queueEntries.find(p => p.status === 'IN_PROGRESS');
                if (currentDevotee) {
                  onPrescribeAndCompleteHandler(currentDevotee);
                }
              }}
              onSkipAndComplete={() => {
                const currentDevotee = queueEntries.find(p => p.status === 'IN_PROGRESS');
                if (currentDevotee) {
                  onSkipAndCompleteHandler(currentDevotee);
                }
              }}
            />
          )}
        </div>
      )}

      {/* Queue Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Devotee Queue
          </CardTitle>
          <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 mt-2">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            <strong>Important:</strong> Remedies must be prescribed before completing consultations
          </div>
        </CardHeader>
        <CardContent>
          {waitingEntries.length > 0 ? (
            <div className="space-y-3">
              {waitingEntries.map((devotee) => (
                <div
                  key={devotee.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                      <span className="text-sm font-semibold text-primary">
                        {devotee.position}
                      </span>
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {devotee.user.name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">
                        {devotee.user.name || 'Unknown User'}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Position: #{devotee.position}</span>
                        {devotee.user.phone && (
                          <span className="flex items-center">
                            <Phone className="mr-1 h-3 w-3" />
                            {devotee.user.phone}
                          </span>
                        )}
                        {devotee.estimatedWait && (
                          <span className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            Est. wait: {devotee.estimatedWait}m
                          </span>
                        )}
                      </div>

                      {/* Appointment Details */}
                      {devotee.appointment && (
                        <div className="text-sm text-muted-foreground mt-2 space-y-1">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {(() => {
                                const date = new Date(devotee.appointment.date);
                                const startTime = new Date(devotee.appointment.startTime);
                                const endTime = devotee.appointment.endTime ? new Date(devotee.appointment.endTime) : null;

                                const formattedDate = format(isNaN(date.getTime()) ? new Date() : date, "MMM dd, yyyy");
                                const formattedStartTime = format(isNaN(startTime.getTime()) ? new Date() : startTime, "h:mm a");
                                const formattedEndTime = endTime && !isNaN(endTime.getTime())
                                  ? ` - ${format(endTime, "h:mm a")}`
                                  : '';

                                return `${formattedDate} at ${formattedStartTime}${formattedEndTime}`;
                              })()}
                            </span>
                          </div>
                          {devotee.appointment.reason && (
                            <p>
                              <strong>Appointment Reason:</strong> {devotee.appointment.reason}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Queue Notes */}
                      {devotee.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Queue Notes:</strong> {devotee.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge
                      className={`${getPriorityColor(devotee.priority || 'NORMAL')} px-2 py-1`}
                    >
                      {devotee.priority || 'NORMAL'}
                    </Badge>
                    {!currentDevotee && (
                      <Button
                        onClick={() => onStartConsultation(devotee)}
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                        disabled={startingConsultationId === devotee.id}
                      >
                        {startingConsultationId === devotee.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </>
                        )}
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        if (devotee.user.phone) {
                          window.open(`tel:${devotee.user.phone}`, '_blank');
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
                No devotees in queue
              </h3>
              <p className="text-sm text-muted-foreground">
                All devotees have been seen or no appointments scheduled
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
            setConsultationSessionId(null);
          }}
          consultationId={consultationSessionId}
          devoteeName={selectedQueueEntry.user.name || "Devotee"}
          onSuccess={async () => {
            // Clear consultation state and refresh queue data
            setConsultationStartTime(null);
            setActiveConsultationId(null);

            // Force immediate queue refresh
            invalidateCache();
            await refetch();

            // Additional refresh to ensure completed consultation is removed
            setTimeout(async () => {
              invalidateCache();
              await refetch();
            }, 500);
          }}
          onSkip={() => {
            // Complete consultation without remedy
            onCompleteConsultation(selectedQueueEntry, true);
            setSelectedQueueEntry(null);
            setConsultationSessionId(null);
          }}
        />
      )}
    </div>
  );
}
