"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

import { useQueueStore } from '@/store/queue-store';
import { useNotificationStore } from '@/store/notification-store';
import { QueueData, AppointmentData, RemedyData } from '@/types/socket';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/socket';
import { useSession } from 'next-auth/react';
import { socketClientManager } from '@/lib/communication/socket-manager';

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket() {
  const socketRef = useRef<SocketType | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { data: session } = useSession();
  const user = session?.user;
  const { setEntries, addEntry, updateEntry } = useQueueStore();
  const { addNotification } = useNotificationStore();

  // Connect to socket
  const connectSocket = useCallback(async () => {
    if (!user) return;

    try {
      setConnectionError(null);
      
      const authData = {
        userId: user.id,
        role: user.role,
        token: 'dev-token' // In production, get from session properly
      };

      const socket = await socketClientManager.connect(authData);
      socketRef.current = socket;
      setIsConnected(true);
      
      console.log('Socket connected successfully:', socket.id);
    } catch (error) {
      console.error('Socket connection failed:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setIsConnected(false);
    }
  }, [user, session]);

  // Disconnect socket
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
    socketClientManager.disconnect();
  }, []);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      return;
    }

    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, [user, connectSocket, disconnectSocket]);

  // Setup event listeners
  useEffect(() => {
    if (!socketRef.current || !user) return;

    const socket = socketRef.current;

    // Queue-related events
    socket.on('queue:updated', (data) => {
      console.log('Queue updated:', data);
      // Transform QueueData to QueueEntry format
      const transformedEntries = data.queueData.map((queueData: QueueData) => ({
        id: queueData.id,
        userId: queueData.userId,
        userName: queueData.userName || 'Unknown User',
        gurujiId: queueData.gurujiId,
        gurujiName: queueData.gurujiName || 'Unknown Guruji',
        appointmentId: queueData.appointmentId,
        status: queueData.status,
        priority: queueData.priority,
        position: queueData.position,
        estimatedWaitTime: queueData.estimatedWaitTime,
        checkedInAt: queueData.checkedInAt,
        notes: queueData.notes
      }));
      setEntries(transformedEntries);
    });

    socket.on('checkin:success', (data) => {
      console.log('Check-in confirmed:', data);
      addNotification({
        id: `checkin-${Date.now()}`,
        title: 'Check-in Successful',
        message: `You are position ${data.position} in the queue`,
        type: 'queue',
        priority: 'MEDIUM',
        isRead: false,
        createdAt: new Date().toISOString(),
        data: data
      });
    });

    // Consultation events
    socket.on('consultation:ready', (data) => {
      console.log('Consultation ready:', data);
      addNotification({
        id: `consultation-ready-${Date.now()}`,
        title: 'Your Turn!',
        message: 'Please proceed to the consultation room',
        type: 'queue',
        priority: 'HIGH',
        isRead: false,
        createdAt: new Date().toISOString(),
        data: data
      });
    });

    socket.on('consultation:completed', (data) => {
      console.log('Consultation completed:', data);
      addNotification({
        id: `consultation-completed-${Date.now()}`,
        title: 'Consultation Complete',
        message: 'Thank you for visiting. Om Shanti 🙏',
        type: 'system',
        priority: 'LOW',
        isRead: false,
        createdAt: new Date().toISOString(),
        data: data
      });
    });

    socket.on('consultation:next-patient', (data) => {
      console.log('Your turn next:', data);
      addNotification({
        id: `turn-next-${Date.now()}`,
        title: 'You\'re Next!',
        message: 'Please get ready, you will be called soon',
        type: 'queue',
        priority: 'HIGH',
        isRead: false,
        createdAt: new Date().toISOString(),
        data: data
      });
    });

    // Appointment events
    socket.on('appointment:confirmed', (data) => {
      console.log('Appointment confirmed:', data);
      addNotification({
        id: `appointment-confirmed-${Date.now()}`,
        title: 'Appointment Confirmed',
        message: `Your appointment has been scheduled`,
        type: 'appointment',
        priority: 'MEDIUM',
        isRead: false,
        createdAt: new Date().toISOString(),
        data: data.appointment as unknown as Record<string, unknown>
      });
    });

    // Remedy events
    socket.on('remedy:prescribed', (data) => {
      console.log('Remedy received:', data);
      addNotification({
        id: `remedy-received-${Date.now()}`,
        title: 'Remedy Prescribed',
        message: 'You have received a new spiritual remedy',
        type: 'remedy',
        priority: 'MEDIUM',
        isRead: false,
        createdAt: new Date().toISOString(),
        data: data.remedy as unknown as Record<string, unknown>
      });
    });

    // System announcements
    socket.on('system:announcement', (data) => {
      console.log('System announcement:', data);
      addNotification({
        id: `announcement-${Date.now()}`,
        title: 'System Announcement',
        message: data.message,
        type: 'system',
        priority: data.type === 'urgent' ? 'HIGH' : 'MEDIUM',
        isRead: false,
        createdAt: new Date().toISOString(),
        data: data as unknown as Record<string, unknown>
      });
    });

    // Connection status events
    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      setConnectionError(error.message);
    });

    return () => {
      socket.off('queue:updated');
      socket.off('checkin:success');
      socket.off('consultation:ready');
      socket.off('consultation:completed');
      socket.off('consultation:next-patient');
      socket.off('appointment:confirmed');
      socket.off('remedy:prescribed');
      socket.off('system:announcement');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, [user, setEntries, addEntry, updateEntry, addNotification]);

  // Socket utility functions
  const joinQueue = useCallback((gurujiId: string) => {
    socketClientManager.joinQueueRoom(gurujiId);
  }, []);

  const leaveQueue = useCallback((gurujiId: string) => {
    socketClientManager.leaveQueueRoom(gurujiId);
  }, []);

  const notifyPatientCheckin = useCallback((data: {
    gurujiId: string;
    patientId: string;
    queuePosition: number;
  }) => {
    socketClientManager.checkIn({ userId: data.patientId, gurujiId: data.gurujiId });
  }, []);

  const notifyConsultationStart = useCallback((data: {
    gurujiId: string;
    patientId: string;
  }) => {
    socketClientManager.startConsultation(data);
  }, []);

  const notifyConsultationEnd = useCallback((data: {
    gurujiId: string;
    patientId: string;
    nextPatientId?: string;
  }) => {
    socketClientManager.endConsultation(data);
  }, []);

  const notifyAppointmentBooked = useCallback((data: {
    patientId: string;
    appointmentData: AppointmentData;
  }) => {
    socketClientManager.bookAppointment({ userId: data.patientId, appointment: data.appointmentData });
  }, []);

  const notifyRemedyPrescribed = useCallback((data: {
    patientId: string;
    gurujiId: string;
    remedyData: RemedyData;
  }) => {
    socketClientManager.prescribeRemedy({ patientId: data.patientId, gurujiId: data.gurujiId, remedy: data.remedyData });
  }, []);

  const sendSystemAnnouncement = useCallback((data: {
    message: string;
    type: 'info' | 'warning' | 'urgent';
    targetRoles?: string[];
  }) => {
    socketClientManager.getSocket()?.emit('system:broadcast', data);
  }, []);

  const updateQueuePosition = useCallback((data: {
    gurujiId: string;
    queueData: QueueData[];
  }) => {
    socketClientManager.updateQueuePositions(data);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    joinQueue,
    leaveQueue,
    notifyPatientCheckin,
    notifyConsultationStart,
    notifyConsultationEnd,
    notifyAppointmentBooked,
    notifyRemedyPrescribed,
    sendSystemAnnouncement,
    updateQueuePosition,
    connectSocket,
    disconnectSocket,
  };
}