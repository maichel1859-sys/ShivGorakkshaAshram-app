"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools"; // Temporarily unused

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // 2 minutes (reduced for faster updates)
            gcTime: 5 * 60 * 1000, // 5 minutes (reduced memory usage)
            retry: (failureCount, error: unknown) => {
              // Don't retry on 4xx errors
              if (error && typeof error === "object" && "status" in error) {
                const status = (error as { status: number }).status;
                if (status >= 400 && status < 500) {
                  return false;
                }
              }
              return failureCount < 2; // Reduced retry attempts
            },
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            // Performance optimizations
            structuralSharing: true,
            placeholderData: (previousData: unknown) => previousData,
          },
          mutations: {
            retry: false,
            onError: (error) => {
              console.error("Mutation error:", error);
            },
            // Optimistic updates for better UX
            onMutate: async () => {
              // Cancel outgoing refetches
              await queryClient.cancelQueries();
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* ReactQueryDevtools temporarily disabled due to hydration mismatch */}
      {/* {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )} */}
    </QueryClientProvider>
  );
}
