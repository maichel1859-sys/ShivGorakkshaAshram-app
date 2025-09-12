"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils/helpers";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-14 h-7 rounded-full border bg-muted animate-pulse" />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative w-14 h-7 rounded-full p-0.5 transition-all duration-200",
        "border border-border bg-background hover:bg-muted shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      )}
      aria-label="Toggle theme"
    >
      {/* Sliding Toggle */}
      <div className={cn(
        "absolute top-0.5 w-6 h-6 rounded-full transition-transform duration-200",
        "bg-primary shadow-sm",
        "flex items-center justify-center",
        isDark ? "translate-x-7" : "translate-x-0.5"
      )}>
        {/* Icons */}
        <Sun className={cn(
          "h-3 w-3 transition-all duration-200 absolute text-primary-foreground",
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        )} />
        <Moon className={cn(
          "h-3 w-3 transition-all duration-200 absolute text-primary-foreground", 
          isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"
        )} />
      </div>
    </button>
  );
}