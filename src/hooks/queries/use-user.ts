import { useQuery } from '@tanstack/react-query';
import { getUserDashboard } from '@/lib/actions/user-actions';

// Query keys
export const userDashboardKeys = {
  all: ['user-dashboard'] as const,
  dashboard: () => [...userDashboardKeys.all, 'dashboard'] as const,
};

// Hook for fetching user dashboard data
export function useUserDashboard() {
  return useQuery({
    queryKey: userDashboardKeys.dashboard(),
    queryFn: async () => {
      const result = await getUserDashboard();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }
      return result.data;
    },
  });
} 