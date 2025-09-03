"use client";

import { cn } from "@/lib/utils/helpers";
import { Loader2 } from "lucide-react";

interface GlobalSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  message?: string;
  fullScreen?: boolean;
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
  fullScreen = false 
}: GlobalSpinnerProps) {
  const spinner = (
    <Loader2 className={cn("animate-spin text-primary", sizeClasses[size], className)} />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center space-y-4 p-6 bg-card rounded-lg shadow-lg border">
          {spinner}
          {message && (
            <p className="text-sm text-muted-foreground text-center">{message}</p>
          )}
        </div>
      </div>
    );
  }

  if (message) {
    return (
      <div className="flex flex-col items-center space-y-2">
        {spinner}
        <p className="text-sm text-muted-foreground text-center">{message}</p>
      </div>
    );
  }

  return spinner;
}

// Convenience components for common use cases
export function PageSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <GlobalSpinner size="lg" message={message} />
    </div>
  );
}

export function CardSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <GlobalSpinner size="md" message={message} />
    </div>
  );
}

export function ButtonSpinner({ size = "sm" }: { size?: "sm" | "md" }) {
  return <GlobalSpinner size={size} />;
}

export function FullScreenSpinner({ message = "Loading..." }: { message?: string }) {
  return <GlobalSpinner size="lg" message={message} fullScreen />;
}
