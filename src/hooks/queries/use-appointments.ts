import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/lib/socket/socket-client';
import { 
  getAppointmentAvailability, 
  getCoordinatorAppointments, 
  getAppointment,
  getAppointments,
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  updateAppointment,
  deleteAppointment
} from '@/lib/actions/appointment-actions';
import { AppointmentStatus } from '@prisma/client';
import { toast } from 'sonner';

// Query keys
export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...appointmentKeys.lists(), filters] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
  availability: (date: string) => [...appointmentKeys.all, 'availability', date] as const,
};

// Hook for fetching appointment availability
export function useAppointmentAvailability(date: string) {
  return useQuery({
    queryKey: appointmentKeys.availability(date),
    queryFn: async () => {
      console.log('useAppointmentAvailability called with date:', date);
      const result = await getAppointmentAvailability({ date });
      console.log('useAppointmentAvailability result:', result);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch availability');
      }
      return result.availability;
    },
    enabled: !!date,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Note: For mutations (create, update, delete), use Server Actions directly in forms
// React Query should only be used for queries/reads, not mutations
// This maintains proper RSC architecture where mutations happen via form actions

// Hook for fetching coordinator appointments
export function useCoordinatorAppointments() {
  const { connectionStatus } = useSocket();
  return useQuery({
    queryKey: [...appointmentKeys.all, 'coordinator'],
    queryFn: async () => {
      const result = await getCoordinatorAppointments();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch coordinator appointments');
      }
      return result.appointments;
    },
    staleTime: 30 * 1000,
    // Do not poll when socket is connected (socket-first); fallback when disconnected
    refetchInterval: connectionStatus.connected ? false : 30 * 1000,
  });
} 

export const useAppointment = (id: string) => {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: async () => {
      const result = await getAppointment(id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch appointment');
      }
      return result.appointment;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for fetching user appointments
export function useUserAppointments(options?: {
  status?: AppointmentStatus;
  limit?: number;
  offset?: number;
  search?: string;
  date?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const { connectionStatus } = useSocket();
  return useQuery({
    queryKey: appointmentKeys.list(options || {}),
    queryFn: async () => {
      const result = await getAppointments(options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch appointments');
      }
      return {
        appointments: result.appointments?.map(appointment => ({
          ...appointment,
          date: appointment.date.toISOString(),
          startTime: appointment.startTime.toISOString(),
          endTime: appointment.endTime.toISOString(),
        })) || [],
        total: result.total || 0,
        hasMore: result.hasMore || false,
      };
    },
    staleTime: 30 * 1000,
    // Do not poll when socket is connected (socket-first); fallback when disconnected
    refetchInterval: connectionStatus.connected ? false : 60 * 1000,
  });
}

// Hook for booking appointments
export function useBookAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await bookAppointment(formData);
      if (!result.success) {
        throw new Error('Failed to book appointment');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Appointment booked successfully');
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to book appointment');
    },
  });
}

// Hook for cancelling appointments
export function useCancelAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ appointmentId, reason }: { appointmentId: string; reason?: string }) => {
      const result = await cancelAppointment(appointmentId, reason);
      if (!result.success) {
        throw new Error('Failed to cancel appointment');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Appointment cancelled successfully');
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel appointment');
    },
  });
}

// Hook for rescheduling appointments
export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ appointmentId, formData }: { appointmentId: string; formData: FormData }) => {
      const result = await rescheduleAppointment(appointmentId, formData);
      if (!result.success) {
        throw new Error('Failed to reschedule appointment');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Appointment rescheduled successfully');
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to reschedule appointment');
    },
  });
}

// Hook for updating appointments
export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ appointmentId, formData }: { appointmentId: string; formData: FormData }) => {
      const result = await updateAppointment(appointmentId, formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update appointment');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Appointment updated successfully');
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update appointment');
    },
  });
}

// Hook for deleting appointments
export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const result = await deleteAppointment(appointmentId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete appointment');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Appointment deleted successfully');
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete appointment');
    },
  });
} 
