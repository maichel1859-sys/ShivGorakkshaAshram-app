"use client";

import { useEffect } from 'react';
import { useSocket } from '@/lib/socket/socket-client';
import { SocketEvents } from '@/lib/socket/socket-client';
import { startTimeSync, stopTimeSync, syncTimeFromSocket } from '@/store/time-store';

interface TimeProviderProps {
  children: React.ReactNode;
}

export function TimeProvider({ children }: TimeProviderProps) {
  const { socket } = useSocket();

  useEffect(() => {
    // Start local time synchronization
    startTimeSync();

    // Listen for server time updates via socket
    const handleServerTimeUpdate = (...args: unknown[]) => {
      const data = args[0] as { serverTime: string | number };
      console.log('🕐 Received server time update:', data.serverTime);
      syncTimeFromSocket(data.serverTime);
    };

    // Listen for appointment time updates
    const handleAppointmentTimeUpdate = (...args: unknown[]) => {
      const data = args[0] as { timestamp?: string | number };
      // Sync time when appointment events occur
      if (data.timestamp) {
        syncTimeFromSocket(data.timestamp);
      }
    };

    if (socket) {
      socket.on(SocketEvents.SERVER_TIME_UPDATE, handleServerTimeUpdate);
      socket.on(SocketEvents.APPOINTMENT_UPDATE, handleAppointmentTimeUpdate);
      socket.on(SocketEvents.QUEUE_UPDATED, handleAppointmentTimeUpdate);
    }

    // Cleanup
    return () => {
      stopTimeSync();
      if (socket) {
        socket.off(SocketEvents.SERVER_TIME_UPDATE, handleServerTimeUpdate);
        socket.off(SocketEvents.APPOINTMENT_UPDATE, handleAppointmentTimeUpdate);
        socket.off(SocketEvents.QUEUE_UPDATED, handleAppointmentTimeUpdate);
      }
    };
  }, [socket]);

  return <>{children}</>;
}