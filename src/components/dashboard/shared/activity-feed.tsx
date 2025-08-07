"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils/helpers";
import {
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  ExternalLink,
  LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface ActivityItem {
  id: string;
  type: "appointment" | "consultation" | "remedy" | "user" | "system" | "queue";
  title: string;
  description?: string;
  timestamp: Date;
  status?: "success" | "warning" | "error" | "info";
  priority?: "low" | "medium" | "high" | "urgent";
  actor?: {
    id: string;
    name: string;
    role?: string;
    avatar?: string;
  };
  metadata?: Record<string, unknown>;
  actions?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost";
  }[];
}

export interface ActivityFeedProps {
  activities: ActivityItem[];
  title?: string;
  description?: string;
  maxHeight?: string;
  showActions?: boolean;
  showTimestamps?: boolean;
  showAvatars?: boolean;
  groupByDate?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
}

const typeIcons: Record<ActivityItem["type"], LucideIcon> = {
  appointment: Calendar,
  consultation: User,
  remedy: FileText,
  user: User,
  system: AlertCircle,
  queue: Clock,
};

const statusColors = {
  success: "text-green-600 bg-green-100",
  warning: "text-yellow-600 bg-yellow-100",
  error: "text-red-600 bg-red-100",
  info: "text-blue-600 bg-blue-100",
};

const priorityColors = {
  low: "border-gray-200",
  medium: "border-blue-200",
  high: "border-yellow-200",
  urgent: "border-red-200",
};

export function ActivityFeed({
  activities,
  title = "Recent Activity",
  description,
  maxHeight = "400px",
  showActions = true,
  showTimestamps = true,
  showAvatars = true,
  groupByDate = false,
  loading = false,
  emptyMessage = "No recent activity",
  onLoadMore,
  hasMore = false,
  className,
}: ActivityFeedProps) {
  const getActivityIcon = (
    type: ActivityItem["type"],
    status?: ActivityItem["status"]
  ) => {
    const IconComponent = typeIcons[type] || AlertCircle;

    if (status === "success") return CheckCircle;
    if (status === "error") return XCircle;
    if (status === "warning") return AlertCircle;

    return IconComponent;
  };

  const getTimeAgo = (timestamp: Date) => {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  const groupActivitiesByDate = (activities: ActivityItem[]) => {
    if (!groupByDate) return { today: activities };

    const groups: Record<string, ActivityItem[]> = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    activities.forEach((activity) => {
      const activityDate = new Date(activity.timestamp);
      let key = "older";

      if (activityDate.toDateString() === today.toDateString()) {
        key = "today";
      } else if (activityDate.toDateString() === yesterday.toDateString()) {
        key = "yesterday";
      } else if (
        activityDate > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      ) {
        key = "this-week";
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(activity);
    });

    return groups;
  };

  const renderActivity = (activity: ActivityItem) => {
    const Icon = getActivityIcon(activity.type, activity.status);

    return (
      <div
        key={activity.id}
        className={cn(
          "flex items-start space-x-3 py-3 border-l-2 pl-4",
          activity.priority
            ? priorityColors[activity.priority]
            : "border-gray-200"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            activity.status
              ? statusColors[activity.status]
              : "text-gray-600 bg-gray-100"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {activity.title}
              </p>

              {activity.description && (
                <p className="text-sm text-gray-600 mt-1">
                  {activity.description}
                </p>
              )}

              {/* Actor info */}
              {activity.actor && showAvatars && (
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <User className="h-3 w-3 mr-1" />
                  <span>{activity.actor.name}</span>
                  {activity.actor.role && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {activity.actor.role}
                    </Badge>
                  )}
                </div>
              )}

              {/* Timestamp */}
              {showTimestamps && (
                <p className="text-xs text-gray-500 mt-1">
                  {getTimeAgo(activity.timestamp)}
                </p>
              )}
            </div>

            {/* Actions */}
            {showActions && activity.actions && activity.actions.length > 0 && (
              <div className="flex items-center space-x-1 ml-4">
                {activity.actions.slice(0, 2).map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || "ghost"}
                    size="sm"
                    onClick={action.onClick}
                    className="h-7 text-xs"
                  >
                    {action.label}
                  </Button>
                ))}
                {activity.actions.length > 2 && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderLoadingState = () => (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start space-x-3 animate-pulse">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Clock className="h-12 w-12 text-gray-400 mb-4" />
      <p className="text-gray-500 text-sm">{emptyMessage}</p>
    </div>
  );

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="p-0">{renderLoadingState()}</CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{renderEmptyState()}</CardContent>
      </Card>
    );
  }

  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Button variant="ghost" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            View All
          </Button>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }}>
          <div className="px-6 pb-6">
            {groupByDate ? (
              Object.entries(groupedActivities).map(([dateGroup, items]) => (
                <div key={dateGroup} className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 capitalize">
                    {dateGroup.replace("-", " ")}
                  </h4>
                  <div className="space-y-1">{items.map(renderActivity)}</div>
                </div>
              ))
            ) : (
              <div className="space-y-1">{activities.map(renderActivity)}</div>
            )}

            {/* Load More Button */}
            {onLoadMore && hasMore && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLoadMore}
                  className="w-full"
                >
                  Load More Activities
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Specialized activity feed variants
export function AppointmentActivityFeed(
  props: Omit<ActivityFeedProps, "title">
) {
  return (
    <ActivityFeed
      {...props}
      title="Appointment Activity"
      description="Recent appointment-related activities"
    />
  );
}

export function SystemActivityFeed(props: Omit<ActivityFeedProps, "title">) {
  return (
    <ActivityFeed
      {...props}
      title="System Activity"
      description="System events and notifications"
    />
  );
}

export function UserActivityFeed(props: Omit<ActivityFeedProps, "title">) {
  return (
    <ActivityFeed
      {...props}
      title="User Activity"
      description="Recent user actions and events"
    />
  );
}
