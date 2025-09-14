import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGurujiQueueEntries, startConsultation, completeConsultation } from '@/lib/actions/queue-actions';
import { getGurujiConsultations } from '@/lib/actions/consultation-actions';
import { getDevoteeContactHistory, sendDevoteeNotification } from '@/lib/actions/guruji-actions';
import { toast } from 'sonner';

// Query keys
export const gurujiKeys = {
  all: ['guruji'] as const,
  queue: () => [...gurujiKeys.all, 'queue'] as const,
  consultations: () => [...gurujiKeys.all, 'consultations'] as const,
  remedies: () => [...gurujiKeys.all, 'remedies'] as const,
  devotees: () => [...gurujiKeys.all, 'devotees'] as const,
  contactHistory: (devoteeId: string) => [...gurujiKeys.all, 'contact-history', devoteeId] as const,
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
      const queueDevotees = (result.queueEntries || [])
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
              age: entry.user.dateOfBirth 
                ? Math.floor((new Date().getTime() - new Date(entry.user.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
                : null,
            },
          },
          checkedInAt: entry.checkedInAt,
        }));

      const currentDevotee = (result.queueEntries || [])
        .find(entry => entry.status === 'IN_PROGRESS')
        ? (() => {
            const inProgressEntry = (result.queueEntries || []).find(entry => entry.status === 'IN_PROGRESS')!;
            return {
              id: inProgressEntry.id,
              position: inProgressEntry.position,
              estimatedWait: inProgressEntry.estimatedWait || 15,
              status: 'IN_PROGRESS' as const,
              appointment: {
                id: inProgressEntry.appointmentId,
                reason: inProgressEntry.notes || '',
                priority: inProgressEntry.priority,
                startTime: inProgressEntry.checkedInAt,
                user: {
                  id: inProgressEntry.user.id,
                  name: inProgressEntry.user.name || 'Unknown',
                  age: inProgressEntry.user.dateOfBirth 
                    ? Math.floor((new Date().getTime() - new Date(inProgressEntry.user.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
                    : null,
                },
            },
            checkedInAt: inProgressEntry.checkedInAt,
          };
        })()
        : null;

      // Calculate stats
      const queueEntries = result.queueEntries || [];
      const todayTotal = queueEntries.length;
      const todayCompleted = queueEntries.filter(entry => entry.status === 'COMPLETED').length;
      const currentWaiting = queueEntries.filter(entry => entry.status === 'WAITING').length;
      const averageConsultationTime = 15; // Default 15 minutes

      const stats = {
        todayTotal,
        todayCompleted,
        currentWaiting,
        averageConsultationTime,
      };

      return {
        queueDevotees,
        currentDevotee,
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

// Hook for fetching devotee contact history
export function useDevoteeContactHistory(devoteeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: gurujiKeys.contactHistory(devoteeId),
    queryFn: async () => {
      const result = await getDevoteeContactHistory(devoteeId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch contact history');
      }
      return result.data || [];
    },
    enabled: !!devoteeId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // Don't auto-refetch contact history
  });
}

// Hook for sending notification to devotee
export function useSendDevoteeNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ devoteeId, message, type = 'CUSTOM' }: {
      devoteeId: string;
      message: string;
      type?: string;
    }) => {
      const result = await sendDevoteeNotification(devoteeId, message, type);
      if (!result.success) {
        throw new Error(result.error || 'Failed to send notification');
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      toast.success('Notification sent successfully');
      // Invalidate and refetch contact history for this devotee
      queryClient.invalidateQueries({
        queryKey: gurujiKeys.contactHistory(variables.devoteeId)
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send notification');
    },
  });
}