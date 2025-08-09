"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
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
  const setLoading = useAppStore((s) => s.setLoading);
  const pathname = usePathname();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const routeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // React Query network activity → loading
  useEffect(() => {
    const active = isFetching + isMutating > 0;
    setLoading(active);
  }, [isFetching, isMutating, setLoading]);

  // Route change hint → optimistic loading pulse
  useEffect(() => {
    // On pathname change, show a brief loading pulse to cover transitions
    setLoading(true);
    if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
    routeTimerRef.current = setTimeout(() => setLoading(false), routeDelayMs);

    return () => {
      if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return <>{children}</>;
}
