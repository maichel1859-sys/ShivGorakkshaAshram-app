'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Users, CheckCircle, AlertCircle, QrCode, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { getUserQueueStatusSimple } from '@/lib/actions/qr-scan-actions-simple';
import { useSession } from 'next-auth/react';
import { PageSpinner } from '@/components/loading';
import { showToast } from '@/lib/toast';
import { useQueueUnified } from '@/hooks/use-queue-unified';
import { useLanguage } from '@/contexts/LanguageContext';
// Simple queue entry type for the simplified queue status function
type SimpleQueueEntry = {
  id: string;
  status: string;
  priority: string;
  position: number;
  estimatedWait?: number | null;
  checkedInAt: Date;
  notes?: string | null;
  guruji: {
    name: string | null;
  } | null;
};


function QueueStatusContent() {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const [queueEntry, setQueueEntry] = useState<SimpleQueueEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Use unified queue hook for general queue data (even though user sees limited data)
  const {
    loading: queueLoading,
    refetch: refetchQueue
  } = useQueueUnified({
    role: 'user',
    autoRefresh: false, // We'll handle auto-refresh manually
    enableRealtime: false, // Users don't need real-time updates
  });

  const loadQueueStatus = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      setRefreshing(true);
      const queueResult = await getUserQueueStatusSimple();
      
      if (queueResult.success) {
        setQueueEntry(queueResult.data || null);
      } else {
        setQueueEntry(null);
        if (queueResult.error) {
          console.error('Queue status error:', queueResult.error);
        }
      }
    } catch (error) {
      console.error('Error loading queue status:', error);
      showToast.error(t('queue.failedToLoad', 'Failed to load queue status'));
    } finally {
      setRefreshing(false);
    }
  }, [session?.user?.id, t]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadQueueStatus();
    }
  }, [status, loadQueueStatus]);

  // Auto-refresh every 30 seconds when user is in queue
  useEffect(() => {
    if (!queueEntry || status !== 'authenticated') return;
    
    const interval = setInterval(() => {
      loadQueueStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [queueEntry, status, loadQueueStatus]);

  if (status === 'loading' || (queueLoading && !queueEntry && status === 'authenticated')) {
    return <PageSpinner message={t('queue.loadingStatus', 'Loading queue status...')} />;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t('auth.authRequired', 'Authentication Required')}</h3>
        <p className="text-muted-foreground mb-4">
          {t('queue.signInToCheck', 'Please sign in to check your queue status.')}
        </p>
        <Button asChild>
          <Link href="/auth/signin">{t('auth.signIn', 'Sign In')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('nav.myQueue', 'My Queue Status')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('queue.checkPosition', 'Check your current position and estimated wait time')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { loadQueueStatus(); refetchQueue(); }} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? t('common.refreshing', 'Refreshing...') : t('common.refresh', 'Refresh')}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/user/qr-scanner">
              <QrCode className="h-4 w-4 mr-2" />
              {t('nav.qrScanner', 'QR Scanner')}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/user/appointments">
              <Clock className="h-4 w-4 mr-2" />
              {t('nav.myAppointments', 'My Appointments')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Queue Status */}
      {queueEntry ? (
        <div className="space-y-6">
          {/* Current Position */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                {t('queue.inQueue', "You're in the Queue!")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    #{queueEntry.position}
                  </div>
                  <div className="text-sm text-green-700">{t('queue.currentPosition', 'Current Position')}</div>
                </div>
                
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {queueEntry.estimatedWait || 0}
                  </div>
                  <div className="text-sm text-blue-700">{t('queue.minutesWait', 'Minutes Wait')}</div>
                </div>
                
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {queueEntry.guruji?.name || 'Guruji'}
                  </div>
                  <div className="text-sm text-purple-700">{t('queue.yourGuruji', 'Your Guruji')}</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('queue.checkedInAt', 'Checked in at')}:</span>
                  <span className="font-medium">
                    {new Date(queueEntry.checkedInAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">{t('appointments.status', 'Status')}:</span>
                  <Badge variant={queueEntry.status === 'WAITING' ? 'secondary' : 'default'}>
                    {queueEntry.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wait Time Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('queue.waitTimeInfo', 'Wait Time Information')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">{t('queue.estimatedWaitTime', 'Estimated wait time')}: <strong>{queueEntry.estimatedWait || 0} {t('queue.minutes', 'minutes')}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">{t('queue.queuePosition', 'Queue position')}: <strong>#{queueEntry.position}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">{t('queue.avgConsultationTime', 'Average consultation time')}: <strong>5 {t('queue.minutes', 'minutes')}</strong></span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What to Expect */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('appointments.whatToExpected', 'What to Expect')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium">{t('queue.waitForTurn', 'Wait for your turn')}</p>
                    <p className="text-muted-foreground">{t('queue.remainInWaitingArea', 'Please remain in the waiting area until called')}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium">{t('queue.calledByName', "You'll be called by name")}</p>
                    <p className="text-muted-foreground">{t('queue.receptionistAnnounce', "The receptionist will announce when it's your turn")}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium">{t('consultation.starts', 'Consultation begins')}</p>
                    <p className="text-muted-foreground">{t('queue.appointmentStarts', 'Your appointment will start when called')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Not in Queue */}
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              {t('queue.notInQueue', 'You are not currently in the queue. To join the queue, you need to:')}
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('queue.joinQueue', 'Join the Queue')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">{t('queue.requirementsToJoin', 'Requirements to join queue')}:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>{t('queue.mustHaveAppointment', 'You must have an appointment for today')}</li>
                        <li>{t('queue.mustBePresent', 'You must be physically present at the location')}</li>
                        <li>{t('queue.mustScanQR', 'You must scan the QR code within the time window')}</li>
                        <li>{t('queue.timeWindow', 'Time window: 20 minutes before to 15 minutes after appointment')}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <Button asChild className="w-full">
                    <Link href="/user/qr-scanner">
                      <QrCode className="h-4 w-4 mr-2" />
                      {t('queue.scanToJoin', 'Scan QR Code to Join Queue')}
                    </Link>
                  </Button>
                  
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/user/appointments">
                      <Clock className="h-4 w-4 mr-2" />
                      {t('queue.checkAppointments', 'Check My Appointments')}
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Auto-refresh notice */}
      {queueEntry && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <Clock className="h-4 w-4" />
              <span>{t('queue.autoRefresh', 'This page will automatically refresh to show updated queue status')}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function QueuePage() {
  return <QueueStatusContent />;
}
