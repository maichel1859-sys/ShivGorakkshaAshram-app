"use client";

import { useAppLoading, useAuthLoading, useRouteLoading, useDataLoading } from "@/store/app-store";
import { cn } from "@/lib/utils/helpers";

interface LoadingOverlayProps {
  children: React.ReactNode;
  className?: string;
  showOnAuth?: boolean;
  showOnRoute?: boolean;
  showOnData?: boolean;
  showOnGlobal?: boolean;
}

export function LoadingOverlay({ 
  children, 
  className,
  showOnAuth = true,
  showOnRoute = true,
  showOnData = true,
  showOnGlobal = true
}: LoadingOverlayProps) {
  const isLoading = useAppLoading();
  const isAuthLoading = useAuthLoading();
  const isRouteLoading = useRouteLoading();
  const isDataLoading = useDataLoading();

  const shouldShow = (
    (showOnGlobal && isLoading) ||
    (showOnAuth && isAuthLoading) ||
    (showOnRoute && isRouteLoading) ||
    (showOnData && isDataLoading)
  );

  if (!shouldShow) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative", className)}>
      {children}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    </div>
  );
}


