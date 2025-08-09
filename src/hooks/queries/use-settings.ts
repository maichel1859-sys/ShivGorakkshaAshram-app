import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUserSettings } from '@/lib/actions/settings-actions';
import { toast } from 'sonner';

// Query keys
export const settingsKeys = {
  all: ['settings'] as const,
  user: () => [...settingsKeys.all, 'user'] as const,
};

// Hook for updating user settings
export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const result = await updateUserSettings();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update settings');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Settings updated successfully');
      // Invalidate settings cache
      queryClient.invalidateQueries({ queryKey: settingsKeys.user() });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update settings');
    },
  });
} 