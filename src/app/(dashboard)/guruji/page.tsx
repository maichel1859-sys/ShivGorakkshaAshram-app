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
import { CompleteConsultationButton } from "@/components/guruji/complete-consultation-button";
import { PageSpinner } from "@/components/loading";
import { useLoadingState } from "@/store";
import { useQueueUnified } from "@/hooks/use-queue-unified";
import { useUserAppointments } from "@/hooks/queries/use-appointments";
import { useSocket, SocketEvents } from "@/lib/socket/socket-client";
import type { QueueEntry } from "@/types/queue";
import { showToast, commonToasts } from "@/lib/toast";
import {
  startConsultation,
  completeConsultation,
  getConsultationSessionId,
} from "@/lib/actions/queue-actions";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatAppointmentDate, formatAppointmentTimeRangeOptional } from "@/lib/utils/time-formatting";
import { useThemeAware } from "@/hooks/use-theme-aware";
import Link from "next/link";

export default function GurujiDashboard() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const { socket } = useSocket();
  const { getThemeClass } = useThemeAware();
  const [prescribeModalOpen, setPrescribeModalOpen] = useState(false);
  const [selectedQueueEntry, setSelectedQueueEntry] =
    useState<QueueEntry | null>(null);
  const [consultationSessionId, setConsultationSessionId] = useState<
    string | null
  >(null);
  const [startingConsultationId, setStartingConsultationId] = useState<
    string | null
  >(null);
  const [prescribingForId, setPrescribingForId] = useState<string | null>(null);
  const [consultationStartTime, setConsultationStartTime] =
    useState<Date | null>(null);
  const [activeConsultationId, setActiveConsultationId] = useState<
    string | null
  >(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  // Use simple toast utility

  // Use unified queue hook with hybrid approach: socket primary + polling fallback
  const { queueEntries, stats, refetch, invalidateCache } = useQueueUnified({
    role: "guruji",
    autoRefresh: true,
    refreshInterval: 15000, // Smart polling: 15s fallback, 30s when socket active
    enableRealtime: true, // Socket primary with polling backup
  });

  // Get appointment data
  const { data: appointmentsData, refetch: refetchAppointments } =
    useUserAppointments();
  // Memoize appointments to prevent dependency issues
  const appointments = useMemo(
    () => appointmentsData?.appointments || [],
    [appointmentsData?.appointments]
  );

  // Calculate appointment statistics
  const appointmentStats = useMemo(() => {
    const safeParseDate = (dateValue: unknown): Date => {
      if (dateValue instanceof Date) return dateValue;
      if (typeof dateValue === "string" && dateValue) {
        const parsed = new Date(dateValue);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
      }
      return new Date();
    };

    const today = appointments.filter((apt) =>
      isToday(safeParseDate(apt.date))
    );
    const tomorrow = appointments.filter((apt) =>
      isTomorrow(safeParseDate(apt.date))
    );
    const thisWeek = appointments.filter((apt) =>
      isThisWeek(safeParseDate(apt.date))
    );
    const total = appointments.length;

    return {
      today: today.length,
      tomorrow: tomorrow.length,
      thisWeek: thisWeek.length,
      total,
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
      /* TEMP: comment out corrupted console logs and replace with clean logic
      console.log("🔌 Received appointment update:", data);

      // If this appointment update is for this Guruji, refresh appointments
      if (data.gurujiId === session.user.id) {
        console.log(
          "🔌 Refreshing appointments for action:",
          data.action,
          "status:",
          data.status
        );
      */
      // Clean replacement for the corrupted logging and refresh logic
      // If this appointment update is for this Guruji, refresh appointments
      if (data.gurujiId === session.user.id) {
        console.log('[Guruji] Appointment update:', data.action, 'status:', data.status);
        refetchAppointments();
        if (data.action === 'completed') {
          invalidateCache();
          refetch();
        }
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
  }, [
    socket,
    session?.user?.id,
    refetchAppointments,
    invalidateCache,
    refetch,
  ]);

  // Queue action handlers
  const handleStartConsultation = async (entry: QueueEntry) => {
    setStartingConsultationId(entry.id);
    try {
      const formData = new FormData();
      formData.append("queueEntryId", entry.id);

      const result = await startConsultation(formData);

      if (result.success) {
        console.log("Consultation started for:", entry.user.name);
        commonToasts.consultationStarted(entry.user.name || "Unknown User");

        // Invalidate cache and refetch once for consistency
        invalidateCache();
        await refetch();

        return result;
      } else {
        throw new Error(result.error || "Failed to start consultation");
      }
    } catch (err) {
      console.error("Error starting consultation:", err);
      showToast.error(
        err instanceof Error ? err.message : "Failed to start consultation"
      );
      throw err;
    } finally {
      setStartingConsultationId(null);
    }
  };

  const handleCompleteConsultation = async (
    entry: QueueEntry,
    onRemedyRequired?: (entry: QueueEntry) => void,
    skipRemedy: boolean = false
  ) => {
    try {
      const formData = new FormData();
      formData.append("queueEntryId", entry.id);
      if (skipRemedy) {
        formData.append("skipRemedy", "true");
      }

      const result = await completeConsultation(formData);

      if (result.success) {
        console.log("Consultation completed for:", entry.user.name);
        commonToasts.consultationCompleted(entry.user.name || "Unknown User");

        // Invalidate cache and refetch data
        invalidateCache();
        await refetch();

        return result;
      } else {
        // Check if error is about missing remedy
        if (result.error?.includes("remedy")) {
          showToast.error(
            "Please prescribe a remedy before completing the consultation"
          );
          // Trigger remedy prescription flow
          if (onRemedyRequired) {
            onRemedyRequired(entry);
          }
        } else {
          throw new Error(result.error || "Failed to complete consultation");
        }
      }
    } catch (err) {
      console.error("Error completing consultation:", err);
      showToast.error(
        err instanceof Error ? err.message : "Failed to complete consultation"
      );
      throw err;
    }
  };

  // Filter entries by status for display
  const waitingEntries =
    queueEntries?.filter((entry) => entry.status === "WAITING") || [];
  const inProgressEntries =
    queueEntries?.filter((entry) => entry.status === "IN_PROGRESS") || [];

  // Custom handlers that integrate with dashboard-specific state
  const onStartConsultation = async (entry: QueueEntry) => {
    try {
      const result = await handleStartConsultation(entry);
      if (result && result.success) {
        // Set consultation tracking info with real consultation session ID
        setConsultationStartTime(new Date());
        console.log("Setting activeConsultationId to:", result.consultationSessionId);
        setActiveConsultationId(result.consultationSessionId);
      }
    } catch {
      // Error already handled in handleStartConsultation
    }
  };

  const onCompleteConsultation = async (
    entry: QueueEntry,
    skipRemedy = false
  ) => {
    if (!skipRemedy) {
      // Show remedy prescription dialog first
      setSelectedQueueEntry(entry);
      setPrescribeModalOpen(true);
      return;
    }

    try {
      // Complete without remedy
      const result = await handleCompleteConsultation(entry, undefined, true);

      if (result && result.success) {
        // Clear consultation state
        setConsultationStartTime(null);
        setActiveConsultationId(null);
      }
    } catch {
      // Error already handled in handleCompleteConsultation
    }
  };

  // Handlers for the new complete consultation options
  const onPrescribeAndCompleteHandler = async (entry: QueueEntry) => {
    let consultationId = activeConsultationId;

    // If no active consultation ID, try to fetch it
    if (!consultationId) {
      try {
        console.log("No active consultation ID, attempting to fetch for queue entry:", entry.id);
        const result = await getConsultationSessionId(entry.id);
        if (result.success && result.consultationSessionId) {
          consultationId = result.consultationSessionId;
          setActiveConsultationId(consultationId);
          console.log("Successfully fetched consultation session ID:", consultationId);
        } else {
          showToast.error("No active consultation session found. Please start the consultation first.");
          console.error("Failed to get consultation session ID:", result.success === false ? result.error : "Unknown error");
          return;
        }
      } catch (error) {
        showToast.error("Failed to verify consultation session. Please try again.");
        console.error("Error fetching consultation session ID:", error);
        return;
      }
    }

    // Open prescribe modal with the consultation session ID
    setSelectedQueueEntry(entry);
    setConsultationSessionId(consultationId);
    setPrescribeModalOpen(true);
    setPrescribingForId(entry.id);
    console.log("Opening prescribe modal with consultationSessionId:", consultationId);
  };

  const onSkipAndCompleteHandler = async (entry: QueueEntry) => {
    try {
      // Complete without remedy directly - create FormData with skipRemedy flag
      const formData = new FormData();
      formData.append('queueEntryId', entry.id);
      formData.append('skipRemedy', 'true');

      const result = await completeConsultation(formData);

      if (result && result.success) {
        console.log("Consultation completed without remedy for:", entry.user.name);
        commonToasts.consultationCompleted(entry.user.name || "Unknown User");

        // Clear consultation state
        setConsultationStartTime(null);
        setActiveConsultationId(null);
        setPrescribingForId(null);

        // Refresh once to remove completed consultation
        invalidateCache();
        await refetch();
      } else {
        console.error("Failed to complete consultation:", result?.error);
        showToast.error(result?.error || "Failed to complete consultation");
      }
    } catch (error) {
      console.error("Error completing consultation:", error);
      showToast.error("Failed to complete consultation");
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
      gurujiId: session?.user?.id || "",
      startTime: consultationStartTime.toISOString(),
      devotee: {
        id: currentDevotee.user.id,
        name: currentDevotee.user.name,
        phone: currentDevotee.user.phone || null,
      },
    };
  }, [
    currentDevotee,
    consultationStartTime,
    activeConsultationId,
    session?.user?.id,
  ]);

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

  // Sync consultation session ID when there's a current devotee but no active consultation ID
  useEffect(() => {
    const syncConsultationSessionId = async () => {
      if (currentDevotee && !activeConsultationId) {
        try {
          console.log("Syncing consultation session ID for queue entry:", currentDevotee.id);
          const result = await getConsultationSessionId(currentDevotee.id);
          if (result.success && result.consultationSessionId) {
            console.log("Found existing consultation session ID:", result.consultationSessionId);
            setActiveConsultationId(result.consultationSessionId);
          } else {
            console.log("No existing consultation session found:", result.success === false ? result.error : "Unknown error");
          }
        } catch (error) {
          console.error("Error syncing consultation session ID:", error);
        }
      }
    };

    syncConsultationSessionId();
  }, [currentDevotee, activeConsultationId]);

  // Update timer every second
  useEffect(() => {
    if (!activeConsultation) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeConsultation]);

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
            {t("dashboard.welcome", "Welcome")},{" "}
            {session?.user.name?.split(" ")[0]}!
          </h2>
          <p className="text-muted-foreground">
            {t(
              "dashboard.spiritualConsultation",
              "Your consultation dashboard for today"
            )}
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
            <CardTitle className="text-sm font-medium">
              {t("queue.completed", "Completed")}
            </CardTitle>
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
            <CardTitle className="text-sm font-medium">
              {t("queue.waitingDevotees", "Waiting")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.waiting}</div>
            <p className="text-xs text-muted-foreground">
              {t("queue.waitingDevotees", "Devotees in queue")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("queue.waitTime", "Avg. Time")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageWaitTime}</div>
            <p className="text-xs text-muted-foreground">
              {t("queue.minutes", "Minutes")}{" "}
              {t("consultation.duration", "per session")}
            </p>
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
            <div className={getThemeClass(
              "text-center p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors",
              "text-center p-4 bg-blue-950/20 border border-blue-800 rounded-lg transition-colors"
            )}>
              <CalendarDays className={getThemeClass(
                "h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2",
                "h-8 w-8 text-blue-400 mx-auto mb-2"
              )} />
              <div className={getThemeClass(
                "text-2xl font-bold text-blue-700 dark:text-blue-300",
                "text-2xl font-bold text-blue-300"
              )}>
                {appointmentStats.today}
              </div>
              <p className={getThemeClass(
                "text-sm text-blue-600 dark:text-blue-400",
                "text-sm text-blue-400"
              )}>
                {t("common.today", "Today")}
              </p>
            </div>
            <div className={getThemeClass(
              "text-center p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg transition-colors",
              "text-center p-4 bg-green-950/20 border border-green-800 rounded-lg transition-colors"
            )}>
              <Calendar className={getThemeClass(
                "h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2",
                "h-8 w-8 text-green-400 mx-auto mb-2"
              )} />
              <div className={getThemeClass(
                "text-2xl font-bold text-green-700 dark:text-green-300",
                "text-2xl font-bold text-green-300"
              )}>
                {appointmentStats.tomorrow}
              </div>
              <p className={getThemeClass(
                "text-sm text-green-600 dark:text-green-400",
                "text-sm text-green-400"
              )}>
                {t("common.tomorrow", "Tomorrow")}
              </p>
            </div>
            <div className={getThemeClass(
              "text-center p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg transition-colors",
              "text-center p-4 bg-purple-950/20 border border-purple-800 rounded-lg transition-colors"
            )}>
              <CalendarDays className={getThemeClass(
                "h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2",
                "h-8 w-8 text-purple-400 mx-auto mb-2"
              )} />
              <div className={getThemeClass(
                "text-2xl font-bold text-purple-700 dark:text-purple-300",
                "text-2xl font-bold text-purple-300"
              )}>
                {appointmentStats.thisWeek}
              </div>
              <p className={getThemeClass(
                "text-sm text-purple-600 dark:text-purple-400",
                "text-sm text-purple-400"
              )}>
                {t("common.thisWeek", "This Week")}
              </p>
            </div>
            <div className={getThemeClass(
              "text-center p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors",
              "text-center p-4 bg-slate-950/20 border border-slate-800 rounded-lg transition-colors"
            )}>
              <Calendar className={getThemeClass(
                "h-8 w-8 text-slate-600 dark:text-slate-400 mx-auto mb-2",
                "h-8 w-8 text-slate-400 mx-auto mb-2"
              )} />
              <div className={getThemeClass(
                "text-2xl font-bold text-slate-700 dark:text-slate-300",
                "text-2xl font-bold text-slate-300"
              )}>
                {appointmentStats.total}
              </div>
              <p className={getThemeClass(
                "text-sm text-slate-600 dark:text-slate-400",
                "text-sm text-slate-400"
              )}>
                {t("common.total", "Total")}
              </p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" asChild>
              <Link href="/guruji/appointments">
                <Calendar className="h-4 w-4 mr-2" />
                {t("nav.myAppointments", "View All Appointments")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Consultation Section */}
      {currentDevotee && activeConsultation && (
        <Card className={getThemeClass(
          "border-2 border-green-500 bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 shadow-lg hover:shadow-xl transition-all duration-300 ring-2 ring-green-200",
          "border-2 border-green-700 bg-gradient-to-br from-green-950/40 via-emerald-950/30 to-teal-950/40 shadow-lg hover:shadow-xl transition-all duration-300"
        )}>
          <CardHeader className="pb-4">
            <CardTitle className={getThemeClass(
              "flex items-center gap-3 text-xl font-bold text-green-800",
              "flex items-center gap-3 text-xl font-bold text-emerald-300"
            )}>
              <div className={getThemeClass(
                "p-3 bg-green-500 text-white rounded-full shadow-md",
                "p-2 bg-emerald-900/50 rounded-full"
              )}>
                <Play className="h-5 w-5" />
              </div>
              Current Consultation
              <Badge className={getThemeClass(
                "bg-green-500 text-white hover:bg-green-600 shadow-sm px-3 py-1",
                "bg-emerald-900 text-emerald-200 hover:bg-emerald-800"
              )}>
                ACTIVE
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Devotee Info Section */}
              <div className={getThemeClass(
                "space-y-4 p-5 bg-white rounded-xl border-2 border-green-300 shadow-md",
                "space-y-4 p-4 bg-black/20 rounded-xl border border-emerald-800/50"
              )}>
                <div className="flex items-center space-x-4">
                  <Avatar className={getThemeClass(
                    "h-16 w-16 ring-4 ring-green-400 shadow-lg",
                    "h-14 w-14 ring-2 ring-emerald-700"
                  )}>
                    <AvatarFallback className={getThemeClass(
                      "bg-green-500 text-white text-xl font-bold shadow-inner",
                      "bg-emerald-900/70 text-emerald-300 text-lg font-bold"
                    )}>
                      {currentDevotee.user.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className={getThemeClass(
                      "text-xl font-bold text-gray-900",
                      "text-lg font-bold text-emerald-200"
                    )}>
                      {currentDevotee.user.name || "Unknown User"}
                    </h3>
                    <div className="space-y-2 mt-3">
                      <div className={getThemeClass(
                        "inline-flex items-center px-3 py-1.5 bg-green-500 text-white text-sm font-medium rounded-full shadow-sm",
                        "inline-flex items-center px-2 py-1 bg-emerald-900/50 text-emerald-300 text-sm font-medium rounded-md"
                      )}>
                        Priority: {currentDevotee.priority || "NORMAL"}
                      </div>
                      {currentDevotee.user.phone && (
                        <p className={getThemeClass(
                          "flex items-center gap-2 text-sm text-gray-700 font-medium",
                          "flex items-center gap-1 text-sm text-emerald-400"
                        )}>
                          <Phone className="h-4 w-4 text-green-500" />
                          {currentDevotee.user.phone}
                        </p>
                      )}
                      {currentDevotee.appointment && (
                        <div className={getThemeClass(
                          "text-xs text-green-500 dark:text-green-400 space-y-1",
                          "text-xs text-green-400 space-y-1"
                        )}>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {(() => {
                                if (!currentDevotee.appointment)
                                  return "No appointment details";

                                const rawDate = currentDevotee.appointment.date;
                                const rawStartTime =
                                  currentDevotee.appointment.startTime;

                                const date = rawDate
                                  ? new Date(rawDate)
                                  : new Date();
                                const startTime = rawStartTime
                                  ? new Date(rawStartTime)
                                  : new Date();

                                return `${format(
                                  isNaN(date.getTime()) ? new Date() : date,
                                  "MMM dd"
                                )} at ${format(
                                  isNaN(startTime.getTime())
                                    ? new Date()
                                    : startTime,
                                  "h:mm a"
                                )}`;
                              })()}
                            </span>
                          </div>
                          {currentDevotee.appointment.reason && (
                            <p>
                              <strong>Reason:</strong>{" "}
                              {currentDevotee.appointment.reason}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timer Section */}
              <div className="space-y-4">
                <div className={getThemeClass(
                  "text-center p-8 bg-white border-4 border-blue-500 rounded-2xl shadow-xl ring-2 ring-blue-200",
                  "text-center p-8 bg-gradient-to-br from-blue-950/40 to-indigo-950/40 border-4 border-blue-600 rounded-2xl shadow-xl"
                )}>
                  <div className="flex items-center justify-center mb-6">
                    <div className={getThemeClass(
                      "p-4 bg-blue-500 rounded-full",
                      "p-4 bg-blue-600 rounded-full"
                    )}>
                      <Timer className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  <h3 className={getThemeClass(
                    "text-3xl font-bold text-blue-800 mb-4",
                    "text-3xl font-bold text-blue-100 mb-4"
                  )}>
                    Session Timer
                  </h3>
                  <div className={getThemeClass(
                    "text-6xl font-mono font-bold text-blue-900 mb-4 tracking-tight",
                    "text-6xl font-mono font-bold text-blue-200 mb-4 tracking-tight"
                  )}>
                    {(() => {
                      const startTime = new Date(activeConsultation.startTime);
                      const elapsed = Math.floor(
                        (currentTime.getTime() - startTime.getTime()) / 1000
                      );
                      const hours = Math.floor(elapsed / 3600);
                      const minutes = Math.floor((elapsed % 3600) / 60);
                      const seconds = elapsed % 60;

                      if (hours > 0) {
                        return `${hours.toString().padStart(2, "0")}:${minutes
                          .toString()
                          .padStart(2, "0")}:${seconds
                          .toString()
                          .padStart(2, "0")}`;
                      }
                      return `${minutes.toString().padStart(2, "0")}:${seconds
                        .toString()
                        .padStart(2, "0")}`;
                    })()}
                  </div>
                  <p className={getThemeClass(
                    "text-blue-700 text-xl font-medium",
                    "text-blue-300 text-xl font-medium"
                  )}>
                    Started: {new Date(activeConsultation.startTime).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={getThemeClass(
              "flex justify-center pt-6 mt-6 border-t-2 border-emerald-200 dark:border-emerald-700",
              "flex justify-center pt-6 mt-6 border-t-2 border-emerald-700"
            )}>
              <CompleteConsultationButton
                onPrescribeAndComplete={() =>
                  onPrescribeAndCompleteHandler(currentDevotee)
                }
                onSkipAndComplete={() =>
                  onSkipAndCompleteHandler(currentDevotee)
                }
                isLoading={prescribingForId === currentDevotee.id}
                loadingText="Opening..."
              />
            </div>
          </CardContent>
        </Card>
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
            <strong>Important:</strong> Remedies must be prescribed before
            completing consultations
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
                          .toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">
                        {devotee.user.name || "Unknown User"}
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
                              {`${formatAppointmentDate(devotee.appointment.date)} at ${formatAppointmentTimeRangeOptional(devotee.appointment.startTime, devotee.appointment.endTime)}`}
                            </span>
                          </div>
                          {devotee.appointment.reason && (
                            <p>
                              <strong>Appointment Reason:</strong>{" "}
                              {devotee.appointment.reason}
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
                      className={`${getPriorityColor(
                        devotee.priority || "NORMAL"
                      )} px-2 py-1`}
                    >
                      {devotee.priority || "NORMAL"}
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
                          window.open(`tel:${devotee.user.phone}`, "_blank");
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
            setPrescribingForId(null);
          }}
          consultationId={consultationSessionId}
          devoteeName={selectedQueueEntry.user.name || "Devotee"}
          devoteeId={selectedQueueEntry.user.id}
          onSuccess={async () => {
            // After remedy is prescribed, complete the consultation automatically
            if (selectedQueueEntry) {
              try {
                console.log("Remedy prescribed successfully, completing consultation for:", selectedQueueEntry.user.name);
                const result = await handleCompleteConsultation(selectedQueueEntry);

                if (result && result.success) {
                  console.log("Consultation completed successfully");

                  // Close modal and clear all related state
                  setPrescribeModalOpen(false);
                  setSelectedQueueEntry(null);
                  setConsultationSessionId(null);

                  // Clear consultation state
                  setConsultationStartTime(null);
                  setActiveConsultationId(null);
                  setPrescribingForId(null);

                  // Refresh once to ensure completed consultation is removed
                  invalidateCache();
                  await refetch();
                } else {
                  console.error("Failed to complete consultation:", result?.error);
                  showToast.error("Remedy prescribed but failed to complete consultation. Please complete manually.");
                }
              } catch (error) {
                console.error("Error completing consultation after remedy:", error);
                showToast.error("Remedy prescribed but failed to complete consultation. Please complete manually.");
              }
            } else {
              console.error("No selected queue entry found for completion");
              // Fallback: just clear state and refresh
              setPrescribeModalOpen(false);
              setSelectedQueueEntry(null);
              setConsultationSessionId(null);
              setConsultationStartTime(null);
              setActiveConsultationId(null);
              setPrescribingForId(null);
              invalidateCache();
              await refetch();
            }
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
