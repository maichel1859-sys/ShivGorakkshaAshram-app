'use client';

import { useState, useTransition, useOptimistic } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { deleteAppointment, updateAppointmentStatus } from '@/lib/actions/appointment-actions';
import { AppointmentStatus } from '@prisma/client';
import { formatAppointmentDate, formatAppointmentTime } from '@/lib/utils/time-formatting';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface AppointmentsData {
  appointments: Appointment[];
  total: number;
  hasMore: boolean;
}

interface SearchParams {
  search?: string;
  status?: string;
  date?: string;
  page?: string;
}

interface AppointmentsClientProps {
  initialData: AppointmentsData;
  initialSearchParams: SearchParams;
}

export function AppointmentsClient({ initialData, initialSearchParams }: AppointmentsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(initialSearchParams.search || '');
  const [statusFilter, setStatusFilter] = useState(initialSearchParams.status || 'all');
  const [dateFilter, setDateFilter] = useState(initialSearchParams.date || 'all');

  // Optimistic updates for appointments
  const [optimisticAppointments, setOptimisticAppointments] = useOptimistic(
    initialData.appointments,
    (state, action: { type: 'delete' | 'update'; id: string; status?: AppointmentStatus }) => {
      switch (action.type) {
        case 'delete':
          return state.filter(apt => apt.id !== action.id);
        case 'update':
          return state.map(apt => 
            apt.id === action.id && action.status 
              ? { ...apt, status: action.status } 
              : apt
          );
        default:
          return state;
      }
    }
  );

  const updateFilters = () => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (dateFilter !== 'all') params.set('date', dateFilter);
      
      const queryString = params.toString();
      router.push(queryString ? `?${queryString}` : '');
    });
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
      return;
    }

    setOptimisticAppointments({ type: 'delete', id: appointmentId });

    startTransition(async () => {
      try {
        const result = await deleteAppointment(appointmentId);
        if (result.success) {
          toast.success('Appointment deleted successfully');
          router.refresh(); // Refresh server data
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete appointment');
        router.refresh(); // Revert optimistic update
      }
    });
  };

  const handleUpdateStatus = async (appointmentId: string, status: AppointmentStatus) => {
    setOptimisticAppointments({ type: 'update', id: appointmentId, status });

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('id', appointmentId);
        formData.append('status', status);
        
        const result = await updateAppointmentStatus(formData);
        if (result.success) {
          toast.success(`Appointment ${status.toLowerCase()} successfully`);
          router.refresh(); // Refresh server data
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update appointment status');
        router.refresh(); // Revert optimistic update
      }
    });
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.BOOKED:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case AppointmentStatus.CONFIRMED:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case AppointmentStatus.COMPLETED:
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case AppointmentStatus.CANCELLED:
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const appointmentsByStatus = {
    BOOKED: optimisticAppointments.filter((a) => a.status === AppointmentStatus.BOOKED).length,
    CONFIRMED: optimisticAppointments.filter((a) => a.status === AppointmentStatus.CONFIRMED).length,
    COMPLETED: optimisticAppointments.filter((a) => a.status === AppointmentStatus.COMPLETED).length,
    CANCELLED: optimisticAppointments.filter((a) => a.status === AppointmentStatus.CANCELLED).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Appointments</h2>
          <p className="text-muted-foreground">
            Manage all system appointments and their statuses
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/create">
            <CalendarPlus className="mr-2 h-4 w-4" />
            Schedule Appointment
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(appointmentsByStatus).map(([status, count]) => (
          <Card key={status}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{status}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count}</div>
              <p className="text-xs text-muted-foreground">
                {status.toLowerCase()} appointments
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && updateFilters()}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setTimeout(updateFilters, 0);
            }}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={(value) => {
              setDateFilter(value);
              setTimeout(updateFilters, 0);
            }}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={updateFilters} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Appointments ({initialData.total})</CardTitle>
          <CardDescription>
            Complete list of appointments with their details and actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {optimisticAppointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{appointment.user.name}</div>
                          <div className="text-xs text-muted-foreground">{appointment.user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {formatAppointmentDate(appointment.date)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatAppointmentTime(appointment.startTime)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate text-sm">
                        {appointment.notes || 'No notes'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatAppointmentDate(appointment.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            disabled={isPending}
                          >
                            {isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/appointments/${appointment.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Appointment
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleUpdateStatus(appointment.id, 'CONFIRMED')}
                            disabled={appointment.status === 'CONFIRMED'}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Mark Confirmed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleUpdateStatus(appointment.id, 'COMPLETED')}
                            disabled={appointment.status === 'COMPLETED'}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Mark Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleUpdateStatus(appointment.id, 'CANCELLED')}
                            disabled={appointment.status === 'CANCELLED'}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Mark Cancelled
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteAppointment(appointment.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Appointment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {optimisticAppointments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No appointments found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}