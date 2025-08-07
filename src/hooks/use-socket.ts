"use client";

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

import { useQueueStore } from '@/store/queue-store';
import { useNotificationStore } from '@/store/notification-store';
import { QueueData, AppointmentData, RemedyData } from '@/types/socket';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/socket';
import { useSession } from 'next-auth/react';

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket() {
  const socketRef = useRef<SocketType | null>(null);
  const { data: session } = useSession();
  const user = session?.user;
  const { setEntries, addEntry, updateEntry } = useQueueStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (!user) return;

    // Initialize socket connection
    socketRef.current = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      
      // Join user-specific room for notifications
      socket.emit('join:user-room', { userId: user.id });
      
      // Join role-specific rooms if needed
      if (user.role === 'ADMIN' || user.role === 'COORDINATOR') {
        socket.emit('join:admin-room');
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

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

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user, setEntries, addEntry, updateEntry, addNotification]);

  // Socket utility functions
  const joinQueue = (gurujiId: string) => {
    socketRef.current?.emit('join:queue-room', { gurujiId });
  };

  const leaveQueue = (gurujiId: string) => {
    socketRef.current?.emit('leave:queue-room', { gurujiId });
  };

  const notifyPatientCheckin = (data: {
    gurujiId: string;
    patientId: string;
    queuePosition: number;
  }) => {
    socketRef.current?.emit('queue:checkin', { userId: data.patientId, gurujiId: data.gurujiId });
  };

  const notifyConsultationStart = (data: {
    gurujiId: string;
    patientId: string;
  }) => {
    socketRef.current?.emit('consultation:start', data);
  };

  const notifyConsultationEnd = (data: {
    gurujiId: string;
    patientId: string;
    nextPatientId?: string;
  }) => {
    socketRef.current?.emit('consultation:end', data);
  };

  const notifyAppointmentBooked = (data: {
    patientId: string;
    appointmentData: AppointmentData;
  }) => {
    socketRef.current?.emit('appointment:book', { userId: data.patientId, appointment: data.appointmentData });
  };

  const notifyRemedyPrescribed = (data: {
    patientId: string;
    gurujiId: string;
    remedyData: RemedyData;
  }) => {
    socketRef.current?.emit('remedy:prescribe', { patientId: data.patientId, gurujiId: data.gurujiId, remedy: data.remedyData });
  };

  const sendSystemAnnouncement = (data: {
    message: string;
    type: 'info' | 'warning' | 'urgent';
    targetRoles?: string[];
  }) => {
    socketRef.current?.emit('system:broadcast', data);
  };

  const updateQueuePosition = (data: {
    gurujiId: string;
    queueData: QueueData[];
  }) => {
    socketRef.current?.emit('queue:update-positions', data);
  };

  return {
    socket: socketRef.current,
    joinQueue,
    leaveQueue,
    notifyPatientCheckin,
    notifyConsultationStart,
    notifyConsultationEnd,
    notifyAppointmentBooked,
    notifyRemedyPrescribed,
    sendSystemAnnouncement,
    updateQueuePosition,
    isConnected: socketRef.current?.connected ?? false,
  };
}