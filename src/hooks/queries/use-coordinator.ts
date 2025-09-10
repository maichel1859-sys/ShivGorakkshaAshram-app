import { useQuery } from '@tanstack/react-query';
import { getCoordinatorDashboard } from '@/lib/actions/dashboard-actions';

// Query keys
export const coordinatorKeys = {
  all: ['coordinator'] as const,
  dashboard: () => [...coordinatorKeys.all, 'dashboard'] as const,
};

// Hook for fetching coordinator dashboard data
export function useCoordinatorDashboard() {
  return useQuery({
    queryKey: coordinatorKeys.dashboard(),
    queryFn: async () => {
      const result = await getCoordinatorDashboard();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch coordinator dashboard data');
      }
      
      const data = (result as { 
        success: true; 
        data: {
          todayAppointments: number;
          pendingAppointments: number;
          activeQueue: Array<{
            status: string;
            gurujiId?: string;
          }>;
          recentCheckins: Array<{
            id: string;
            user?: { name?: string };
            date?: Date;
            status?: string;
          }>;
        }
      }).data;
      
      // Calculate stats
      const totalAppointmentsToday = data.todayAppointments || 0;
      const checkedInToday = data.recentCheckins?.length || 0;
      const waitingInQueue = data.activeQueue?.filter((entry: { status: string }) => entry.status === 'WAITING').length || 0;
      const completedToday = 0; // Would need to calculate from completed appointments
      const pendingApprovals = data.pendingAppointments || 0;
      
      // Transform upcoming appointments
      const upcomingAppointments = (data.recentCheckins || []).map((appointment: {
        id: string;
        user?: { name?: string };
        date?: Date;
        status?: string;
      }) => ({
        id: appointment.id,
        patientName: appointment.user?.name || 'Unknown',
        gurujiName: 'Unknown', // Would need to include guruji data
        time: appointment.date?.toISOString() || new Date().toISOString(),
        status: appointment.status || 'PENDING',
        priority: 'NORMAL', // Would need to include priority data
      }));
      
      // Transform queue summary
      const queueSummary = (data.activeQueue || []).reduce((acc: Array<{
        gurujiId: string;
        gurujiName: string;
        waitingCount: number;
        inProgressCount: number;
        averageWaitTime: number;
      }>, entry: {
        gurujiId?: string;
        status: string;
      }) => {
        const gurujiId = entry.gurujiId || 'unknown';
        const existing = acc.find((summary) => summary.gurujiId === gurujiId);
        
        if (existing) {
          if (entry.status === 'WAITING') {
            existing.waitingCount++;
          } else if (entry.status === 'IN_PROGRESS') {
            existing.inProgressCount++;
          }
        } else {
          acc.push({
            gurujiId,
            gurujiName: 'Unknown', // Would need to include guruji data
            waitingCount: entry.status === 'WAITING' ? 1 : 0,
            inProgressCount: entry.status === 'IN_PROGRESS' ? 1 : 0,
            averageWaitTime: 15, // Default 15 minutes
          });
        }
        
        return acc;
      }, [] as Array<{
        gurujiId: string;
        gurujiName: string;
        waitingCount: number;
        inProgressCount: number;
        averageWaitTime: number;
      }>);
      
      // Today's stats
      const todayStats = {
        appointments: totalAppointmentsToday,
        checkins: checkedInToday,
        completions: completedToday,
        cancellations: 0, // Would need to calculate from cancelled appointments
      };
      
      return {
        totalAppointmentsToday,
        checkedInToday,
        waitingInQueue,
        completedToday,
        pendingApprovals,
        upcomingAppointments,
        queueSummary,
        todayStats,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
} 