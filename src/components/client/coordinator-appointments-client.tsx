'use client';

import { useState, useTransition, useOptimistic, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket, SocketEvents } from '@/lib/socket/socket-client';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Clock,
  User,
  CalendarPlus,
  Loader2,
  UserCheck,
  Users,
  Download,
  Filter,
  CalendarIcon,
} from 'lucide-react';
import { deleteAppointment, updateAppointmentStatus, rescheduleAppointment } from '@/lib/actions/appointment-actions';
import { manualCheckIn } from '@/lib/actions/coordinator-actions';
import { AppointmentStatus } from '@prisma/client';
import { toast } from 'sonner';
import { formatAppointmentDate, formatAppointmentTime } from '@/lib/utils/time-formatting';
import { useLanguage } from '@/contexts/LanguageContext';

interface Appointment {
  id: string;
  date: string;
  status: string;
  priority: string;
  reason?: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
  checkedInAt?: Date | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  guruji?: {
    id: string;
    name: string;
  };
}

interface AppointmentsData {
  appointments: Appointment[];
  total: number;
  hasMore: boolean;
}

interface CoordinatorAppointmentsClientProps {
  initialData: AppointmentsData;
  initialSearchParams: {
    search?: string;
    status?: string;
    date?: string;
    page?: string;
  };
}

export function CoordinatorAppointmentsClient({
  initialData,
  initialSearchParams,
}: CoordinatorAppointmentsClientProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { socket } = useSocket();

  // Local state
  const [searchTerm, setSearchTerm] = useState(initialSearchParams.search || '');
  const [statusFilter, setStatusFilter] = useState(initialSearchParams.status || 'all');
  const [dateFilter, setDateFilter] = useState(initialSearchParams.date || 'all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  // Optimistic updates
  const [optimisticAppointments, setOptimisticAppointments] = useOptimistic(
    initialData.appointments,
    (state, action: { type: string; id: string; status?: string }) => {
      switch (action.type) {
        case 'delete':
          return state.filter(apt => apt.id !== action.id);
        case 'update_status':
          return state.map(apt =>
            apt.id === action.id
              ? { ...apt, status: action.status || apt.status }
              : apt
          );
        case 'check_in':
          return state.map(apt =>
            apt.id === action.id
              ? { ...apt, status: 'CHECKED_IN', checkedInAt: new Date() }
              : apt
          );
        default:
          return state;
      }
    }
  );

  // Socket listener for appointment updates
  useEffect(() => {
    const handleAppointmentUpdate = (...args: unknown[]) => {
      const data = args[0] as {
        appointmentId: string;
        status: string;
        action: string;
        appointment?: {
          id: string;
          devoteeName?: string;
          gurujiName?: string;
          [key: string]: unknown;
        };
        timestamp: string;
      };

      console.log('🔌 [Coordinator] Received appointment update:', data);

      // Update the appointments list in real-time
      setOptimisticAppointments({
        type: 'update_status',
        id: data.appointmentId,
        status: data.status,
      });

      // Refresh the page data to get latest information
      router.refresh();

      // Show notification for new bookings
      if (data.action === 'booked') {
        const devoteeName = (data as { devoteeName?: string }).devoteeName || 'A devotee';
        const gurujiName = (data as { gurujiName?: string }).gurujiName || 'Guruji';
        console.log(`📅 New appointment: ${devoteeName} booked with ${gurujiName}`);
      }
    };

    socket.on(SocketEvents.APPOINTMENT_UPDATE, handleAppointmentUpdate);

    return () => {
      socket.off(SocketEvents.APPOINTMENT_UPDATE, handleAppointmentUpdate);
    };
  }, [socket, setOptimisticAppointments, router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return 'bg-blue-100 text-blue-800';
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'CHECKED_IN':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-orange-100 text-orange-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'NORMAL':
        return 'bg-blue-100 text-blue-800';
      case 'LOW':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (dateFilter !== 'all') params.set('date', dateFilter);

    startTransition(() => {
      router.push(`/coordinator/appointments?${params.toString()}`);
    });
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: AppointmentStatus) => {
    setOptimisticAppointments({ type: 'update_status', id: appointmentId, status: newStatus });

    startTransition(async () => {
      const formData = new FormData();
      formData.append('appointmentId', appointmentId);
      formData.append('status', newStatus);

      const result = await updateAppointmentStatus(formData);
      if (!result.success) {
        toast.error(result.error || 'Failed to update appointment status');
      } else {
        toast.success('Appointment status updated successfully');
        router.refresh();
      }
    });
  };

  const handleDelete = async () => {
    if (!selectedAppointment) return;

    setIsDeleting(true);
    setOptimisticAppointments({ type: 'delete', id: selectedAppointment.id });

    try {
      const result = await deleteAppointment(selectedAppointment.id);
      if (result.success) {
        toast.success('Appointment deleted successfully');
        setShowDeleteDialog(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete appointment');
      }
    } catch {
      toast.error('An error occurred while deleting the appointment');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleManualCheckIn = async () => {
    if (!selectedAppointment) return;

    setIsCheckingIn(true);
    setOptimisticAppointments({ type: 'check_in', id: selectedAppointment.id });

    try {
      const result = await manualCheckIn(selectedAppointment.id, 'RECEPTION_001');
      if (result.success) {
        toast.success(`${selectedAppointment.user.name} checked in successfully`);
        setShowCheckInDialog(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to check in devotee');
      }
    } catch {
      toast.error('An error occurred during check-in');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setRescheduleDate(tomorrow.toISOString().split('T')[0]);
    setRescheduleTime('09:00');
    setShowRescheduleDialog(true);
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return;

    setIsRescheduling(true);
    setOptimisticAppointments({ type: 'reschedule', id: selectedAppointment.id });

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('date', rescheduleDate);
        formData.append('time', rescheduleTime);

        await rescheduleAppointment(selectedAppointment.id, formData);
        toast.success('Appointment rescheduled successfully');
        setShowRescheduleDialog(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to reschedule appointment');
        router.refresh(); // Revert optimistic update
      } finally {
        setIsRescheduling(false);
      }
    });
  };

  const handleRescheduleCancel = () => {
    setShowRescheduleDialog(false);
    setSelectedAppointment(null);
    setRescheduleDate('');
    setRescheduleTime('');
  };

  const canCheckIn = (appointment: Appointment) => {
    return ['BOOKED', 'CONFIRMED'].includes(appointment.status);
  };

  // Apply client-side filtering for immediate feedback
  const filteredAppointments = optimisticAppointments.filter(appointment => {
    const matchesSearch = !searchTerm ||
      appointment.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (appointment.user.phone && appointment.user.phone.includes(searchTerm));

    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;

    const matchesDate = dateFilter === 'all' ||
      (dateFilter === 'today' && appointment.date === new Date().toISOString().split('T')[0]);

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('appointments.title', 'Appointments Management')}
          </h1>
          <p className="text-muted-foreground">
            {t('appointments.coordinatorDescription', 'Manage all appointments and devotee check-ins')}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            {t('common.export', 'Export')}
          </Button>
          <Button asChild>
            <Link href="/coordinator/reception?action=booking">
              <CalendarPlus className="mr-2 h-4 w-4" />
              {t('appointments.schedule', 'Schedule Appointment')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('common.filters', 'Filters')}
          </CardTitle>
          <CardDescription>
            {t('appointments.filtersDescription', 'Search and filter appointments')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('appointments.searchPlaceholder', 'Search by name, email, or phone...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('appointments.filterByStatus', 'Filter by status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allStatus', 'All Status')}</SelectItem>
                <SelectItem value="BOOKED">{t('appointments.status.booked', 'Booked')}</SelectItem>
                <SelectItem value="CONFIRMED">{t('appointments.status.confirmed', 'Confirmed')}</SelectItem>
                <SelectItem value="CHECKED_IN">{t('appointments.status.checkedIn', 'Checked In')}</SelectItem>
                <SelectItem value="IN_PROGRESS">{t('appointments.status.inProgress', 'In Progress')}</SelectItem>
                <SelectItem value="COMPLETED">{t('appointments.status.completed', 'Completed')}</SelectItem>
                <SelectItem value="CANCELLED">{t('appointments.status.cancelled', 'Cancelled')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('appointments.filterByDate', 'Filter by date')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allDates', 'All Dates')}</SelectItem>
                <SelectItem value="today">{t('common.today', 'Today')}</SelectItem>
                <SelectItem value="week">{t('common.thisWeek', 'This Week')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {t('common.search', 'Search')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('appointments.allAppointments', 'All Appointments')}
          </CardTitle>
          <CardDescription>
            {filteredAppointments.length} {t('appointments.appointmentsFound', 'appointments found')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">
                {t('appointments.noAppointments', 'No appointments')}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('appointments.noAppointmentsDescription', 'No appointments found matching your criteria.')}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('appointments.table.devotee', 'Devotee')}</TableHead>
                  <TableHead>{t('appointments.table.appointment', 'Appointment')}</TableHead>
                  <TableHead>{t('appointments.table.guruji', 'Guruji')}</TableHead>
                  <TableHead>{t('appointments.table.status', 'Status')}</TableHead>
                  <TableHead>{t('appointments.table.priority', 'Priority')}</TableHead>
                  <TableHead>{t('appointments.table.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{appointment.user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.user.email}
                        </div>
                        {appointment.user.phone && (
                          <div className="text-sm text-muted-foreground">
                            {appointment.user.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>{formatAppointmentDate(appointment.date)}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatAppointmentTime(appointment.startTime)} - {formatAppointmentTime(appointment.endTime)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {appointment.guruji ? (
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{appointment.guruji.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{t('common.unassigned', 'Unassigned')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(appointment.priority)}>
                        {appointment.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('common.actions', 'Actions')}</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/coordinator/appointments/${appointment.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t('common.view', 'View')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/coordinator/appointments/${appointment.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t('common.edit', 'Edit')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {canCheckIn(appointment) && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setShowCheckInDialog(true);
                              }}
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              {t('appointments.checkIn', 'Check In')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(appointment.id, 'CONFIRMED' as AppointmentStatus)}
                            disabled={appointment.status === 'CONFIRMED'}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            {t('appointments.markConfirmed', 'Mark Confirmed')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleReschedule(appointment)}
                            disabled={appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED'}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {t('appointments.reschedule', 'Reschedule')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(appointment.id, 'CANCELLED' as AppointmentStatus)}
                            disabled={appointment.status === 'CANCELLED'}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('appointments.cancel', 'Cancel')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('common.delete', 'Delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('appointments.deleteTitle', 'Delete Appointment')}</DialogTitle>
            <DialogDescription>
              {t('appointments.deleteDescription', 'Are you sure you want to delete this appointment? This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {t('common.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-in Confirmation Dialog */}
      <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('appointments.checkInTitle', 'Manual Check-in')}</DialogTitle>
            <DialogDescription>
              {selectedAppointment && (
                <>
                  {t('appointments.checkInDescription', 'Check in')} {selectedAppointment.user.name} {t('appointments.forAppointment', 'for their appointment')}?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckInDialog(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleManualCheckIn}
              disabled={isCheckingIn}
            >
              {isCheckingIn ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4" />
              )}
              {t('appointments.checkIn', 'Check In')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('appointments.rescheduleTitle', 'Reschedule Appointment')}</DialogTitle>
            <DialogDescription>
              {selectedAppointment && (
                <>
                  {t('appointments.rescheduleDescription', 'Reschedule appointment for')} {selectedAppointment.user.name}?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('appointments.newDate', 'New Date')}</label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('appointments.newTime', 'New Time')}</label>
              <Input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="mt-1"
              />
            </div>
            {rescheduleDate && rescheduleTime && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>{t('appointments.newAppointment', 'New appointment')}:</strong><br />
                  {new Date(rescheduleDate).toLocaleDateString()} at {rescheduleTime}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleRescheduleCancel} disabled={isRescheduling}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleRescheduleSubmit}
              disabled={!rescheduleDate || !rescheduleTime || isRescheduling}
            >
              {isRescheduling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CalendarIcon className="mr-2 h-4 w-4" />
              )}
              {t('appointments.reschedule', 'Reschedule')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}