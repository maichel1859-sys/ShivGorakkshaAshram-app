import { Badge } from "@/components/ui/badge";
import {
  getStatusColor,
  getPriorityColor,
  getTypeColor,
  getNotificationTypeColor,
  getNotificationPriorityColor,
} from "@/lib/utils/colors";

interface StatusBadgeProps {
  value: string;
  type:
    | "status"
    | "priority"
    | "type"
    | "notification-type"
    | "notification-priority";
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}

export function StatusBadge({
  value,
  type,
  variant = "default",
  className = "",
}: StatusBadgeProps) {
  const getColorClass = () => {
    switch (type) {
      case "status":
        return getStatusColor(value);
      case "priority":
        return getPriorityColor(value);
      case "type":
        return getTypeColor(value);
      case "notification-type":
        return getNotificationTypeColor(value);
      case "notification-priority":
        return getNotificationPriorityColor(value);
      default:
        return "";
    }
  };

  return (
    <Badge variant={variant} className={`${getColorClass()} ${className}`}>
      {value}
    </Badge>
  );
}
