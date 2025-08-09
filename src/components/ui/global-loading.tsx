"use client";

import { useAppLoading } from "@/store/app-store";
import { cn } from "@/lib/utils/helpers";

export function GlobalLoadingOverlay() {
  const isLoading = useAppLoading();
  return (
    <div
      aria-hidden={!isLoading}
      className={cn(
        "fixed inset-0 z-[60] pointer-events-none transition-opacity duration-200",
        isLoading ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    </div>
  );
}
