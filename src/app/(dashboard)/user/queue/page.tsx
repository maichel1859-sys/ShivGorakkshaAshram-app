import { Metadata } from 'next';
import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Users, CheckCircle, AlertCircle, QrCode } from 'lucide-react';
import Link from 'next/link';
import { getUserQueueStatusSimple } from '@/lib/actions/qr-scan-actions-simple';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'My Queue Status',
  description: 'Check your current position in the queue',
  keywords: ['queue', 'wait time', 'appointment', 'shivgoraksha ashram'],
  openGraph: {
    title: 'My Queue Status',
    description: 'Check your current position in the queue',
    type: 'website',
  },
};

async function QueueStatusContent() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const queueResult = await getUserQueueStatusSimple();
  const queueEntry = queueResult.success ? queueResult.data : null;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Queue Status</h1>
          <p className="text-muted-foreground mt-2">
            Check your current position and estimated wait time
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/user/qr-scanner">
              <QrCode className="h-4 w-4 mr-2" />
              QR Scanner
            </Link>
          </Button>
          <Button asChild>
            <Link href="/user/appointments">
              <Clock className="h-4 w-4 mr-2" />
              My Appointments
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
                You&apos;re in the Queue!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    #{queueEntry.position}
                  </div>
                  <div className="text-sm text-green-700">Current Position</div>
                </div>
                
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {queueEntry.estimatedWait || 0}
                  </div>
                  <div className="text-sm text-blue-700">Minutes Wait</div>
                </div>
                
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {queueEntry.guruji?.name || 'Guruji'}
                  </div>
                  <div className="text-sm text-purple-700">Your Guruji</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Checked in at:</span>
                  <span className="font-medium">
                    {new Date(queueEntry.checkedInAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Status:</span>
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
                Wait Time Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Estimated wait time: <strong>{queueEntry.estimatedWait || 0} minutes</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Queue position: <strong>#{queueEntry.position}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Average consultation time: <strong>30 minutes</strong></span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What to Expect */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What to Expect</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Wait for your turn</p>
                    <p className="text-muted-foreground">Please remain in the waiting area until called</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium">You&apos;ll be called by name</p>
                    <p className="text-muted-foreground">The receptionist will announce when it&apos;s your turn</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Consultation begins</p>
                    <p className="text-muted-foreground">Your appointment will start when called</p>
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
              You are not currently in the queue. To join the queue, you need to:
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Join the Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">Requirements to join queue:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>You must have an appointment for today</li>
                        <li>You must be physically present at the location</li>
                        <li>You must scan the QR code within the time window</li>
                        <li>Time window: 20 minutes before to 15 minutes after appointment</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <Button asChild className="w-full">
                    <Link href="/user/qr-scanner">
                      <QrCode className="h-4 w-4 mr-2" />
                      Scan QR Code to Join Queue
                    </Link>
                  </Button>
                  
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/user/appointments">
                      <Clock className="h-4 w-4 mr-2" />
                      Check My Appointments
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
              <span>This page will automatically refresh to show updated queue status</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense fallback={
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Queue Status</h1>
            <p className="text-muted-foreground mt-2">Loading...</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading queue status...</p>
          </div>
        </div>
      </div>
    }>
      <QueueStatusContent />
    </Suspense>
  );
}
