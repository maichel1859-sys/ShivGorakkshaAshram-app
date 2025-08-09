"use client";

import { useEffect, useState } from "react";
import { useAppLoading } from "@/store/app-store";
import { cn } from "@/lib/utils/helpers";

export function TopProgressBar() {
  const isLoading = useAppLoading();
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isLoading) {
      setWidth(10);
      timer = setInterval(() => {
        setWidth((w) => (w < 90 ? w + Math.max(1, (90 - w) * 0.05) : w));
      }, 200);
    } else {
      setWidth(100);
      const t = setTimeout(() => setWidth(0), 250);
      return () => clearTimeout(t);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLoading]);

  return (
    <div className="fixed left-0 right-0 top-0 z-[70] h-0.5">
      <div
        className={cn(
          "h-full bg-primary transition-all duration-200",
          width === 0 && "opacity-0",
          width > 0 && "opacity-100"
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
