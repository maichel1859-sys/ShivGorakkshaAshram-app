"use client";

import { useEffect, useState } from "react";
import { useAppLoading } from "@/store/app-store";
import { cn } from "@/lib/utils/helpers";

export function TopProgressBar() {
  const isLoading = useAppLoading();
  const [width, setWidth] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    
    if (isLoading) {
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
  }, [isLoading]);

  return (
    <div className="fixed left-0 right-0 top-0 z-[70] h-1">
      <div
        className={cn(
          "h-full bg-primary transition-all duration-300 ease-out",
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
