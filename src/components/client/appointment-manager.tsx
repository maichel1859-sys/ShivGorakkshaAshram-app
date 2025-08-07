'use client';

import { useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
import { getAppointments, cancelAppointment } from '@/lib/actions/appointment-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, User, RefreshCw, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { AppointmentStatus } from '@prisma/client';

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  priority: string;
  reason?: string;
  guruji: {
    id: string;
    name: string;
    email: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
  queueEntry?: {
    position: number;
    status: string;
    estimatedWait: number;
  };
}

export function AppointmentManager() {
  const [activeTab, setActiveTab] = useState<AppointmentStatus | 'all'>('all');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsData, setAppointmentsData] = useState<{ appointments: Appointment[]; total: number; hasMore: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getAppointments({
        status: activeTab !== 'all' ? activeTab : undefined,
      });
      
      if (result.success && result.appointments) {
        const data = {
          appointments: result.appointments,
          total: result.total || 0,
          hasMore: result.hasMore || false,
        };
        setAppointmentsData({
          ...data,
          appointments: result.appointments.map(apt => ({
            ...apt,
            date: apt.date.toISOString(),
            startTime: apt.startTime.toISOString(),
            endTime: apt.endTime?.toISOString(),
            reason: apt.reason || undefined,
            checkedInAt: apt.checkedInAt?.toISOString(),
            guruji: apt.guruji ? {
              ...apt.guruji,
              name: apt.guruji.name || '',
              email: apt.guruji.email || '',
            } : { id: '', name: '', email: '' },
            user: {
              ...apt.user,
              name: apt.user.name || '',
              email: apt.user.email || '',
              phone: apt.user.phone || '',
            },
            queueEntry: apt.queueEntry ? {
              position: apt.queueEntry.position,
              status: apt.queueEntry.status,
              estimatedWait: apt.queueEntry.estimatedWait || 0,
            } : undefined,
          })),
        });
        setAppointments(result.appointments.map(apt => ({
          ...apt,
          date: apt.date.toISOString(),
          startTime: apt.startTime.toISOString(),
          endTime: apt.endTime?.toISOString(),
          reason: apt.reason || undefined,
          checkedInAt: apt.checkedInAt?.toISOString(),
          guruji: apt.guruji ? {
            ...apt.guruji,
            name: apt.guruji.name || '',
            email: apt.guruji.email || '',
          } : { id: '', name: '', email: '' },
          user: {
            ...apt.user,
            name: apt.user.name || '',
            email: apt.user.email || '',
            phone: apt.user.phone || '',
          },
          queueEntry: apt.queueEntry ? {
            position: apt.queueEntry.position,
            status: apt.queueEntry.status,
            estimatedWait: apt.queueEntry.estimatedWait || 0,
          } : undefined,
        })));
      } else {
        setError(result.error || 'Failed to load appointments');
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      setError('Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [activeTab]);

  const refetch = fetchAppointments;

  const handleCancel = (appointmentId: string) => {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      setCancellingId(appointmentId);
      startTransition(async () => {
        try {
          await cancelAppointment(appointmentId);
          toast.success('Appointment cancelled successfully');
          await fetchAppointments();
        } catch (error) {
          console.error('Failed to cancel appointment:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to cancel appointment');
        } finally {
          setCancellingId(null);
        }
      });
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Appointments', count: appointmentsData?.total || 0 },
    { value: 'BOOKED', label: 'Booked', count: 0 },
    { value: 'CONFIRMED', label: 'Confirmed', count: 0 },
    { value: 'CHECKED_IN', label: 'Checked In', count: 0 },
    { value: 'COMPLETED', label: 'Completed', count: 0 },
    { value: 'CANCELLED', label: 'Cancelled', count: 0 },
  ];

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-destructive mb-4">Failed to load appointments</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Appointments</h2>
          <p className="text-muted-foreground">
            Manage your spiritual consultation appointments
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Book New Appointment
        </Button>
      </div>

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AppointmentStatus | 'all')}>
        <TabsList className="grid w-full grid-cols-6">
          {statusOptions.map((option) => (
            <TabsTrigger key={option.value} value={option.value} className="text-xs">
              {option.label}
              {option.count > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {option.count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <AppointmentSkeleton />
          ) : appointments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No appointments found</h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab !== 'all' 
                    ? `No ${activeTab.toLowerCase()} appointments.`
                    : "You haven't booked any appointments yet."
                  }
                </p>
                <Button>Book Your First Appointment</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {format(new Date(appointment.date), 'MMM dd, yyyy')}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(new Date(appointment.startTime), 'hh:mm a')} - 
                              {format(new Date(appointment.endTime), 'hh:mm a')}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={
                            appointment.status === 'COMPLETED' ? 'default' :
                            appointment.status === 'CANCELLED' ? 'destructive' :
                            appointment.status === 'BOOKED' ? 'secondary' :
                            appointment.status === 'CONFIRMED' ? 'default' :
                            'outline'
                          }
                        >
                          {appointment.status}
                        </Badge>
                        {appointment.priority !== 'NORMAL' && (
                          <Badge variant="outline" className="text-xs">
                            {appointment.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>With {appointment.guruji.name}</span>
                      </div>
                      {appointment.reason && (
                        <div className="flex items-center space-x-2">
                          <span className="truncate">{appointment.reason}</span>
                        </div>
                      )}
                      {appointment.queueEntry && (
                        <div className="text-xs text-muted-foreground">
                          Queue Position: {appointment.queueEntry.position}
                          {appointment.queueEntry.estimatedWait > 0 && (
                            <span> • Est. wait: {appointment.queueEntry.estimatedWait}min</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {(appointment.status === 'BOOKED' || appointment.status === 'CONFIRMED') && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline">
                          Reschedule
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleCancel(appointment.id)}
                          disabled={cancellingId === appointment.id || isPending}
                        >
                          {cancellingId === appointment.id ? 'Cancelling...' : 'Cancel'}
                        </Button>
                        <Button size="sm" variant="secondary">
                          View Details
                        </Button>
                      </div>
                    )}

                    {appointment.status === 'BOOKED' && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Your appointment is confirmed. Please arrive 10 minutes early.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AppointmentSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}