import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRemedyTemplates, getRemedyTemplate, createRemedyTemplate, updateRemedyTemplate, deleteRemedyTemplate, getGurujiDevotees, generateRemedyPreview, prescribeRemedy } from '@/lib/actions/remedy-actions';
import { toast } from 'sonner';

// Query keys
export const remedyKeys = {
  all: ['remedies'] as const,
  templates: () => [...remedyKeys.all, 'templates'] as const,
  template: (id: string) => [...remedyKeys.templates(), id] as const,
  userRemedies: () => [...remedyKeys.all, 'user'] as const,
  prescribed: () => [...remedyKeys.all, 'prescribed'] as const,
};

// Hook for fetching remedy templates
export function useRemedyTemplates(options?: {
  type?: string;
  category?: string;
  language?: string;
  active?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: remedyKeys.templates(),
    queryFn: async () => {
      const result = await getRemedyTemplates(options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch remedy templates');
      }
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for fetching single remedy template
export function useRemedyTemplate(templateId: string) {
  return useQuery({
    queryKey: remedyKeys.template(templateId),
    queryFn: async () => {
      const result = await getRemedyTemplate(templateId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch remedy template');
      }
      return result.template;
    },
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for creating remedy template
export function useCreateRemedyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createRemedyTemplate(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create remedy template');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Remedy template created successfully');
      // Invalidate templates cache
      queryClient.invalidateQueries({ queryKey: remedyKeys.templates() });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create remedy template');
    },
  });
}

// Hook for updating remedy template
export function useUpdateRemedyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await updateRemedyTemplate(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update remedy template');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success('Remedy template updated successfully');
      // Invalidate templates cache and specific template cache
      queryClient.invalidateQueries({ queryKey: remedyKeys.templates() });
      if (data.template?.id) {
        queryClient.invalidateQueries({ queryKey: remedyKeys.template(data.template.id) });
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update remedy template');
    },
  });
}

// Hook for deleting remedy template
export function useDeleteRemedyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await deleteRemedyTemplate(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete remedy template');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Remedy template deleted successfully');
      // Invalidate templates cache
      queryClient.invalidateQueries({ queryKey: remedyKeys.templates() });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete remedy template');
    },
  });
}

// Hook for fetching guruji devotees
export function useGurujiDevotees() {
  return useQuery({
    queryKey: [...remedyKeys.all, 'devotees'],
    queryFn: async () => {
      const result = await getGurujiDevotees();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch devotees');
      }
      return result.devotees;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for generating remedy preview
export function useGenerateRemedyPreview() {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await generateRemedyPreview(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate preview');
      }
      return result.preview;
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate preview');
    },
  });
}

// Hook for prescribing remedy
export function usePrescribeRemedy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await prescribeRemedy(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to prescribe remedy');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Remedy prescribed successfully');
      // Invalidate user remedies cache
      queryClient.invalidateQueries({ queryKey: remedyKeys.userRemedies() });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to prescribe remedy');
    },
  });
} 