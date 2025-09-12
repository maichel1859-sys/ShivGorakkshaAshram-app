/**
 * Unified Queue Type Definitions
 * Consolidates all queue-related interfaces to prevent duplication
 */

// Base queue entry interface used across the application
export interface QueueEntry {
  id: string;
  position: number;
  status: QueueStatus;
  estimatedWait?: number | null;
  priority?: QueuePriority;
  checkedInAt: string;
  notes?: string | null;
  user: {
    id: string;
    name: string | null;
    phone: string | null;
    email?: string | null;
    dateOfBirth?: string | null;
  };
  guruji?: {
    id: string;
    name: string | null;
  } | null;
  appointment?: {
    id: string;
    date: string;
    startTime: Date;
    endTime?: Date;
    reason: string | null;
  };
}

// Raw database queue entry (before transformation)
export interface QueueEntryFromDB {
  id: string;
  position: number | null;
  status: string;
  estimatedWait: number | null;
  priority: string | null;
  checkedInAt: Date | string;
  notes: string | null;
  user: {
    id: string;
    name: string | null;
    phone: string | null;
    email?: string | null;
    dateOfBirth: Date | string | null;
  };
  guruji?: {
    id: string;
    name: string | null;
  } | null;
  appointment?: {
    id: string;
    date: Date | string;
    startTime: Date;
    endTime?: Date;
    reason: string | null;
  };
}

// Queue status enum
export type QueueStatus = 
  | 'WAITING'
  | 'IN_PROGRESS' 
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CHECKED_IN'
  | 'NO_SHOW'
  | 'LATE_ARRIVAL';

// Queue priority levels
export type QueuePriority = 
  | 'LOW'
  | 'NORMAL'
  | 'HIGH' 
  | 'URGENT'
  | 'EMERGENCY';

// Queue statistics interface
export interface QueueStats {
  waiting: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  total: number;
  averageWaitTime: number;
}

// Queue filtering options
export interface QueueFilters {
  search?: string;
  status?: QueueStatus | 'all';
  priority?: QueuePriority | 'all';
  gurujiId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Queue action results
export interface QueueActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
  consultationSessionId?: string;
}

// Real-time queue events
export type QueueEvent = 
  | 'queue_updated'
  | 'entry_added'
  | 'entry_updated'
  | 'entry_removed'
  | 'consultation_started'
  | 'consultation_completed';

// Queue management capabilities by role
export interface QueuePermissions {
  canView: boolean;
  canModify: boolean;
  canStart: boolean;
  canComplete: boolean;
  canCancel: boolean;
  canAssignGuruji: boolean;
  canSetPriority: boolean;
  canPrescribeRemedy: boolean;
}

// Queue summary for dashboards
export interface QueueSummary {
  gurujiId?: string;
  gurujiName: string;
  waitingCount: number;
  inProgressCount: number;
  completedCount: number;
  averageWaitTime: number;
  nextEstimatedTime?: string;
}

// Offline queue entry for sync
export interface OfflineQueueEntry extends Omit<QueueEntry, 'id'> {
  localId: string;
  timestamp: string;
  action: 'create' | 'update' | 'delete';
  synced: boolean;
}