import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminQueueEntries } from '@/lib/actions/queue-actions';
import { getAdminConsultations } from '@/lib/actions/consultation-actions';
import { getSystemStatus, getSystemSettings, updateSystemSettings, getUsageReports, exportUsageReport } from '@/lib/actions/dashboard-actions';
import { toast } from 'sonner';

// Query keys
export const adminKeys = {
  all: ['admin'] as const,
  queue: () => [...adminKeys.all, 'queue'] as const,
  consultations: () => [...adminKeys.all, 'consultations'] as const,
  system: () => [...adminKeys.all, 'system'] as const,
  settings: () => [...adminKeys.all, 'settings'] as const,
  reports: () => [...adminKeys.all, 'reports'] as const,
  usage: (params?: { dateFrom?: string; dateTo?: string; type?: string }) => [...adminKeys.reports(), 'usage', params] as const,
};

// Hook for fetching admin queue data
export function useAdminQueue() {
  return useQuery({
    queryKey: adminKeys.queue(),
    queryFn: async () => {
      const result = await getAdminQueueEntries();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch admin queue data');
      }
      return result.queueEntries;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

// Hook for fetching admin consultations data
export function useAdminConsultations() {
  return useQuery({
    queryKey: adminKeys.consultations(),
    queryFn: async () => {
      const result = await getAdminConsultations();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch admin consultations data');
      }
      return result.consultations;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

// Hook for fetching admin system status
export function useAdminSystemStatus() {
  return useQuery({
    queryKey: adminKeys.system(),
    queryFn: async () => {
      const result = await getSystemStatus();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch system status');
      }
      return result.systemStatus;
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Hook for fetching system settings
export function useSystemSettings() {
  return useQuery({
    queryKey: adminKeys.settings(),
    queryFn: async () => {
      const result = await getSystemSettings();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch system settings');
      }
      return result.settings;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for updating system settings
export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await updateSystemSettings(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update system settings');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Settings updated successfully');
      // Invalidate settings cache
      queryClient.invalidateQueries({ queryKey: adminKeys.settings() });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update settings');
    },
  });
}

// Hook for fetching usage reports
export function useUsageReports(options?: {
  dateFrom?: string;
  dateTo?: string;
  type?: 'summary' | 'detailed' | 'performance' | 'trends';
}) {
  return useQuery({
    queryKey: adminKeys.usage(options),
    queryFn: async () => {
      const result = await getUsageReports(options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch usage reports');
      }
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for exporting usage reports
export function useExportUsageReport() {
  return useMutation({
    mutationFn: async (options?: {
      dateFrom?: string;
      dateTo?: string;
      type?: 'summary' | 'detailed' | 'performance' | 'trends';
    }) => {
      const result = await exportUsageReport(options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to export usage report');
      }
      return result;
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to export report');
    },
  });
} 

 