// Shared dashboard components exports
export * from './stat-card';
export * from './activity-feed';  
export * from './quick-actions';
export * from './alert-card';

// Re-export common types
export type { 
  StatCardProps, 
  StatCardGridProps 
} from './stat-card';

export type { 
  ActivityItem, 
  ActivityFeedProps 
} from './activity-feed';

export type { 
  QuickAction, 
  QuickActionsProps,
  RoleBasedQuickActionsProps 
} from './quick-actions';

export type { 
  AlertItem, 
  AlertCardProps 
} from './alert-card';

// Common dashboard utilities
export const DASHBOARD_COLORS = {
  blue: 'blue',
  green: 'green', 
  yellow: 'yellow',
  red: 'red',
  purple: 'purple',
  gray: 'gray'
} as const;

export const DASHBOARD_PRIORITIES = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'urgent',
  critical: 'critical'
} as const;

// Dashboard layout utilities
export interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

// Dashboard section wrapper
export interface DashboardSectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}