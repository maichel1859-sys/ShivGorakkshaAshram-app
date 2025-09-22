"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, createUser, updateUser, deleteUser, toggleUserStatus, getUserById, getUserDashboard } from '@/lib/actions';

// Query keys for better cache management
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  dashboard: () => [...userKeys.all, 'dashboard'] as const,
};

// Hook for fetching users with filters
export function useUsers(filters?: {
  role?: "USER" | "COORDINATOR" | "GURUJI" | "ADMIN";
  active?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: userKeys.list(filters || {}),
    queryFn: async () => {
      const result = await getUsers(filters);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch users');
      }
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for fetching a single user
export function useUser(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: async () => {
      const result = await getUserById(userId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch user');
      }
      return result.user;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for creating a user
export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createUser(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create user');
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

// Hook for updating a user
export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, formData }: { userId: string; formData: FormData }) => {
      const result = await updateUser(userId, formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update user');
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

// Hook for deleting a user
export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const result = await deleteUser(userId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete user');
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

// Hook for toggling user status
export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const result = await toggleUserStatus(userId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to toggle user status');
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

// Hook for fetching user dashboard data
export function useUserDashboard() {
  return useQuery({
    queryKey: userKeys.dashboard(),
    queryFn: async () => {
      const result = await getUserDashboard();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
} 