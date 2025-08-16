import { Metadata } from 'next';
// import { Suspense } from 'react'; // Temporarily unused
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { getAppointments } from '@/lib/actions/appointment-actions';
import { getGurujiDashboard } from '@/lib/actions/dashboard-actions';

export const metadata: Metadata = {
  title: 'My Appointments - Guruji Dashboard',
  description: 'View and manage your scheduled spiritual consultation appointments',
  keywords: ['guruji appointments', 'consultations', 'spiritual guidance', 'shivgoraksha ashram'],
  openGraph: {
    title: 'My Appointments - Guruji Dashboard',
    description: 'View and manage your scheduled spiritual consultation appointments',
    type: 'website',
  },
};

async function GurujiAppointmentsData() {
  const [appointmentsResult, dashboardResult] = await Promise.all([
    getAppointments({ limit: 50 }),
    getGurujiDashboard()
  ]);

  const appointments = appointmentsResult.success ? appointmentsResult.appointments : [];
  const dashboardData = dashboardResult.success ? dashboardResult : null;

  return { appointments, dashboardData };
}

export default async function GurujiAppointmentsPage() {
  const { appointments } = await GurujiAppointmentsData();
  // const { dashboardData } = await GurujiAppointmentsData(); // Temporarily unused

  const appointmentsList = appointments || [];

  const todayAppointments = appointmentsList.filter(apt => {
    const aptDate = new Date(apt.date);
    const today = new Date();
    return aptDate.toDateString() === today.toDateString();
  });

  const confirmedAppointments = appointmentsList.filter(apt => 
    apt.status === 'CONFIRMED' || apt.status === 'BOOKED'
  );

  const pendingAppointments = appointmentsList.filter(apt => 
    apt.status === 'BOOKED'
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Appointments</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your scheduled spiritual consultation appointments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/guruji/queue">
              <Clock className="h-4 w-4 mr-2" />
              View Queue
            </Link>
          </Button>
          <Button asChild>
            <Link href="/guruji/consultations">
              <Calendar className="h-4 w-4 mr-2" />
              Active Consultations
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointmentsList.length}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <Badge variant="default" className="h-4 w-4">✓</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confirmedAppointments.length}</div>
            <p className="text-xs text-muted-foreground">
              Ready for consultation
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Badge variant="secondary" className="h-4 w-4">⏳</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingAppointments.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Schedule</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments.length}</div>
            <p className="text-xs text-muted-foreground">
              Appointments today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Upcoming Appointments</h2>
        </div>
        
        <div className="grid gap-4">
          {appointmentsList.slice(0, 10).map((appointment) => (
            <Card key={appointment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{appointment.user?.name || 'Unknown User'}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{appointment.user?.phone || 'No phone'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>Main Consultation Hall</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-13">
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Reason:</strong> {appointment.reason || 'General consultation'}
                      </p>
                      <div className="flex items-center space-x-4 text-sm">
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
                  
                  <div className="flex flex-col items-end space-y-2">
                    <Badge 
                      variant={appointment.status === 'CONFIRMED' || appointment.status === 'BOOKED' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {appointment.status.toLowerCase().replace('_', ' ')}
                    </Badge>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                      {(appointment.status === 'CONFIRMED' || appointment.status === 'BOOKED') && (
                        <Button size="sm">
                          Start Consultation
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {appointmentsList.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Appointments Scheduled</h3>
            <p className="text-muted-foreground mb-4">
              You don&apos;t have any upcoming appointments at the moment.
            </p>
            <Button asChild>
              <Link href="/guruji/queue">
                <Clock className="h-4 w-4 mr-2" />
                Check Queue
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
