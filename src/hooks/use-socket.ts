"use client";

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import { useQueueStore } from '@/store/queue-store';
import { useNotificationStore } from '@/store/notification-store';
import { QueueData, AppointmentData, RemedyData } from '@/types/socket';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/socket';

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket() {
  const socketRef = useRef<SocketType | null>(null);
  const { user } = useAuthStore();
  const { setEntries, addEntry, updateEntry } = useQueueStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (!user) return;

    // Initialize socket connection
    socketRef.current = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      
      // Join user-specific room for notifications
      socket.emit('join-user', user.id);
      
      // Join role-specific rooms if needed
      if (user.role === 'ADMIN' || user.role === 'COORDINATOR') {
        socket.emit('join-admin');
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Queue-related events
    socket.on('queue-updated', (queueData) => {
      console.log('Queue updated:', queueData);
      // Transform QueueData to QueueEntry format
      const transformedEntries = queueData.map((data: QueueData & { userName?: string; gurujiName?: string; appointmentId?: string; priority?: string; estimatedWaitTime?: number; notes?: string }) => ({
        id: data.id,
        userId: data.userId,
        userName: data.userName || 'Unknown User',
        gurujiId: data.gurujiId,
        gurujiName: data.gurujiName || 'Unknown Guruji',
        appointmentId: data.appointmentId,
        status: (data.status as 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') || 'WAITING',
        priority: (data.priority as 'LOW' | 'MEDIUM' | 'HIGH') || 'MEDIUM',
        position: data.position,
        estimatedWaitTime: data.estimatedWaitTime,
        checkedInAt: data.checkedInAt,
        notes: data.notes
      }));
      setEntries(transformedEntries);
    });

    socket.on('patient-checked-in', (data) => {
      console.log('Patient checked in:', data);
      // Update queue if we're watching this guruji's queue
    });

    socket.on('checkin-confirmed', (data) => {
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
    socket.on('consultation-ready', (data) => {
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

    socket.on('consultation-completed', (data) => {
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

    socket.on('your-turn-next', (data) => {
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
    socket.on('appointment-confirmed', (appointmentData) => {
      console.log('Appointment confirmed:', appointmentData);
      addNotification({
        id: `appointment-confirmed-${Date.now()}`,
        title: 'Appointment Confirmed',
        message: `Your appointment has been scheduled`,
        type: 'appointment',
        priority: 'MEDIUM',
        isRead: false,
        createdAt: new Date().toISOString(),
        data: appointmentData as unknown as Record<string, unknown>
      });
    });

    // Remedy events
    socket.on('remedy-received', (remedyData) => {
      console.log('Remedy received:', remedyData);
      addNotification({
        id: `remedy-received-${Date.now()}`,
        title: 'Remedy Prescribed',
        message: 'You have received a new spiritual remedy',
        type: 'remedy',
        priority: 'MEDIUM',
        isRead: false,
        createdAt: new Date().toISOString(),
        data: remedyData as unknown as Record<string, unknown>
      });
    });

    // System announcements
    socket.on('announcement', (data) => {
      console.log('System announcement:', data);
      addNotification({
        id: `announcement-${Date.now()}`,
        title: 'System Announcement',
        message: data.message,
        type: 'system',
        priority: data.type === 'urgent' ? 'HIGH' : 'MEDIUM',
        isRead: false,
        createdAt: new Date().toISOString(),
        data: data
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
    socketRef.current?.emit('join-queue', gurujiId);
  };

  const leaveQueue = (gurujiId: string) => {
    socketRef.current?.emit('leave-queue', gurujiId);
  };

  const notifyPatientCheckin = (data: {
    gurujiId: string;
    patientId: string;
    queuePosition: number;
  }) => {
    socketRef.current?.emit('patient-checkin', data);
  };

  const notifyConsultationStart = (data: {
    gurujiId: string;
    patientId: string;
  }) => {
    socketRef.current?.emit('consultation-start', data);
  };

  const notifyConsultationEnd = (data: {
    gurujiId: string;
    patientId: string;
    nextPatientId?: string;
  }) => {
    socketRef.current?.emit('consultation-end', data);
  };

  const notifyAppointmentBooked = (data: {
    patientId: string;
    appointmentData: AppointmentData;
  }) => {
    socketRef.current?.emit('appointment-booked', data);
  };

  const notifyRemedyPrescribed = (data: {
    patientId: string;
    gurujiId: string;
    remedyData: RemedyData;
  }) => {
    socketRef.current?.emit('remedy-prescribed', data);
  };

  const sendSystemAnnouncement = (data: {
    message: string;
    type: 'info' | 'warning' | 'urgent';
    targetRoles?: string[];
  }) => {
    socketRef.current?.emit('system-announcement', data);
  };

  const updateQueuePosition = (data: {
    gurujiId: string;
    queueData: QueueData[];
  }) => {
    socketRef.current?.emit('update-queue-position', data);
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