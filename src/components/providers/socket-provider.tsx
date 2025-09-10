"use client";

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { 
  connectToSocketServer, 
  subscribeToQueueEvents, 
  subscribeToNotificationEvents,
  getSocketConnectionStatus 
} from '@/lib/socket/socket-integration';

interface SocketContextType {
  isConnected: boolean;
  connectionStatus: {
    connected: boolean;
    socketId: string | null;
    reconnectAttempts: number;
  } | null;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  connectionStatus: null
});

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { data: session } = useSession();
  const connectionStatus = getSocketConnectionStatus();

  useEffect(() => {
    // Initialize socket connection
    const initSocket = async () => {
      try {
        const result = connectToSocketServer();
        if (result.success) {
          console.log('🔌 Socket.IO connected successfully');
        } else {
          console.warn('🔌 Socket.IO connection failed:', result.message);
        }
      } catch (error) {
        console.error('🔌 Socket.IO initialization error:', error);
      }
    };

    initSocket();
  }, []);

  useEffect(() => {
    // Subscribe to events when user is authenticated
    if (session?.user) {
      const userId = session.user.id;
      const role = session.user.role || 'USER';
      const gurujiId = role === 'GURUJI' ? userId : undefined;

      // Subscribe to queue events
      subscribeToQueueEvents(userId, role, gurujiId);
      
      // Subscribe to notification events
      subscribeToNotificationEvents(userId);

      console.log(`🔌 Subscribed to events for ${role}: ${userId}`);
    }
  }, [session]);

  return (
    <SocketContext.Provider value={{
      isConnected: connectionStatus.connected,
      connectionStatus
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
};

export default SocketProvider;
