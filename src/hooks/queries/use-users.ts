"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, createUser, updateUser, deleteUser, toggleUserStatus } from '@/lib/actions';

// Query keys for better cache management
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
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
      // This would need a getUser action
      const result = await getUsers({ limit: 1, offset: 0 });
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch user');
      }
      const user = result.users?.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
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
    mutationFn: async (formData: FormData) => {
      const result = await updateUser(formData);
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
    mutationFn: async (formData: FormData) => {
      const result = await deleteUser(formData);
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
    mutationFn: async (formData: FormData) => {
      const result = await toggleUserStatus(formData);
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