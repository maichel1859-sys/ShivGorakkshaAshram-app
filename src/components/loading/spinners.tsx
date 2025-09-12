"use client";

import { cn } from "@/lib/utils/helpers";
import { Loader2 } from "lucide-react";
import { useAppLoading, useAuthLoading, useRouteLoading, useDataLoading } from "@/store/app-store";

interface GlobalSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  message?: string;
  fullScreen?: boolean;
  useCentralLoading?: boolean; // Whether to use central loading states
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6", 
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

export function GlobalSpinner({ 
  size = "md", 
  className,
  message,
  fullScreen = false,
  useCentralLoading = false
}: GlobalSpinnerProps) {
  const isLoading = useAppLoading();
  const isAuthLoading = useAuthLoading();
  const isRouteLoading = useRouteLoading();
  const isDataLoading = useDataLoading();

  // Get loading message based on central loading state
  const getLoadingMessage = () => {
    if (message) return message;
    
    if (isAuthLoading) return "Authenticating...";
    if (isRouteLoading) return "Loading page...";
    if (isDataLoading) return "Loading data...";
    if (isLoading) return "Loading...";
    
    return "Loading...";
  };

  // Only show spinner if using central loading and there's an active loading state
  if (useCentralLoading && !isLoading && !isAuthLoading && !isRouteLoading && !isDataLoading) {
    return null;
  }

  const spinner = (
    <Loader2 className={cn("animate-spin text-primary", sizeClasses[size], className)} />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center space-y-4 p-6 bg-card rounded-lg shadow-lg border">
          {spinner}
          <p className="text-sm text-muted-foreground text-center">{getLoadingMessage()}</p>
        </div>
      </div>
    );
  }

  const loadingMessage = getLoadingMessage();
  if (loadingMessage) {
    return (
      <div className="flex flex-col items-center space-y-2">
        {spinner}
        <p className="text-sm text-muted-foreground text-center">{loadingMessage}</p>
      </div>
    );
  }

  return spinner;
}

// Convenience components for common use cases
export function PageSpinner({ 
  message, 
  useCentralLoading = false 
}: { 
  message?: string; 
  useCentralLoading?: boolean; 
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <GlobalSpinner size="lg" message={message} useCentralLoading={useCentralLoading} />
    </div>
  );
}

export function CardSpinner({ 
  message, 
  useCentralLoading = false 
}: { 
  message?: string; 
  useCentralLoading?: boolean; 
}) {
  return (
    <div className="flex items-center justify-center h-64">
      <GlobalSpinner size="md" message={message} useCentralLoading={useCentralLoading} />
    </div>
  );
}

export function ButtonSpinner({ 
  size = "sm", 
  useCentralLoading = false 
}: { 
  size?: "sm" | "md"; 
  useCentralLoading?: boolean; 
}) {
  return <GlobalSpinner size={size} useCentralLoading={useCentralLoading} />;
}

export function FullScreenSpinner({ 
  message, 
  useCentralLoading = false 
}: { 
  message?: string; 
  useCentralLoading?: boolean; 
}) {
  return <GlobalSpinner size="lg" message={message} fullScreen useCentralLoading={useCentralLoading} />;
}
