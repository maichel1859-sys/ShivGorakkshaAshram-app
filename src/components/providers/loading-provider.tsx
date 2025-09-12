"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/store/app-store";

interface LoadingProviderProps {
  children: React.ReactNode;
  routeDelayMs?: number;
}

// Derives a global loading state from React Query activity and route transitions
export function LoadingProvider({
  children,
  routeDelayMs = 200,
}: LoadingProviderProps) {
  const { 
    setLoading, 
    setRouteLoading, 
    setDataLoading,
    setAuthLoading
  } = useAppStore();
  const pathname = usePathname();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const { status } = useSession();
  const routeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // React Query network activity → data loading
  useEffect(() => {
    const active = isFetching + isMutating > 0;
    setDataLoading(active);
    
    // Also set global loading for overall app state
    setLoading(active);
  }, [isFetching, isMutating, setDataLoading, setLoading]);

  // Authentication status → auth loading
  useEffect(() => {
    const isAuthLoading = status === 'loading';
    setAuthLoading(isAuthLoading);
  }, [status, setAuthLoading]);

  // Route change hint → route loading pulse
  useEffect(() => {
    // On pathname change, show a brief loading pulse to cover transitions
    setRouteLoading(true);
    if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
    routeTimerRef.current = setTimeout(() => setRouteLoading(false), routeDelayMs);

    return () => {
      if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return <>{children}</>;
}
