import { Metadata } from 'next';
import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { getAppointments } from '@/lib/actions/appointment-actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Manual Check-in',
  description: 'Check in for your appointment manually',
  keywords: ['check in', 'appointment', 'manual', 'shivgoraksha ashram'],
  openGraph: {
    title: 'Manual Check-in',
    description: 'Check in for your appointment manually',
    type: 'website',
  },
};

async function CheckInContent() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Get user's upcoming appointments that can be checked in
  const result = await getAppointments({
    status: 'BOOKED',
    limit: 10,
  });

  const appointments = result.success ? result.appointments : [];

  const checkInAppointments = (appointments || []).filter(apt => {
    const aptDate = new Date(apt.date);
    const now = new Date();
    // Allow check-in for appointments today or in the future
    return aptDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manual Check-in</h1>
          <p className="text-muted-foreground mt-2">
            Check in for your upcoming appointments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/user/qr-scanner">
              <CheckCircle className="h-4 w-4 mr-2" />
              QR Scanner
            </Link>
          </Button>
          <Button asChild>
            <Link href="/user/appointments">
              <Calendar className="h-4 w-4 mr-2" />
              My Appointments
            </Link>
          </Button>
        </div>
      </div>

      {/* Check-in Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Check-in Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800 space-y-2">
              <p><strong>How to check in:</strong></p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Find your appointment in the list below</li>
                <li>Click the &quot;Check In&quot; button next to your appointment</li>
                <li>Your appointment status will be updated to &quot;CHECKED_IN&quot;</li>
                <li>Wait for your turn in the queue</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Appointments for Check-in */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Available for Check-in</h2>
        </div>
        
        {checkInAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Appointments Available for Check-in</h3>
              <p className="text-muted-foreground mb-4">
                You don&apos;t have any upcoming appointments that can be checked in at this time.
              </p>
              <Button asChild>
                <Link href="/user/appointments">
                  View All Appointments
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {checkInAppointments.map((appointment) => (
              <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">Appointment with {appointment.guruji?.name || 'Guruji'}</h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(appointment.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {new Date(appointment.startTime).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })} - {new Date(appointment.endTime).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-13">
                        {appointment.reason && (
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Reason:</strong> {appointment.reason}
                          </p>
                        )}
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">
                            {appointment.status}
                          </Badge>
                          {appointment.priority !== 'NORMAL' && (
                            <Badge variant="outline">
                              {appointment.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <form
                        action={async (formData: FormData) => {
                          'use server';
                          const { checkInAppointment } = await import('@/lib/actions/appointment-actions');
                          const appointmentId = formData.get('appointmentId') as string;
                          if (appointmentId) {
                            await checkInAppointment(appointmentId);
                          }
                        }}
                      >
                        <input
                          type="hidden"
                          name="appointmentId"
                          value={appointment.id}
                        />
                        <Button size="sm" type="submit">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Check In
                        </Button>
                      </form>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Alternative Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Other Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">QR Scanner Check-in</h3>
                <p className="text-sm text-muted-foreground">
                  Use the QR scanner for a faster check-in experience
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/user/qr-scanner">
                  Use QR Scanner
                </Link>
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">View All Appointments</h3>
                <p className="text-sm text-muted-foreground">
                  See all your appointments and their current status
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/user/appointments">
                  View Appointments
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense fallback={
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manual Check-in</h1>
            <p className="text-muted-foreground mt-2">Loading...</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading check-in options...</p>
          </div>
        </div>
      </div>
    }>
      <CheckInContent />
    </Suspense>
  );
}
