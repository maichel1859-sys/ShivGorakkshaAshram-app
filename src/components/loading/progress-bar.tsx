"use client";

import { useEffect, useState } from "react";
import { useAppLoading, useAuthLoading, useRouteLoading, useDataLoading } from "@/store/app-store";
import { cn } from "@/lib/utils/helpers";

export function TopProgressBar() {
  const isLoading = useAppLoading();
  const isAuthLoading = useAuthLoading();
  const isRouteLoading = useRouteLoading();
  const isDataLoading = useDataLoading();
  const [width, setWidth] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Determine which loading state to show
  const activeLoading = isAuthLoading || isRouteLoading || isDataLoading || isLoading;
  
  // Get color based on loading type
  const getBarColor = () => {
    if (isAuthLoading) return "bg-blue-500"; // Auth loading - blue
    if (isRouteLoading) return "bg-green-500"; // Route loading - green
    if (isDataLoading) return "bg-primary"; // Data loading - primary color
    return "bg-primary"; // Default
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    
    if (activeLoading) {
      setIsVisible(true);
      setWidth(10);
      timer = setInterval(() => {
        setWidth((w) => {
          if (w >= 90) return w;
          return w + Math.max(1, (90 - w) * 0.05);
        });
      }, 200);
    } else {
      setWidth(100);
      const t = setTimeout(() => {
        setIsVisible(false);
        setWidth(0);
      }, 250);
      return () => clearTimeout(t);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeLoading]);

  return (
    <div className="fixed left-0 right-0 top-0 z-[70] h-1">
      <div
        className={cn(
          "h-full transition-all duration-300 ease-out",
          getBarColor(),
          isVisible ? "opacity-100" : "opacity-0"
        )}
        style={{ 
          width: `${width}%`,
          transform: `translateX(${isVisible ? '0' : '-100%'})`
        }}
      />
    </div>
  );
}
