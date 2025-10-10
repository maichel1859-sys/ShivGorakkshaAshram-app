"use client";
import { logger } from '@/lib/utils/logger';

import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

// Socket.IO server URL from environment variable
const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'https://ashram-queue-socket-server.onrender.com';

// Event types matching your server
export enum SocketEvents {
  // Client -> Server events
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  SUBSCRIBE_TO_EVENTS = 'subscribe_to_events',
  UNSUBSCRIBE_FROM_EVENTS = 'unsubscribe_from_events',
  REQUEST_UPDATE = 'request_update',
  REQUEST_QUEUE_UPDATE = 'request_queue_update',
  REQUEST_USER_QUEUE_STATUS = 'request_user_queue_status',
  REQUEST_GURUJI_QUEUE = 'request_guruji_queue',
  
  // Server -> Client events
  EVENT_BROADCAST = 'event_broadcast',
  QUEUE_UPDATED = 'queue_updated',
  USER_QUEUE_STATUS = 'user_queue_status',
  GURUJI_QUEUE_UPDATED = 'guruji_queue_updated',
  QUEUE_ENTRY_UPDATED = 'queue_entry_updated',
  QUEUE_ENTRY_ADDED = 'queue_entry_added',
  QUEUE_ENTRY_REMOVED = 'queue_entry_removed',
  QUEUE_POSITION_UPDATED = 'queue_position_updated',
  APPOINTMENT_UPDATE = 'appointment_update',
  CONSULTATION_UPDATE = 'consultation_update',
  REMEDY_UPDATE = 'remedy_update',
  REMEDY_PRESCRIBED = 'remedy_prescribed',
  REMEDY_STATUS_UPDATED = 'remedy_status_updated',
  NOTIFICATION_UPDATE = 'notification_update',
  NOTIFICATION_SENT = 'notification_sent',
  USER_UPDATE = 'user_update',
  GURUJI_UPDATE = 'guruji_update',
  CLINIC_UPDATE = 'clinic_update',
  PAYMENT_UPDATE = 'payment_update',
  EMERGENCY_UPDATE = 'emergency_update',
  SYSTEM_UPDATE = 'system_update',
  DASHBOARD_UPDATE = 'dashboard_update',
  SERVER_TIME_UPDATE = 'server_time_update',
  ERROR = 'error'
}

// Room types
export enum RoomTypes {
  USER = 'user',
  GURUJI = 'guruji',
  ADMIN = 'admin',
  COORDINATOR = 'coordinator',
  APPOINTMENTS = 'appointments',
  QUEUE = 'queue',
  CONSULTATIONS = 'consultations',
  REMEDIES = 'remedies',
  NOTIFICATIONS = 'notifications',
  PAYMENTS = 'payments',
  EMERGENCIES = 'emergencies',
  CLINIC = 'clinic',
  GLOBAL = 'global',
  SYSTEM = 'system'
}

// Event subscription interface
export interface EventSubscription {
  userId: string;
  events: string[];
  rooms: string[];
  filters?: Record<string, unknown>;
}

// Socket client class
class SocketClient {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_SERVER_URL, {
      path: '/socket.io',
      transports: ['websocket'], // Prefer websocket for better performance
      timeout: 10000, // Reduced timeout for faster connection
      forceNew: false, // Reuse connections when possible
      // Performance optimizations
      upgrade: true,
      rememberUpgrade: true,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      logger.log('CONNECTED TO SOCKET SERVER');
      logger.log(`   Server: ${SOCKET_SERVER_URL}`);
      logger.log(`   Socket ID: ${this.socket?.id}`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason: string) => {
      logger.log('DISCONNECTED FROM SOCKET SERVER');
      logger.log(`   Server: ${SOCKET_SERVER_URL}`);
      logger.log(`   Reason: ${reason}`);
      this.isConnected = false;
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error: Error) => {
      logger.error('SOCKET CONNECTION ERROR');
      logger.error(`   Server: ${SOCKET_SERVER_URL}`);
      logger.error('   Error:', error.message);
      this.handleReconnect();
    });

    this.socket.on(SocketEvents.ERROR, (error: unknown) => {
      logger.error('🔌 Socket.IO error:', error);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('🔌 Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    logger.log(`Attempting to reconnect in ${delay} ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Join room based on user role
  joinRoom(userId: string, role: string, gurujiId?: string) {
    if (!this.socket?.connected) {
      logger.warn('🔌 Socket not connected, cannot join room');
      return;
    }

    const roomData: { role: string; userId?: string; gurujiId?: string } = { role };
    
    if (role === 'USER') {
      roomData.userId = userId;
    } else if (role === 'GURUJI') {
      roomData.gurujiId = gurujiId || userId;
    }

    this.socket.emit(SocketEvents.JOIN_ROOM, roomData);

    // Role-specific console logging with emojis
    switch (role) {
      case 'USER':
        logger.log(`🔵 USER DASHBOARD: Joining socket rooms for user ${userId}`);
        break;
      case 'GURUJI':
        logger.log(`🟢 GURUJI DASHBOARD: Joining socket rooms for guruji ${gurujiId || userId}`);
        break;
      case 'ADMIN':
        logger.log(`🔴 ADMIN DASHBOARD: Joining socket rooms with full access`);
        break;
      case 'COORDINATOR':
        logger.log(`🟡 COORDINATOR DASHBOARD: Joining socket rooms with coordinator access`);
        break;
      default:
        logger.log(`🔌 ${role} DASHBOARD: Joining socket rooms`, roomData);
    }
  }

  // Leave room
  leaveRoom(userId: string, role: string, gurujiId?: string) {
    if (!this.socket?.connected) return;

    const roomData: { role: string; userId?: string; gurujiId?: string } = { role };
    
    if (role === 'USER') {
      roomData.userId = userId;
    } else if (role === 'GURUJI') {
      roomData.gurujiId = gurujiId || userId;
    }

    this.socket.emit(SocketEvents.LEAVE_ROOM, roomData);

    // Role-specific leave logging with emojis
    switch (role) {
      case 'USER':
        logger.log(`🔵 USER DASHBOARD: Leaving socket rooms for user ${userId}`);
        break;
      case 'GURUJI':
        logger.log(`🟢 GURUJI DASHBOARD: Leaving socket rooms for guruji ${gurujiId || userId}`);
        break;
      case 'ADMIN':
        logger.log(`🔴 ADMIN DASHBOARD: Leaving socket rooms`);
        break;
      case 'COORDINATOR':
        logger.log(`🟡 COORDINATOR DASHBOARD: Leaving socket rooms`);
        break;
      default:
        logger.log(`🔌 ${role} DASHBOARD: Leaving socket rooms`, roomData);
    }
  }

  // Subscribe to specific events
  subscribeToEvents(subscription: EventSubscription) {
    if (!this.socket?.connected) {
      logger.warn('🔌 Socket not connected, cannot subscribe to events');
      return;
    }

    this.socket.emit(SocketEvents.SUBSCRIBE_TO_EVENTS, subscription);
    logger.log('🔌 Subscribed to events:', subscription);
  }

  // Unsubscribe from events
  unsubscribeFromEvents(subscription: EventSubscription) {
    if (!this.socket?.connected) return;

    this.socket.emit(SocketEvents.UNSUBSCRIBE_FROM_EVENTS, subscription);
    logger.log('🔌 Unsubscribed from events:', subscription);
  }

  // Request queue update
  requestQueueUpdate() {
    if (!this.socket?.connected) return;

    this.socket.emit(SocketEvents.REQUEST_QUEUE_UPDATE);
    logger.log('🔌 Requested queue update');
  }

  // Request user queue status
  requestUserQueueStatus(userId: string) {
    if (!this.socket?.connected) return;

    this.socket.emit(SocketEvents.REQUEST_USER_QUEUE_STATUS, { userId });
    logger.log('🔌 Requested user queue status for:', userId);
  }

  // Request guruji queue
  requestGurujiQueue(gurujiId: string) {
    if (!this.socket?.connected) return;

    this.socket.emit(SocketEvents.REQUEST_GURUJI_QUEUE, { gurujiId });
    logger.log('🔌 Requested guruji queue for:', gurujiId);
  }

  // Add event listener
  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this.socket) return;

    this.socket.on(event, callback);
  }

  // Remove event listener
  off(event: string, callback?: (...args: unknown[]) => void) {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.removeAllListeners(event);
    }
  }

  // Emit event
  emit(event: string, data?: unknown) {
    if (!this.socket?.connected) {
      logger.warn('🔌 Socket not connected, cannot emit event:', event);
      return;
    }

    this.socket.emit(event, data);
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// Singleton instance
let socketClient: SocketClient | null = null;

export const getSocketClient = (): SocketClient => {
  if (!socketClient) {
    socketClient = new SocketClient();
  }
  return socketClient;
};

// React hook for Socket.IO
export const useSocket = () => {
  const { data: session } = useSession();
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    socketId: null as string | null,
    reconnectAttempts: 0
  });

  useEffect(() => {
    const socket = getSocketClient();
    
    // Update connection status
    const updateStatus = () => {
      setConnectionStatus(socket.getConnectionStatus());
    };

    // Listen for connection changes
    socket.on('connect', updateStatus);
    socket.on('disconnect', updateStatus);

    // Auto-join room when user is authenticated
    if (session?.user) {
      const role = session.user.role || 'USER';
      const userId = session.user.id;
      const gurujiId = role === 'GURUJI' ? userId : undefined;

      socket.joinRoom(userId, role, gurujiId);

      // Subscribe to relevant events based on role
      const events = getEventsForRole(role);
      const rooms = getRoomsForRole(role, userId, gurujiId);

      socket.subscribeToEvents({
        userId,
        events,
        rooms
      });
    }

    return () => {
      socket.off('connect', updateStatus);
      socket.off('disconnect', updateStatus);
    };
  }, [session]);

  return {
    socket: getSocketClient(),
    connectionStatus
  };
};

// Get events for user role
function getEventsForRole(role: string): string[] {
  const baseEvents = [
    SocketEvents.QUEUE_UPDATED,
    SocketEvents.NOTIFICATION_UPDATE,
    SocketEvents.SYSTEM_UPDATE
  ];

  switch (role) {
    case 'USER':
      return [
        ...baseEvents,
        SocketEvents.APPOINTMENT_UPDATE,
        SocketEvents.CONSULTATION_UPDATE,
        SocketEvents.REMEDY_UPDATE,
        SocketEvents.USER_QUEUE_STATUS,
        SocketEvents.QUEUE_POSITION_UPDATED
      ];
    
    case 'GURUJI':
      return [
        ...baseEvents,
        SocketEvents.APPOINTMENT_UPDATE,
        SocketEvents.CONSULTATION_UPDATE,
        SocketEvents.REMEDY_UPDATE,
        SocketEvents.GURUJI_QUEUE_UPDATED,
        SocketEvents.QUEUE_ENTRY_ADDED,
        SocketEvents.QUEUE_ENTRY_UPDATED,
        SocketEvents.QUEUE_ENTRY_REMOVED
      ];
    
    case 'ADMIN':
    case 'COORDINATOR':
      return [
        ...baseEvents,
        SocketEvents.APPOINTMENT_UPDATE,
        SocketEvents.CONSULTATION_UPDATE,
        SocketEvents.REMEDY_UPDATE,
        SocketEvents.USER_UPDATE,
        SocketEvents.GURUJI_UPDATE,
        SocketEvents.CLINIC_UPDATE,
        SocketEvents.PAYMENT_UPDATE,
        SocketEvents.EMERGENCY_UPDATE,
        SocketEvents.QUEUE_ENTRY_ADDED,
        SocketEvents.QUEUE_ENTRY_UPDATED,
        SocketEvents.QUEUE_ENTRY_REMOVED,
        SocketEvents.QUEUE_POSITION_UPDATED
      ];
    
    default:
      return baseEvents;
  }
}

// Get rooms for user role
function getRoomsForRole(role: string, userId: string, gurujiId?: string): string[] {
  const baseRooms = [RoomTypes.QUEUE, RoomTypes.NOTIFICATIONS, RoomTypes.SYSTEM];

  switch (role) {
    case 'USER':
      return [
        ...baseRooms,
        `${RoomTypes.USER}:${userId}`,
        RoomTypes.APPOINTMENTS,
        RoomTypes.CONSULTATIONS,
        RoomTypes.REMEDIES
      ];
    
    case 'GURUJI':
      return [
        ...baseRooms,
        `${RoomTypes.GURUJI}:${gurujiId || userId}`,
        RoomTypes.APPOINTMENTS,
        RoomTypes.CONSULTATIONS,
        RoomTypes.REMEDIES
      ];
    
    case 'ADMIN':
    case 'COORDINATOR':
      return [
        ...baseRooms,
        RoomTypes.ADMIN,
        RoomTypes.APPOINTMENTS,
        RoomTypes.CONSULTATIONS,
        RoomTypes.REMEDIES,
        RoomTypes.USER,
        RoomTypes.GURUJI,
        RoomTypes.CLINIC,
        RoomTypes.PAYMENTS,
        RoomTypes.EMERGENCIES
      ];
    
    default:
      return baseRooms;
  }
}

export default getSocketClient;



