'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  getGurujiProfile,
  updateGurujiProfile,
  getGurujiSchedule,
  updateGurujiSchedule,
  getGurujiStats
} from '@/lib/actions/guruji-actions';

// Get guruji profile
export function useGurujiProfile(gurujiId?: string) {
  const { data: session } = useSession();
  const targetGurujiId = gurujiId || session?.user?.id;

  return useQuery({
    queryKey: ['guruji', 'profile', targetGurujiId],
    queryFn: async () => {
      if (!targetGurujiId) {
        throw new Error('Guruji ID is required');
      }
      const result = await getGurujiProfile(targetGurujiId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch guruji profile');
      }
      return result.guruji;
    },
    enabled: !!targetGurujiId
  });
}

// Update guruji profile
export function useUpdateGurujiProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await updateGurujiProfile(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }
      return result.guruji;
    },
    onSuccess: () => {
      // Invalidate and refetch guruji profile
      queryClient.invalidateQueries({ queryKey: ['guruji', 'profile'] });
    }
  });
}

// Get guruji schedule
export function useGurujiSchedule(gurujiId?: string) {
  const { data: session } = useSession();
  const targetGurujiId = gurujiId || session?.user?.id;

  return useQuery({
    queryKey: ['guruji', 'schedule', targetGurujiId],
    queryFn: async () => {
      if (!targetGurujiId) {
        throw new Error('Guruji ID is required');
      }
      const result = await getGurujiSchedule(targetGurujiId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch schedule');
      }
      return result.schedule;
    },
    enabled: !!targetGurujiId
  });
}

// Update guruji schedule
export function useUpdateGurujiSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await updateGurujiSchedule(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update schedule');
      }
      return result.schedule;
    },
    onSuccess: () => {
      // Invalidate and refetch schedule
      queryClient.invalidateQueries({ queryKey: ['guruji', 'schedule'] });
    }
  });
}

// Get guruji statistics
export function useGurujiStats(gurujiId?: string) {
  const { data: session } = useSession();
  const targetGurujiId = gurujiId || session?.user?.id;

  return useQuery({
    queryKey: ['guruji', 'stats', targetGurujiId],
    queryFn: async () => {
      if (!targetGurujiId) {
        throw new Error('Guruji ID is required');
      }
      const result = await getGurujiStats(targetGurujiId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch stats');
      }
      return result.stats;
    },
    enabled: !!targetGurujiId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000 // Refresh every 10 minutes
  });
}

// Get guruji consultations
export function useGurujiConsultations(gurujiId?: string) {
  const { data: session } = useSession();
  const targetGurujiId = gurujiId || session?.user?.id;

  return useQuery({
    queryKey: ['guruji', 'consultations', targetGurujiId],
    queryFn: async () => {
      if (!targetGurujiId) {
        throw new Error('Guruji ID is required');
      }
      // For now, return empty array since consultations are not fully implemented
      return [];
    },
    enabled: !!targetGurujiId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });
}