"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/helpers";
import { LucideIcon } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
    direction: "up" | "down" | "neutral";
  };
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "gray";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

const colorClasses = {
  blue: {
    icon: "text-blue-600 bg-blue-100",
    trend: {
      up: "text-blue-600",
      down: "text-blue-500",
      neutral: "text-blue-500",
    },
  },
  green: {
    icon: "text-green-600 bg-green-100",
    trend: {
      up: "text-green-600",
      down: "text-green-500",
      neutral: "text-green-500",
    },
  },
  yellow: {
    icon: "text-yellow-600 bg-yellow-100",
    trend: {
      up: "text-yellow-600",
      down: "text-yellow-500",
      neutral: "text-yellow-500",
    },
  },
  red: {
    icon: "text-red-600 bg-red-100",
    trend: {
      up: "text-red-600",
      down: "text-red-500",
      neutral: "text-red-500",
    },
  },
  purple: {
    icon: "text-purple-600 bg-purple-100",
    trend: {
      up: "text-purple-600",
      down: "text-purple-500",
      neutral: "text-purple-500",
    },
  },
  gray: {
    icon: "text-gray-600 bg-gray-100",
    trend: {
      up: "text-gray-600",
      down: "text-gray-500",
      neutral: "text-gray-500",
    },
  },
};

const sizeClasses = {
  sm: {
    card: "p-4",
    icon: "h-8 w-8 p-1.5",
    value: "text-xl font-semibold",
    title: "text-sm font-medium",
    description: "text-xs",
  },
  md: {
    card: "p-6",
    icon: "h-10 w-10 p-2",
    value: "text-2xl font-bold",
    title: "text-sm font-medium",
    description: "text-sm",
  },
  lg: {
    card: "p-8",
    icon: "h-12 w-12 p-2.5",
    value: "text-3xl font-bold",
    title: "text-base font-medium",
    description: "text-base",
  },
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  badge,
  color = "blue",
  size = "md",
  loading = false,
  onClick,
  className,
}: StatCardProps) {
  const colorClass = colorClasses[color];
  const sizeClass = sizeClasses[size];

  const formatValue = (val: string | number): string => {
    if (typeof val === "number") {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendIcon = (direction: "up" | "down" | "neutral") => {
    switch (direction) {
      case "up":
        return "↗";
      case "down":
        return "↘";
      default:
        return "→";
    }
  };

  if (loading) {
    return (
      <Card
        className={cn(
          "animate-pulse transition-all duration-200",
          onClick && "cursor-pointer hover:shadow-md",
          className
        )}
      >
        <CardContent className={sizeClass.card}>
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
              {description && (
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              )}
            </div>
            {Icon && (
              <div
                className={cn(
                  "rounded-full flex items-center justify-center bg-gray-200",
                  sizeClass.icon
                )}
              >
                <div className="h-4 w-4 bg-gray-300 rounded"></div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-sm",
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.02]",
        className
      )}
      onClick={onClick}
    >
      <CardContent className={sizeClass.card}>
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            {/* Header with title and badge */}
            <div className="flex items-center justify-between">
              <h3 className={cn("text-muted-foreground", sizeClass.title)}>
                {title}
              </h3>
              {badge && (
                <Badge
                  variant={badge.variant || "secondary"}
                  className="text-xs"
                >
                  {badge.text}
                </Badge>
              )}
            </div>

            {/* Main value */}
            <div className="flex items-baseline space-x-2">
              <p className={cn("text-foreground", sizeClass.value)}>
                {formatValue(value)}
              </p>

              {/* Trend indicator */}
              {trend && (
                <div
                  className={cn(
                    "flex items-center text-xs font-medium",
                    colorClass.trend[trend.direction]
                  )}
                >
                  <span className="mr-1">{getTrendIcon(trend.direction)}</span>
                  <span>
                    {Math.abs(trend.value)}% {trend.label}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {description && (
              <p className={cn("text-muted-foreground", sizeClass.description)}>
                {description}
              </p>
            )}
          </div>

          {/* Icon */}
          {Icon && (
            <div
              className={cn(
                "rounded-full flex items-center justify-center",
                colorClass.icon,
                sizeClass.icon
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Specialized stat card variants
export function MetricCard(props: Omit<StatCardProps, "size">) {
  return <StatCard {...props} size="sm" />;
}

export function FeatureCard(props: Omit<StatCardProps, "size">) {
  return <StatCard {...props} size="lg" />;
}

// Grid container for stat cards
export interface StatCardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export function StatCardGrid({
  children,
  columns = 4,
  gap = "md",
  className,
}: StatCardGridProps) {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  const gapClasses = {
    sm: "gap-3",
    md: "gap-4",
    lg: "gap-6",
  };

  return (
    <div
      className={cn("grid", gridClasses[columns], gapClasses[gap], className)}
    >
      {children}
    </div>
  );
}
