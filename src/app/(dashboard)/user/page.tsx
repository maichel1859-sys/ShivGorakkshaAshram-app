"use client";
import { logger } from '@/lib/logger';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser, useUserRedirect } from "@/store/auth-store";
import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Heart,
  Plus,
  AlertCircle,
  Activity,
} from "lucide-react";
import { useUserDashboard } from "@/hooks/queries";
import { useAppStore } from "@/store/app-store";
import { PageSpinner } from "@/components/loading";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSocket, SocketEvents } from "@/lib/socket/socket-client";
import { useQueryClient } from "@tanstack/react-query";
import { userKeys } from "@/hooks/queries/use-users";
// LoadingSpinner available if needed
// import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface AppointmentDisplay {
  id: string;
  date: Date;
  guruji: {
    id: string;
    name: string | null;
  } | null;
  status: string;
  consultationSession?: {
    id: string;
    startTime: Date;
    endTime: Date | null;
    remedies: {
      id: string;
    }[];
  } | null;
  queueEntry?: {
    id: string;
    position: number | null;
    status: string;
  } | null;
}


export default function UserDashboard() {
  const user = useUser();
  const router = useRouter();
  const { isLoading: authLoading, shouldRedirect, redirectTo } = useUserRedirect();
  const { data: dashboardData, isLoading, error, refetch } = useUserDashboard();
  const { setLoadingState } = useAppStore();
  const { t } = useLanguage();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  // Handle authentication redirect
  React.useEffect(() => {
    if (shouldRedirect && redirectTo) {
      logger.debug('UserDashboard: Redirecting to', redirectTo);
      router.push(redirectTo);
    }
  }, [shouldRedirect, redirectTo, router]);

  // Update centralized loading state
  React.useEffect(() => {
    setLoadingState("dashboard-loading", isLoading || authLoading);
  }, [isLoading, authLoading, setLoadingState]);

  // Socket event listeners for real-time updates
  React.useEffect(() => {
    if (!socket || !user?.id) return;

    const handleDashboardUpdate = () => {
      logger.debug('Dashboard update received - refreshing user dashboard data');
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() });
      refetch();
    };

    const handleRemedyUpdate = (...args: unknown[]) => {
      const data = args[0] as { userId?: string; devoteeId?: string; remedyId?: string } | undefined;
      logger.debug('Remedy update received:', data);
      // If the remedy is for this user, update dashboard
      if (data && (data.userId === user.id || data.devoteeId === user.id)) {
        queryClient.invalidateQueries({ queryKey: userKeys.dashboard() });
        refetch();
      }
    };

    const handleNotificationUpdate = (...args: unknown[]) => {
      const data = args[0] as { userId?: string; notificationId?: string; title?: string } | undefined;
      logger.debug('Notification update received:', data);
      // If the notification is for this user, update dashboard
      if (data && data.userId === user.id) {
        queryClient.invalidateQueries({ queryKey: userKeys.dashboard() });
        refetch();
      }
    };

    const handleConsultationUpdate = (...args: unknown[]) => {
      const data = args[0] as { devoteeId?: string; userId?: string; consultationId?: string; gurujiId?: string } | undefined;
      logger.debug('Consultation update received:', data);
      // If the consultation involves this user, update dashboard
      if (data && (data.devoteeId === user.id || data.userId === user.id)) {
        queryClient.invalidateQueries({ queryKey: userKeys.dashboard() });
        refetch();
      }
    };

    const handleQueueUpdate = (...args: unknown[]) => {
      const data = args[0] as { userId?: string; queueEntryId?: string; status?: string; position?: number } | undefined;
      logger.debug('Queue update received:', data);
      // If the queue update is for this user, update dashboard
      if (data && data.userId === user.id) {
        queryClient.invalidateQueries({ queryKey: userKeys.dashboard() });
        refetch();
      }
    };

    // Subscribe to events
    socket.on(SocketEvents.DASHBOARD_UPDATE, handleDashboardUpdate);
    socket.on(SocketEvents.REMEDY_PRESCRIBED, handleRemedyUpdate);
    socket.on(SocketEvents.REMEDY_UPDATE, handleRemedyUpdate);
    socket.on(SocketEvents.NOTIFICATION_SENT, handleNotificationUpdate);
    socket.on(SocketEvents.NOTIFICATION_UPDATE, handleNotificationUpdate);
    socket.on(SocketEvents.CONSULTATION_UPDATE, handleConsultationUpdate);
    socket.on(SocketEvents.QUEUE_UPDATED, handleQueueUpdate);
    socket.on(SocketEvents.USER_QUEUE_STATUS, handleQueueUpdate);

    // Join user-specific room for targeted updates
    socket.emit(SocketEvents.JOIN_ROOM, {
      room: `user_${user.id}`,
      userId: user.id,
      role: 'USER'
    });

    // Cleanup
    return () => {
      socket.off(SocketEvents.DASHBOARD_UPDATE, handleDashboardUpdate);
      socket.off(SocketEvents.REMEDY_PRESCRIBED, handleRemedyUpdate);
      socket.off(SocketEvents.REMEDY_UPDATE, handleRemedyUpdate);
      socket.off(SocketEvents.NOTIFICATION_SENT, handleNotificationUpdate);
      socket.off(SocketEvents.NOTIFICATION_UPDATE, handleNotificationUpdate);
      socket.off(SocketEvents.CONSULTATION_UPDATE, handleConsultationUpdate);
      socket.off(SocketEvents.QUEUE_UPDATED, handleQueueUpdate);
      socket.off(SocketEvents.USER_QUEUE_STATUS, handleQueueUpdate);
    };
  }, [socket, user?.id, queryClient, refetch]);

  // Show loading while checking auth or loading data
  if (isLoading || authLoading) {
    return <PageSpinner message={t('common.loading', 'Loading dashboard...')} />;
  }

  // Don't render anything while redirecting
  if (shouldRedirect) {
    return null;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-muted-foreground">
              {t('dashboard.failedToLoad', 'Failed to load dashboard data')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const appointmentCount = dashboardData?.stats?.appointmentCount || 0;
  const currentQueuePosition = dashboardData?.stats?.currentQueuePosition;
  const currentQueueStatus = dashboardData?.stats?.currentQueueStatus;
  const pendingRemedies = dashboardData?.stats?.pendingRemedies || 0;
  const totalRemedies = dashboardData?.stats?.totalRemedies || 0;
  const completedConsultations = dashboardData?.stats?.completedConsultations || 0;
  const recentAppointments = dashboardData?.recentAppointments || [];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t('dashboard.welcomeBack', 'Welcome back')}, {user?.name?.split(" ")[0]}!
          </h2>
          <p className="text-muted-foreground">
            {t('dashboard.todayOverview', "Here's what's happening with your appointments today.")}
          </p>
        </div>
        <Button asChild>
          <Link href="/user/appointments/book">
            <Plus className="mr-2 h-4 w-4" />
            {t('nav.bookAppointment', 'Book Appointment')}
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.nextAppointment', 'Next Appointment')}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t('dashboard.noUpcoming', 'No upcoming')}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.bookYourNext', 'Book your next appointment')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('queue.position', 'Queue Position')}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentQueuePosition ? `#${currentQueuePosition}` : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentQueuePosition && currentQueueStatus ? currentQueueStatus.toLowerCase() : t('queue.notInQueue', 'Not in queue')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.pendingRemedies', 'Pending Remedies')}
            </CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRemedies}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.totalRemedies', `${totalRemedies} total prescribed`)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.totalAppointments', 'Total Appointments')}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointmentCount}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.completedConsultations', `${completedConsultations} consultations completed`)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('dashboard.recentAppointments', 'Recent Appointments')}
            </CardTitle>
            <CardDescription>{t('dashboard.yourRecentAppointments', 'Your recent appointments')}</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAppointments.length > 0 ? (
              <div className="space-y-3">
                {recentAppointments.map((appointment: AppointmentDisplay) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {useTimeStore.getState().formatDate(appointment.date)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.guruji?.name || t('dashboard.unknownGuruji', 'Unknown Guruji')}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {appointment.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                {t('dashboard.noRecentAppointments', 'No recent appointments')}
              </div>
            )}
          </CardContent>
        </Card>


      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.quickActions', 'Quick Actions')}</CardTitle>
          <CardDescription>{t('dashboard.frequentlyUsedFeatures', 'Access frequently used features')}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" asChild>
            <Link href="/user/appointments/book">{t('nav.bookAppointment', 'Book Appointment')}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/user/queue">{t('nav.myQueue', 'My Queue')}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/user/remedies">{t('nav.myRemedies', 'My Remedies')}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/user/qr-scanner">{t('nav.qrScanner', 'QR Scanner')}</Link>
          </Button>
        </CardContent>
      </Card>


    </div>
  );
}
import { useTimeStore } from "@/store/time-store";


