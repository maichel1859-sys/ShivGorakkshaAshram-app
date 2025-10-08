/**
 * Unified Socket Event Emitter for Server Actions
 * 
 * This module provides a centralized way to emit socket events from Server Actions
 * after database commits. It ensures consistent event contracts and proper error handling.
 */

import { headers } from 'next/headers';
import { formatAppointmentTime, formatAppointmentDate } from '@/lib/utils/time-formatting';

// Socket server configuration
const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL || 'http://localhost:7077';

// Standardized event types
export enum SocketEventTypes {
  // Appointments
  APPOINTMENT_CREATED = 'appointment.created',
  APPOINTMENT_UPDATED = 'appointment.updated',
  APPOINTMENT_CANCELLED = 'appointment.cancelled',
  APPOINTMENT_RESCHEDULED = 'appointment.rescheduled',
  APPOINTMENT_CHECKED_IN = 'appointment.checked_in',
  APPOINTMENT_COMPLETED = 'appointment.completed',
  APPOINTMENT_REMINDER = 'appointment.reminder',
  
  // Queue
  QUEUE_ENTRY_ADDED = 'queue.entry_added',
  QUEUE_ENTRY_UPDATED = 'queue.entry_updated',
  QUEUE_ENTRY_REMOVED = 'queue.entry_removed',
  QUEUE_POSITION_UPDATED = 'queue.position_updated',
  
  // Consultations
  CONSULTATION_STARTED = 'consultation.started',
  CONSULTATION_ENDED = 'consultation.ended',
  CONSULTATION_UPDATED = 'consultation.updated',
  
  // Remedies
  REMEDY_PRESCRIBED = 'remedy.prescribed',
  REMEDY_UPDATED = 'remedy.updated',
  REMEDY_COMPLETED = 'remedy.completed',
  
  // Notifications
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_READ = 'notification.read',
  NOTIFICATION_DELETED = 'notification.deleted',
  
  // Users
  USER_REGISTERED = 'user.registered',
  USER_UPDATED = 'user.updated',
  USER_STATUS_CHANGED = 'user.status_changed',
  
  // Guruji
  GURUJI_AVAILABLE = 'guruji.available',
  GURUJI_BUSY = 'guruji.busy',
  GURUJI_OFFLINE = 'guruji.offline',
  GURUJI_SCHEDULE_UPDATED = 'guruji.schedule_updated',
  
  // System
  SYSTEM_MAINTENANCE = 'system.maintenance',
  SYSTEM_UPDATE = 'system.update',
  SYSTEM_ERROR = 'system.error',
  
  // Time synchronization
  SERVER_TIME_UPDATE = 'server.time_update'
}

// Room types for targeted broadcasting
export enum SocketRoomTypes {
  USER = 'user',
  GURUJI = 'guruji',
  ADMIN = 'admin',
  COORDINATOR = 'coordinator',
  APPOINTMENTS = 'appointments',
  QUEUE = 'queue',
  CONSULTATIONS = 'consultations',
  REMEDIES = 'remedies',
  NOTIFICATIONS = 'notifications',
  GLOBAL = 'global'
}

// Base event interface
export interface BaseSocketEvent {
  id: string;
  timestamp: number;
  userId?: string;
  gurujiId?: string;
  clinicId?: string;
  data: Record<string, unknown>;
}

// Specific event interfaces
export interface AppointmentSocketEvent extends BaseSocketEvent {
  type: SocketEventTypes.APPOINTMENT_CREATED | SocketEventTypes.APPOINTMENT_UPDATED | SocketEventTypes.APPOINTMENT_CANCELLED | SocketEventTypes.APPOINTMENT_RESCHEDULED | SocketEventTypes.APPOINTMENT_CHECKED_IN | SocketEventTypes.APPOINTMENT_COMPLETED | SocketEventTypes.APPOINTMENT_REMINDER;
  appointmentId: string;
  data: {
    id: string;
    userId: string;
    gurujiId: string;
    date: string; // Formatted date: "Jan 15, 2024"
    time: string; // Formatted time: "5:00 PM"
    status: string;
    reason?: string;
    priority: string;
    estimatedWait?: number;
    position?: number;
  };
}

export interface QueueSocketEvent extends BaseSocketEvent {
  type: SocketEventTypes.QUEUE_ENTRY_ADDED | SocketEventTypes.QUEUE_ENTRY_UPDATED | SocketEventTypes.QUEUE_ENTRY_REMOVED | SocketEventTypes.QUEUE_POSITION_UPDATED;
  queueId: string;
  data: {
    id: string;
    position: number;
    status: string;
    estimatedWait?: number;
    priority: string;
    appointmentId?: string;
  };
}

export interface ConsultationSocketEvent extends BaseSocketEvent {
  type: SocketEventTypes.CONSULTATION_STARTED | SocketEventTypes.CONSULTATION_ENDED | SocketEventTypes.CONSULTATION_UPDATED;
  consultationId: string;
  data: {
    id: string;
    startTime: string;
    endTime?: string;
    status: string;
    notes?: string;
    appointmentId?: string;
  };
}

export interface RemedySocketEvent extends BaseSocketEvent {
  type: SocketEventTypes.REMEDY_PRESCRIBED | SocketEventTypes.REMEDY_UPDATED | SocketEventTypes.REMEDY_COMPLETED;
  remedyId: string;
  data: {
    id: string;
    templateId: string;
    status: string;
    instructions: string;
    dosage?: string;
    duration?: string;
    appointmentId?: string;
  };
}

export interface NotificationSocketEvent extends BaseSocketEvent {
  type: SocketEventTypes.NOTIFICATION_SENT | SocketEventTypes.NOTIFICATION_READ | SocketEventTypes.NOTIFICATION_DELETED;
  notificationId: string;
  data: {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    userId?: string;
  };
}

export interface UserSocketEvent extends BaseSocketEvent {
  type: SocketEventTypes.USER_REGISTERED | SocketEventTypes.USER_UPDATED | SocketEventTypes.USER_STATUS_CHANGED;
  data: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
}

export interface GurujiSocketEvent extends BaseSocketEvent {
  type: SocketEventTypes.GURUJI_AVAILABLE | SocketEventTypes.GURUJI_BUSY | SocketEventTypes.GURUJI_OFFLINE | SocketEventTypes.GURUJI_SCHEDULE_UPDATED;
  data: {
    id: string;
    name: string;
    status: string;
    availability: string[];
    currentQueueLength: number;
  };
}

export interface SystemSocketEvent extends BaseSocketEvent {
  type: SocketEventTypes.SYSTEM_MAINTENANCE | SocketEventTypes.SYSTEM_UPDATE | SocketEventTypes.SYSTEM_ERROR;
  data: {
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    message: string;
    component: string;
    status: string;
  };
}

// Union type for all socket events
export type SocketEvent = 
  | AppointmentSocketEvent 
  | QueueSocketEvent 
  | ConsultationSocketEvent 
  | RemedySocketEvent 
  | NotificationSocketEvent 
  | UserSocketEvent 
  | GurujiSocketEvent 
  | SystemSocketEvent;

// Room configuration for different event types
const EVENT_ROOM_MAPPING: Record<string, string[]> = {
  [SocketEventTypes.APPOINTMENT_CREATED]: [SocketRoomTypes.APPOINTMENTS, SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  [SocketEventTypes.APPOINTMENT_UPDATED]: [SocketRoomTypes.APPOINTMENTS, SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  [SocketEventTypes.APPOINTMENT_CANCELLED]: [SocketRoomTypes.APPOINTMENTS, SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  [SocketEventTypes.APPOINTMENT_RESCHEDULED]: [SocketRoomTypes.APPOINTMENTS, SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  [SocketEventTypes.APPOINTMENT_CHECKED_IN]: [SocketRoomTypes.QUEUE, SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  [SocketEventTypes.APPOINTMENT_COMPLETED]: [SocketRoomTypes.QUEUE, SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  [SocketEventTypes.APPOINTMENT_REMINDER]: [SocketRoomTypes.NOTIFICATIONS],
  
  [SocketEventTypes.QUEUE_ENTRY_ADDED]: [SocketRoomTypes.QUEUE, SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  [SocketEventTypes.QUEUE_ENTRY_UPDATED]: [SocketRoomTypes.QUEUE, SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  [SocketEventTypes.QUEUE_ENTRY_REMOVED]: [SocketRoomTypes.QUEUE, SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  [SocketEventTypes.QUEUE_POSITION_UPDATED]: [SocketRoomTypes.QUEUE, SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  
  [SocketEventTypes.CONSULTATION_STARTED]: [SocketRoomTypes.CONSULTATIONS, SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  [SocketEventTypes.CONSULTATION_ENDED]: [SocketRoomTypes.CONSULTATIONS, SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  [SocketEventTypes.CONSULTATION_UPDATED]: [SocketRoomTypes.CONSULTATIONS, SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  
  [SocketEventTypes.REMEDY_PRESCRIBED]: [SocketRoomTypes.REMEDIES, SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  [SocketEventTypes.REMEDY_UPDATED]: [SocketRoomTypes.REMEDIES, SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  [SocketEventTypes.REMEDY_COMPLETED]: [SocketRoomTypes.REMEDIES, SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  
  [SocketEventTypes.NOTIFICATION_SENT]: [SocketRoomTypes.NOTIFICATIONS],
  [SocketEventTypes.NOTIFICATION_READ]: [SocketRoomTypes.NOTIFICATIONS],
  [SocketEventTypes.NOTIFICATION_DELETED]: [SocketRoomTypes.NOTIFICATIONS],
  
  [SocketEventTypes.USER_REGISTERED]: [SocketRoomTypes.ADMIN],
  [SocketEventTypes.USER_UPDATED]: [SocketRoomTypes.ADMIN],
  [SocketEventTypes.USER_STATUS_CHANGED]: [SocketRoomTypes.ADMIN],
  
  [SocketEventTypes.GURUJI_AVAILABLE]: [SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  [SocketEventTypes.GURUJI_BUSY]: [SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  [SocketEventTypes.GURUJI_OFFLINE]: [SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  [SocketEventTypes.GURUJI_SCHEDULE_UPDATED]: [SocketRoomTypes.ADMIN, SocketRoomTypes.COORDINATOR],
  
  [SocketEventTypes.SYSTEM_MAINTENANCE]: [SocketRoomTypes.GLOBAL],
  [SocketEventTypes.SYSTEM_UPDATE]: [SocketRoomTypes.GLOBAL],
  [SocketEventTypes.SYSTEM_ERROR]: [SocketRoomTypes.GLOBAL]
};

/**
 * Emit a socket event to the appropriate rooms
 * This function should be called after successful database commits in Server Actions
 */
export async function emitSocketEvent(
  event: SocketEvent,
  additionalRooms: string[] = []
): Promise<void> {
  try {
    // Get the base rooms for this event type
    const baseRooms = EVENT_ROOM_MAPPING[event.type] || [];
    
    // Combine base rooms with additional rooms
    const allRooms = [...new Set([...baseRooms, ...additionalRooms])];
    
    // Add user-specific rooms if userId is provided
    if (event.userId) {
      allRooms.push(`${SocketRoomTypes.USER}:${event.userId}`);
    }
    
    // Add guruji-specific rooms if gurujiId is provided
    if (event.gurujiId) {
      allRooms.push(`${SocketRoomTypes.GURUJI}:${event.gurujiId}`);
    }
    
    // Prepare the event payload
    const eventPayload = {
      ...event,
      timestamp: Date.now(),
      rooms: allRooms
    };
    
    // Emit to socket server
    const response = await fetch(`${SOCKET_SERVER_URL}/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Socket-Server': 'true'
      },
      body: JSON.stringify(eventPayload)
    });
    
    if (!response.ok) {
      console.error(`Failed to emit socket event: ${response.status} ${response.statusText}`);
    } else {
      console.log(`✅ Socket event emitted: ${event.type} to ${allRooms.length} rooms`);
    }
    
  } catch (error) {
    // Don't throw errors - socket failures shouldn't break the main flow
    console.error('❌ Failed to emit socket event:', error);
  }
}

/**
 * Emit appointment-related events
 */
export async function emitAppointmentEvent(
  type: SocketEventTypes.APPOINTMENT_CREATED | SocketEventTypes.APPOINTMENT_UPDATED | SocketEventTypes.APPOINTMENT_CANCELLED | SocketEventTypes.APPOINTMENT_RESCHEDULED | SocketEventTypes.APPOINTMENT_CHECKED_IN | SocketEventTypes.APPOINTMENT_COMPLETED | SocketEventTypes.APPOINTMENT_REMINDER,
  appointmentId: string,
  data: {
    id: string;
    userId: string;
    gurujiId: string;
    date: Date | string; // Raw date (Date object or ISO string)
    time: Date | string; // Raw time (Date object or ISO string)
    status: string;
    reason?: string;
    priority: string;
    estimatedWait?: number;
    position?: number;
  }
): Promise<void> {
  // Format the date and time consistently
  const formattedData = {
    ...data,
    date: formatAppointmentDate(data.date),
    time: formatAppointmentTime(data.time)
  };

  const event: AppointmentSocketEvent = {
    id: `appointment-${appointmentId}-${Date.now()}`,
    type,
    appointmentId,
    userId: data.userId,
    gurujiId: data.gurujiId,
    timestamp: Date.now(),
    data: formattedData
  };
  
  await emitSocketEvent(event);
}

/**
 * Emit queue-related events
 */
export async function emitQueueEvent(
  type: SocketEventTypes.QUEUE_ENTRY_ADDED | SocketEventTypes.QUEUE_ENTRY_UPDATED | SocketEventTypes.QUEUE_ENTRY_REMOVED | SocketEventTypes.QUEUE_POSITION_UPDATED,
  queueId: string,
  data: {
    id: string;
    position: number;
    status: string;
    estimatedWait?: number;
    priority: string;
    appointmentId?: string;
  },
  userId?: string,
  gurujiId?: string
): Promise<void> {
  const event: QueueSocketEvent = {
    id: `queue-${queueId}-${Date.now()}`,
    type,
    queueId,
    userId,
    gurujiId,
    timestamp: Date.now(),
    data
  };
  
  await emitSocketEvent(event);
}

/**
 * Emit consultation-related events
 */
export async function emitConsultationEvent(
  type: SocketEventTypes.CONSULTATION_STARTED | SocketEventTypes.CONSULTATION_ENDED | SocketEventTypes.CONSULTATION_UPDATED,
  consultationId: string,
  data: {
    id: string;
    startTime: string;
    endTime?: string;
    status: string;
    notes?: string;
    appointmentId?: string;
  },
  userId?: string,
  gurujiId?: string
): Promise<void> {
  const event: ConsultationSocketEvent = {
    id: `consultation-${consultationId}-${Date.now()}`,
    type,
    consultationId,
    userId,
    gurujiId,
    timestamp: Date.now(),
    data
  };
  
  await emitSocketEvent(event);
}

/**
 * Emit remedy-related events
 */
export async function emitRemedyEvent(
  type: SocketEventTypes.REMEDY_PRESCRIBED | SocketEventTypes.REMEDY_UPDATED | SocketEventTypes.REMEDY_COMPLETED,
  remedyId: string,
  data: {
    id: string;
    templateId: string;
    status: string;
    instructions: string;
    dosage?: string;
    duration?: string;
    appointmentId?: string;
  },
  userId?: string,
  gurujiId?: string
): Promise<void> {
  const event: RemedySocketEvent = {
    id: `remedy-${remedyId}-${Date.now()}`,
    type,
    remedyId,
    userId,
    gurujiId,
    timestamp: Date.now(),
    data
  };
  
  await emitSocketEvent(event);
}

/**
 * Emit notification-related events
 */
export async function emitNotificationEvent(
  type: SocketEventTypes.NOTIFICATION_SENT | SocketEventTypes.NOTIFICATION_READ | SocketEventTypes.NOTIFICATION_DELETED,
  notificationId: string,
  data: {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    userId?: string;
  }
): Promise<void> {
  const event: NotificationSocketEvent = {
    id: `notification-${notificationId}-${Date.now()}`,
    type,
    notificationId,
    userId: data.userId,
    timestamp: Date.now(),
    data
  };
  
  await emitSocketEvent(event);
}

/**
 * Emit user-related events
 */
export async function emitUserEvent(
  type: SocketEventTypes.USER_REGISTERED | SocketEventTypes.USER_UPDATED | SocketEventTypes.USER_STATUS_CHANGED,
  data: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  }
): Promise<void> {
  const event: UserSocketEvent = {
    id: `user-${data.id}-${Date.now()}`,
    type,
    userId: data.id,
    timestamp: Date.now(),
    data
  };
  
  await emitSocketEvent(event);
}

/**
 * Emit guruji-related events
 */
export async function emitGurujiEvent(
  type: SocketEventTypes.GURUJI_AVAILABLE | SocketEventTypes.GURUJI_BUSY | SocketEventTypes.GURUJI_OFFLINE | SocketEventTypes.GURUJI_SCHEDULE_UPDATED,
  data: {
    id: string;
    name: string;
    status: string;
    availability: string[];
    currentQueueLength: number;
  }
): Promise<void> {
  const event: GurujiSocketEvent = {
    id: `guruji-${data.id}-${Date.now()}`,
    type,
    gurujiId: data.id,
    timestamp: Date.now(),
    data
  };
  
  await emitSocketEvent(event);
}

/**
 * Emit system-related events
 */
export async function emitSystemEvent(
  type: SocketEventTypes.SYSTEM_MAINTENANCE | SocketEventTypes.SYSTEM_UPDATE | SocketEventTypes.SYSTEM_ERROR,
  data: {
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    message: string;
    component: string;
    status: string;
  }
): Promise<void> {
  const event: SystemSocketEvent = {
    id: `system-${Date.now()}`,
    type,
    timestamp: Date.now(),
    data
  };
  
  await emitSocketEvent(event);
}

/**
 * Helper function to get user context from headers (for Server Actions)
 */
export async function getUserContextFromHeaders(): Promise<{ userId?: string; role?: string }> {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const role = headersList.get('x-user-role');
    
    return {
      userId: userId || undefined,
      role: role || undefined
    };
  } catch (error) {
    console.error('Failed to get user context from headers:', error);
    return {};
  }
}
