import { useQuery } from '@tanstack/react-query';
import { getAppointmentAvailability, getCoordinatorAppointments, getAppointment } from '@/lib/actions/appointment-actions';

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
  return useQuery({
    queryKey: [...appointmentKeys.all, 'coordinator'],
    queryFn: async () => {
      const result = await getCoordinatorAppointments();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch coordinator appointments');
      }
      return result.appointments;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
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