import { useQuery } from "@tanstack/react-query";
import { getGurujiAppointments } from "@/lib/actions/guruji-actions";

export function useGurujiAppointments() {
  return useQuery({
    queryKey: ["guruji-appointments"],
    queryFn: async () => {
      const result = await getGurujiAppointments();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch appointments");
      }
      return result.appointments || [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}