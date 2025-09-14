"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils/helpers";
import {
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  X,
  ExternalLink,
  Clock,
  LucideIcon,
} from "lucide-react";

export interface AlertItem {
  id: string;
  type: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
  priority?: "low" | "medium" | "high" | "critical";
  timestamp?: Date;
  category?: string;
  dismissible?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
  actions?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost" | "destructive";
    icon?: LucideIcon;
  }[];
  metadata?: Record<string, unknown>;
}

export interface AlertCardProps {
  alerts: AlertItem[];
  title?: string;
  description?: string;
  maxHeight?: string;
  showTimestamps?: boolean;
  showCategories?: boolean;
  groupByType?: boolean;
  onDismiss?: (alertId: string) => void;
  onDismissAll?: () => void;
  emptyMessage?: string;
  className?: string;
}

const alertConfig = {
  success: {
    icon: CheckCircle,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    iconColor: "text-green-600",
    titleColor: "text-green-800",
    messageColor: "text-green-700",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    iconColor: "text-yellow-600",
    titleColor: "text-yellow-800",
    messageColor: "text-yellow-700",
  },
  error: {
    icon: XCircle,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconColor: "text-red-600",
    titleColor: "text-red-800",
    messageColor: "text-red-700",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
    titleColor: "text-blue-800",
    messageColor: "text-blue-700",
  },
};

const priorityColors = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-yellow-100 text-yellow-700",
  critical: "bg-red-100 text-red-700",
};

export function AlertCard({
  alerts,
  title = "System Alerts",
  description,
  maxHeight = "400px",
  showTimestamps = true,
  showCategories = true,
  groupByType = false,
  onDismiss,
  onDismissAll,
  emptyMessage = "No alerts at this time",
  className,
}: AlertCardProps) {
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - timestamp.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return timestamp.toLocaleDateString();
  };

  const groupAlertsByType = (alerts: AlertItem[]) => {
    if (!groupByType) return { all: alerts };

    return alerts.reduce(
      (groups, alert) => {
        const type = alert.type;
        if (!groups[type]) groups[type] = [];
        groups[type].push(alert);
        return groups;
      },
      {} as Record<string, AlertItem[]>
    );
  };

  const renderAlert = (alert: AlertItem) => {
    const config = alertConfig[alert.type];
    const Icon = config.icon;

    return (
      <div
        key={alert.id}
        className={cn(
          "relative rounded-lg border p-4 mb-3 transition-all duration-200",
          config.bgColor,
          config.borderColor
        )}
      >
        {/* Dismiss button */}
        {alert.dismissible && onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(alert.id)}
            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-60 hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </Button>
        )}

        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className={cn("flex-shrink-0 mt-0.5", config.iconColor)}>
            <Icon className="h-4 w-4" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center space-x-2">
                <h4 className={cn("text-sm font-medium", config.titleColor)}>
                  {alert.title}
                </h4>

                {/* Priority badge */}
                {alert.priority && (
                  <Badge
                    variant="secondary"
                    className={cn("text-xs", priorityColors[alert.priority])}
                  >
                    {alert.priority.toUpperCase()}
                  </Badge>
                )}

                {/* Category badge */}
                {showCategories && alert.category && (
                  <Badge variant="outline" className="text-xs">
                    {alert.category}
                  </Badge>
                )}
              </div>
            </div>

            {/* Message */}
            <p className={cn("text-sm mb-2", config.messageColor)}>
              {alert.message}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between">
              {/* Timestamp */}
              {showTimestamps && alert.timestamp && (
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTimestamp(alert.timestamp)}
                </div>
              )}

              {/* Actions */}
              {alert.actions && alert.actions.length > 0 && (
                <div className="flex items-center space-x-2">
                  {alert.actions.map((action, index) => {
                    const ActionIcon = action.icon;
                    return (
                      <Button
                        key={index}
                        variant={action.variant || "outline"}
                        size="sm"
                        onClick={action.onClick}
                        className="h-7 text-xs"
                      >
                        {ActionIcon && <ActionIcon className="h-3 w-3 mr-1" />}
                        {action.label}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
      <p className="text-gray-500 text-sm">{emptyMessage}</p>
    </div>
  );

  const groupedAlerts = groupAlertsByType(alerts);
  const hasAlerts = alerts.length > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>{title}</span>
              {hasAlerts && (
                <Badge variant="secondary" className="text-xs">
                  {alerts.length}
                </Badge>
              )}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>

          {/* Dismiss all button */}
          {hasAlerts && onDismissAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismissAll}
              className="text-gray-500 hover:text-gray-700"
            >
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!hasAlerts ? (
          renderEmptyState()
        ) : (
          <div style={{ maxHeight, overflowY: "auto" }}>
            {groupByType ? (
              Object.entries(groupedAlerts).map(([type, typeAlerts]) => (
                <div key={type} className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 capitalize">
                    {type} Alerts ({typeAlerts.length})
                  </h4>
                  <div>{typeAlerts.map(renderAlert)}</div>
                </div>
              ))
            ) : (
              <div>{alerts.map(renderAlert)}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Specialized alert card variants
export function SystemAlertsCard(props: Omit<AlertCardProps, "title">) {
  return (
    <AlertCard
      {...props}
      title="System Status"
      description="Important system notifications and alerts"
    />
  );
}

export function SecurityAlertsCard(props: Omit<AlertCardProps, "title">) {
  return (
    <AlertCard
      {...props}
      title="Security Alerts"
      description="Security-related notifications and warnings"
      groupByType={true}
    />
  );
}

export function AppointmentAlertsCard(props: Omit<AlertCardProps, "title">) {
  return (
    <AlertCard
      {...props}
      title="Appointment Alerts"
      description="Appointment-related notifications and reminders"
    />
  );
}

// Alert templates for common scenarios
export const ALERT_TEMPLATES = {
  SYSTEM_MAINTENANCE: (startTime: Date, duration: string): AlertItem => ({
    id: "maintenance-alert",
    type: "warning",
    title: "Scheduled Maintenance",
    message: `System maintenance is scheduled to begin at ${startTime.toLocaleTimeString()} and will last approximately ${duration}.`,
    priority: "high",
    timestamp: new Date(),
    category: "System",
    dismissible: false,
    actions: [
      {
        label: "Learn More",
        onClick: () => {},
        icon: ExternalLink,
      },
    ],
  }),

  LOW_STORAGE: (percentage: number): AlertItem => ({
    id: "storage-warning",
    type: "warning",
    title: "Low Storage Space",
    message: `System storage is ${percentage}% full. Consider cleaning up old files or expanding storage capacity.`,
    priority: "medium",
    timestamp: new Date(),
    category: "System",
    dismissible: true,
  }),

  FAILED_BACKUP: (lastSuccessful: Date): AlertItem => ({
    id: "backup-failed",
    type: "error",
    title: "Backup Failed",
    message: `The automated backup process failed. Last successful backup was on ${lastSuccessful.toLocaleDateString()}.`,
    priority: "critical",
    timestamp: new Date(),
    category: "Backup",
    dismissible: false,
    actions: [
      {
        label: "Retry Backup",
        onClick: () => {},
        variant: "default",
      },
      {
        label: "View Logs",
        onClick: () => {},
        variant: "outline",
      },
    ],
  }),

  APPOINTMENT_REMINDER: (devoteeName: string, time: string): AlertItem => ({
    id: "appointment-reminder",
    type: "info",
    title: "Upcoming Appointment",
    message: `${devoteeName} has an appointment scheduled for ${time}.`,
    priority: "medium",
    timestamp: new Date(),
    category: "Appointments",
    dismissible: true,
    autoHide: true,
    autoHideDelay: 10000,
  }),
};
