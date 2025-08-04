import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

interface UseApiOptions<T> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  mutate: (newData: T) => void;
}

export function useApi<T>({
  url,
  method = 'GET',
  body,
  headers = {},
  onSuccess,
  onError,
  enabled = true,
}: UseApiOptions<T>): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred');
      setError(error);
      onError?.(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [url, method, body, headers, enabled, onSuccess, onError]);

  const refetch = async () => {
    await fetchData();
  };

  const mutate = (newData: T) => {
    setData(newData);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch, mutate };
}

// Specialized hooks for common operations
export function useGet<T>(url: string, options?: Omit<UseApiOptions<T>, 'url' | 'method'>) {
  return useApi<T>({ url, method: 'GET', ...options });
}

export function usePost<T>(url: string, body?: unknown, options?: Omit<UseApiOptions<T>, 'url' | 'method' | 'body'>) {
  return useApi<T>({ url, method: 'POST', body, ...options });
}

export function usePut<T>(url: string, body?: unknown, options?: Omit<UseApiOptions<T>, 'url' | 'method' | 'body'>) {
  return useApi<T>({ url, method: 'PUT', body, ...options });
}

export function useDelete<T>(url: string, options?: Omit<UseApiOptions<T>, 'url' | 'method'>) {
  return useApi<T>({ url, method: 'DELETE', ...options });
} 