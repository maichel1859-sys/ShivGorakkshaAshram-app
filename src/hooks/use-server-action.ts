"use client";

import { useTransition, useCallback } from 'react';
import { toast } from 'sonner';
import { useState } from 'react';

interface UseServerActionOptions<TData, TError> {
  onSuccess?: (data: TData) => void;
  onError?: (error: TError) => void;
  successMessage?: string;
  errorMessage?: string;
  optimisticUpdate?: () => void;
  rollbackOptimisticUpdate?: () => void;
}

interface UseServerActionReturn<TData, TError> {
  execute: (action: () => Promise<{ success: boolean; data?: TData; error?: string }>) => Promise<void>;
  isPending: boolean;
  error: TError | null;
}

export function useServerAction<TData = unknown, TError = string>(
  options: UseServerActionOptions<TData, TError> = {}
): UseServerActionReturn<TData, TError> {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<TError | null>(null);

  const execute = useCallback(
    async (action: () => Promise<{ success: boolean; data?: TData; error?: string }>) => {
      setError(null);
      
      // Apply optimistic update if provided
      if (options.optimisticUpdate) {
        options.optimisticUpdate();
      }

      startTransition(async () => {
        try {
          const result = await action();
          
          if (result.success && result.data) {
            // Success case
            if (options.successMessage) {
              toast.success(options.successMessage);
            }
            options.onSuccess?.(result.data);
          } else {
            // Error case
            const errorMessage = result.error || options.errorMessage || 'Action failed';
            toast.error(errorMessage);
            setError(errorMessage as TError);
            options.onError?.(errorMessage as TError);
            
            // Rollback optimistic update if provided
            if (options.rollbackOptimisticUpdate) {
              options.rollbackOptimisticUpdate();
            }
          }
        } catch (err) {
          // Exception case
          const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
          toast.error(errorMessage);
          setError(errorMessage as TError);
          options.onError?.(errorMessage as TError);
          
          // Rollback optimistic update if provided
          if (options.rollbackOptimisticUpdate) {
            options.rollbackOptimisticUpdate();
          }
        }
      });
    },
    [options, startTransition]
  );

  return {
    execute,
    isPending,
    error,
  };
}

// Hook for form actions with automatic form data handling
export function useFormAction<TData = unknown, TError = string>(
  serverAction: (formData: FormData) => Promise<{ success: boolean; data?: TData; error?: string }>,
  options: UseServerActionOptions<TData, TError> = {}
) {
  const { execute, isPending, error } = useServerAction<TData, TError>(options);

  const handleSubmit = useCallback(
    async (formData: FormData) => {
      await execute(() => serverAction(formData));
    },
    [execute, serverAction]
  );

  return {
    handleSubmit,
    isPending,
    error,
  };
}

// Hook for simple actions without form data
export function useAction<TData = unknown, TError = string>(
  serverAction: () => Promise<{ success: boolean; data?: TData; error?: string }>,
  options: UseServerActionOptions<TData, TError> = {}
) {
  const { execute, isPending, error } = useServerAction<TData, TError>(options);

  const handleAction = useCallback(async () => {
    await execute(serverAction);
  }, [execute, serverAction]);

  return {
    handleAction,
    isPending,
    error,
  };
} 