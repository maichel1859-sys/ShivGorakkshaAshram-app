"use client";

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
// LoadingSpinner available if needed
// import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Appointment {
  id: string;
  date: Date;
  guruji: {
    id: string;
    name: string | null;
  } | null;
  status: string;
}


export default function UserDashboard() {
  const user = useUser();
  const router = useRouter();
  const { isLoading: authLoading, shouldRedirect, redirectTo } = useUserRedirect();
  const { data: dashboardData, isLoading, error } = useUserDashboard();
  const { setLoadingState } = useAppStore();
  const { t } = useLanguage();

  // Handle authentication redirect
  React.useEffect(() => {
    if (shouldRedirect && redirectTo) {
      console.log('🔀 UserDashboard: Redirecting to', redirectTo);
      router.push(redirectTo);
    }
  }, [shouldRedirect, redirectTo, router]);

  // Update centralized loading state
  React.useEffect(() => {
    setLoadingState("dashboard-loading", isLoading || authLoading);
  }, [isLoading, authLoading, setLoadingState]);

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
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">{t('dashboard.readyForDownload', 'Ready for download')}</p>
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
            <p className="text-xs text-muted-foreground">{t('dashboard.completed', '0 completed')}</p>
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
                {recentAppointments.map((appointment: Appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {new Date(appointment.date).toLocaleDateString()}
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
            <Link href="/user/qr">{t('nav.qrScanner', 'QR Scanner')}</Link>
          </Button>
        </CardContent>
      </Card>


    </div>
  );
}
