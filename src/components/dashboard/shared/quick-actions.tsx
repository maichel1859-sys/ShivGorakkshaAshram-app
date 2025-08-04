"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LucideIcon, Plus, ArrowRight } from 'lucide-react';

export interface QuickAction {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  onClick: () => void;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  disabled?: boolean;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  shortcut?: string;
}

export interface QuickActionsProps {
  title?: string;
  description?: string;
  actions: QuickAction[];
  layout?: 'grid' | 'list';
  columns?: 1 | 2 | 3 | 4;
  size?: 'sm' | 'md' | 'lg';
  showShortcuts?: boolean;
  className?: string;
}

const colorClasses = {
  blue: 'text-blue-600 bg-blue-100 hover:bg-blue-200',
  green: 'text-green-600 bg-green-100 hover:bg-green-200',
  yellow: 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200',
  red: 'text-red-600 bg-red-100 hover:bg-red-200',
  purple: 'text-purple-600 bg-purple-100 hover:bg-purple-200',
  gray: 'text-gray-600 bg-gray-100 hover:bg-gray-200',
};

const sizeClasses = {
  sm: {
    button: 'p-3 min-h-16',
    icon: 'h-4 w-4',
    title: 'text-sm font-medium',
    description: 'text-xs',
  },
  md: {
    button: 'p-4 min-h-20',
    icon: 'h-5 w-5',
    title: 'text-sm font-semibold',
    description: 'text-xs',
  },
  lg: {
    button: 'p-6 min-h-24',
    icon: 'h-6 w-6',
    title: 'text-base font-semibold',
    description: 'text-sm',
  },
};

export function QuickActions({
  title = "Quick Actions",
  description,
  actions,
  layout = 'grid',
  columns = 3,
  size = 'md',
  showShortcuts = true,
  className
}: QuickActionsProps) {
  const sizeClass = sizeClasses[size];

  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  const renderAction = (action: QuickAction) => {
    const Icon = action.icon;
    const colorClass = colorClasses[action.color || 'blue'];

    if (layout === 'list') {
      return (
        <Button
          key={action.id}
          variant="ghost"
          onClick={action.onClick}
          disabled={action.disabled}
          className={cn(
            'w-full justify-start h-auto p-4 border border-gray-200 hover:border-gray-300',
            action.disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className={cn(
            'rounded-lg p-2 mr-3',
            colorClass
          )}>
            <Icon className={sizeClass.icon} />
          </div>
          
          <div className="flex-1 text-left">
            <div className="flex items-center justify-between">
              <h3 className={sizeClass.title}>{action.title}</h3>
              {action.badge && (
                <Badge variant={action.badge.variant || 'secondary'} className="text-xs">
                  {action.badge.text}
                </Badge>
              )}
            </div>
            
            {action.description && (
              <p className={cn('text-muted-foreground mt-1', sizeClass.description)}>
                {action.description}
              </p>
            )}
            
            {showShortcuts && action.shortcut && (
              <p className="text-xs text-muted-foreground mt-1">
                {action.shortcut}
              </p>
            )}
          </div>
          
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Button>
      );
    }

    return (
      <Button
        key={action.id}
        variant="outline"
        onClick={action.onClick}
        disabled={action.disabled}
        className={cn(
          'h-auto flex flex-col items-center justify-center text-center relative group transition-all duration-200 hover:shadow-md',
          sizeClass.button,
          action.disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Badge */}
        {action.badge && (
          <Badge 
            variant={action.badge.variant || 'secondary'} 
            className="absolute -top-2 -right-2 text-xs"
          >
            {action.badge.text}
          </Badge>
        )}

        {/* Icon */}
        <div className={cn(
          'rounded-lg p-2 mb-2 transition-colors duration-200',
          colorClass
        )}>
          <Icon className={sizeClass.icon} />
        </div>

        {/* Content */}
        <div className="space-y-1">
          <h3 className={sizeClass.title}>{action.title}</h3>
          
          {action.description && (
            <p className={cn('text-muted-foreground', sizeClass.description)}>
              {action.description}
            </p>
          )}
          
          {showShortcuts && action.shortcut && (
            <p className="text-xs text-muted-foreground">
              {action.shortcut}
            </p>
          )}
        </div>
      </Button>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      
      <CardContent>
        <div className={cn(
          layout === 'grid' ? `grid gap-4 ${gridClasses[columns]}` : 'space-y-3'
        )}>
          {actions.map(renderAction)}
        </div>
      </CardContent>
    </Card>
  );
}

// Specialized quick action variants
export interface RoleBasedQuickActionsProps extends Omit<QuickActionsProps, 'actions'> {
  userRole: 'USER' | 'COORDINATOR' | 'GURUJI' | 'ADMIN';
  onBookAppointment: () => void;
  onViewQueue: () => void;
  onManageUsers?: () => void;
  onViewReports?: () => void;
  onSystemSettings?: () => void;
  onCreateRemedy?: () => void;
  onViewConsultations?: () => void;
}

export function RoleBasedQuickActions({
  userRole,
  onBookAppointment,
  onViewQueue,
  onManageUsers,
  onViewReports,
  onSystemSettings,
  onCreateRemedy,
  onViewConsultations,
  ...props
}: RoleBasedQuickActionsProps) {
  const getActionsForRole = (): QuickAction[] => {
    const baseActions: QuickAction[] = [
      {
        id: 'book-appointment',
        title: 'Book Appointment',
        description: 'Schedule a new consultation',
        icon: Plus,
        onClick: onBookAppointment,
        color: 'green',
        shortcut: 'Ctrl + N'
      },
      {
        id: 'view-queue',
        title: 'View Queue',
        description: 'Check current queue status',
        icon: Plus, // Replace with Queue icon
        onClick: onViewQueue,
        color: 'blue',
        shortcut: 'Ctrl + Q'
      }
    ];

    switch (userRole) {
      case 'ADMIN':
        return [
          ...baseActions,
          {
            id: 'manage-users',
            title: 'Manage Users',
            description: 'Add, edit, or remove users',
            icon: Plus, // Replace with Users icon
            onClick: onManageUsers!,
            color: 'purple',
            shortcut: 'Ctrl + U'
          },
          {
            id: 'view-reports',
            title: 'View Reports',
            description: 'Analytics and insights',
            icon: Plus, // Replace with BarChart icon
            onClick: onViewReports!,
            color: 'yellow',
            shortcut: 'Ctrl + R'
          },
          {
            id: 'system-settings',
            title: 'System Settings',
            description: 'Configure system preferences',
            icon: Plus, // Replace with Settings icon
            onClick: onSystemSettings!,
            color: 'gray',
            shortcut: 'Ctrl + S'
          }
        ];

      case 'COORDINATOR':
        return [
          ...baseActions,
          {
            id: 'manage-appointments',
            title: 'Manage Appointments',
            description: 'Handle bookings and schedules',
            icon: Plus, // Replace with Calendar icon
            onClick: onManageUsers!,
            color: 'blue'
          },
          {
            id: 'view-reports',
            title: 'View Reports',
            description: 'Daily activity reports',
            icon: Plus, // Replace with FileText icon
            onClick: onViewReports!,
            color: 'yellow'
          }
        ];

      case 'GURUJI':
        return [
          {
            id: 'view-consultations',
            title: 'My Consultations',
            description: 'Today\'s scheduled sessions',
            icon: Plus, // Replace with User icon
            onClick: onViewConsultations!,
            color: 'green'
          },
          {
            id: 'create-remedy',
            title: 'Create Remedy',
            description: 'Prescribe spiritual remedies',
            icon: Plus, // Replace with FileText icon
            onClick: onCreateRemedy!,
            color: 'purple'
          },
          {
            id: 'view-queue',
            title: 'Queue Status',
            description: 'Check waiting patients',
            icon: Plus, // Replace with Clock icon
            onClick: onViewQueue,
            color: 'blue'
          }
        ];

      case 'USER':
      default:
        return [
          {
            id: 'book-appointment',
            title: 'Book Appointment',
            description: 'Schedule your consultation',
            icon: Plus,
            onClick: onBookAppointment,
            color: 'green'
          },
          {
            id: 'my-appointments',
            title: 'My Appointments',
            description: 'View your bookings',
            icon: Plus, // Replace with Calendar icon
            onClick: onViewQueue,
            color: 'blue'
          }
        ];
    }
  };

  return (
    <QuickActions
      {...props}
      actions={getActionsForRole()}
      title={`${userRole.charAt(0) + userRole.slice(1).toLowerCase()} Actions`}
    />
  );
}

// Quick action templates for common scenarios
export const COMMON_ACTIONS = {
  BOOK_APPOINTMENT: (onClick: () => void): QuickAction => ({
    id: 'book-appointment',
    title: 'Book Appointment',
    description: 'Schedule a new consultation',
    icon: Plus,
    onClick,
    color: 'green',
    shortcut: 'Ctrl + N'
  }),

  VIEW_REPORTS: (onClick: () => void): QuickAction => ({
    id: 'view-reports',
    title: 'View Reports',
    description: 'Analytics and insights',
    icon: Plus, // Replace with BarChart icon
    onClick,
    color: 'yellow',
    shortcut: 'Ctrl + R'
  }),

  EMERGENCY_APPOINTMENT: (onClick: () => void): QuickAction => ({
    id: 'emergency-appointment',
    title: 'Emergency Booking',
    description: 'Urgent consultation needed',
    icon: Plus, // Replace with AlertTriangle icon
    onClick,
    color: 'red',
    badge: { text: 'Urgent', variant: 'destructive' }
  })
};