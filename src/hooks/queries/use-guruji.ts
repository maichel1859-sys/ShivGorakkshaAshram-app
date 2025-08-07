import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGurujiQueueEntries, startConsultation, completeConsultation } from '@/lib/actions/queue-actions';
import { getGurujiConsultations } from '@/lib/actions/consultation-actions';
import { toast } from 'sonner';

// Query keys
export const gurujiKeys = {
  all: ['guruji'] as const,
  queue: () => [...gurujiKeys.all, 'queue'] as const,
  consultations: () => [...gurujiKeys.all, 'consultations'] as const,
  remedies: () => [...gurujiKeys.all, 'remedies'] as const,
  patients: () => [...gurujiKeys.all, 'patients'] as const,
};

// Hook for fetching guruji queue data
export function useGurujiQueue() {
  return useQuery({
    queryKey: gurujiKeys.queue(),
    queryFn: async () => {
      const result = await getGurujiQueueEntries();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch queue data');
      }
      
      // Transform the data to match the expected format
      const queuePatients = result.queueEntries
        .filter(entry => entry.status === 'WAITING')
        .map(entry => ({
          id: entry.id,
          position: entry.position,
          estimatedWait: entry.estimatedWait || 15,
          status: entry.status,
          appointment: {
            id: entry.appointmentId,
            reason: entry.notes || '',
            priority: entry.priority,
            startTime: entry.checkedInAt,
            user: {
              id: entry.user.id,
              name: entry.user.name || 'Unknown',
              age: null, // Would need to calculate from dateOfBirth if available
            },
          },
          checkedInAt: entry.checkedInAt,
        }));

      const currentPatient = result.queueEntries
        .find(entry => entry.status === 'IN_PROGRESS')
        ? {
            id: result.queueEntries.find(entry => entry.status === 'IN_PROGRESS')!.id,
            position: result.queueEntries.find(entry => entry.status === 'IN_PROGRESS')!.position,
            estimatedWait: result.queueEntries.find(entry => entry.status === 'IN_PROGRESS')!.estimatedWait || 15,
            status: 'IN_PROGRESS' as const,
            appointment: {
              id: result.queueEntries.find(entry => entry.status === 'IN_PROGRESS')!.appointmentId,
              reason: result.queueEntries.find(entry => entry.status === 'IN_PROGRESS')!.notes || '',
              priority: result.queueEntries.find(entry => entry.status === 'IN_PROGRESS')!.priority,
              startTime: result.queueEntries.find(entry => entry.status === 'IN_PROGRESS')!.checkedInAt,
              user: {
                id: result.queueEntries.find(entry => entry.status === 'IN_PROGRESS')!.user.id,
                name: result.queueEntries.find(entry => entry.status === 'IN_PROGRESS')!.user.name || 'Unknown',
                age: null,
              },
            },
            checkedInAt: result.queueEntries.find(entry => entry.status === 'IN_PROGRESS')!.checkedInAt,
          }
        : null;

      // Calculate stats
      const todayTotal = result.queueEntries.length;
      const todayCompleted = result.queueEntries.filter(entry => entry.status === 'COMPLETED').length;
      const currentWaiting = result.queueEntries.filter(entry => entry.status === 'WAITING').length;
      const averageConsultationTime = 15; // Default 15 minutes

      const stats = {
        todayTotal,
        todayCompleted,
        currentWaiting,
        averageConsultationTime,
      };

      return {
        queuePatients,
        currentPatient,
        stats,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

// Hook for starting consultation
export function useStartConsultation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (queueEntryId: string) => {
      const formData = new FormData();
      formData.append('queueEntryId', queueEntryId);
      
      const result = await startConsultation(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to start consultation');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Consultation started successfully');
      // Invalidate and refetch queue data
      queryClient.invalidateQueries({ queryKey: gurujiKeys.queue() });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to start consultation');
    },
  });
}

// Hook for completing consultation
export function useCompleteConsultation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (queueEntryId: string) => {
      const formData = new FormData();
      formData.append('queueEntryId', queueEntryId);
      
      const result = await completeConsultation(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to complete consultation');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Consultation completed successfully');
      // Invalidate and refetch queue data
      queryClient.invalidateQueries({ queryKey: gurujiKeys.queue() });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to complete consultation');
    },
  });
} 

// Hook for fetching guruji consultations
export function useGurujiConsultations() {
  return useQuery({
    queryKey: gurujiKeys.consultations(),
    queryFn: async () => {
      const result = await getGurujiConsultations();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch guruji consultations');
      }
      return result.consultations;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
} 