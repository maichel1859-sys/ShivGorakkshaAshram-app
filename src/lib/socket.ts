import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Singleton instance
  private static instance: SocketManager;

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  // Initialize socket connection
  connect(userId?: string, token?: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    
    this.socket = io(socketUrl, {
      auth: {
        token,
        userId
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 20000
    });

    this.setupEventListeners();
    return this.socket;
  }

  // Setup event listeners
  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });
  }

  // Join user to their personal room
  joinUserRoom(userId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join-user-room', { userId });
    }
  }

  // Join queue room for real-time updates
  joinQueueRoom() {
    if (this.socket?.connected) {
      this.socket.emit('join-queue-room');
    }
  }

  // Join admin room for admin notifications
  joinAdminRoom() {
    if (this.socket?.connected) {
      this.socket.emit('join-admin-room');
    }
  }

  // Listen for queue updates
  onQueueUpdate(callback: (data: unknown) => void) {
    if (this.socket) {
      this.socket.on('queue-update', callback);
    }
  }

  // Listen for appointment updates
  onAppointmentUpdate(callback: (data: unknown) => void) {
    if (this.socket) {
      this.socket.on('appointment-update', callback);
    }
  }

  // Listen for notifications
  onNotification(callback: (data: unknown) => void) {
    if (this.socket) {
      this.socket.on('notification', callback);
    }
  }

  // Listen for system alerts
  onSystemAlert(callback: (data: unknown) => void) {
    if (this.socket) {
      this.socket.on('system-alert', callback);
    }
  }

  // Emit check-in event
  emitCheckIn(appointmentId: string) {
    if (this.socket?.connected) {
      this.socket.emit('check-in', { appointmentId });
    }
  }

  // Emit queue position request
  requestQueuePosition() {
    if (this.socket?.connected) {
      this.socket.emit('request-queue-position');
    }
  }

  // Emit consultation start
  emitConsultationStart(appointmentId: string) {
    if (this.socket?.connected) {
      this.socket.emit('consultation-start', { appointmentId });
    }
  }

  // Emit consultation end
  emitConsultationEnd(appointmentId: string) {
    if (this.socket?.connected) {
      this.socket.emit('consultation-end', { appointmentId });
    }
  }

  // Remove event listeners
  off(event: string) {
    if (this.socket) {
      this.socket.off(event);
    }
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Get socket instance
  getSocket(): Socket | null {
    return this.socket;
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const socketManager = SocketManager.getInstance();

// Hook for using socket in components
export function useSocket() {
  return {
    connect: socketManager.connect.bind(socketManager),
    disconnect: socketManager.disconnect.bind(socketManager),
    isConnected: socketManager.isConnected.bind(socketManager),
    getSocket: socketManager.getSocket.bind(socketManager),
    joinUserRoom: socketManager.joinUserRoom.bind(socketManager),
    joinQueueRoom: socketManager.joinQueueRoom.bind(socketManager),
    joinAdminRoom: socketManager.joinAdminRoom.bind(socketManager),
    onQueueUpdate: socketManager.onQueueUpdate.bind(socketManager),
    onAppointmentUpdate: socketManager.onAppointmentUpdate.bind(socketManager),
    onNotification: socketManager.onNotification.bind(socketManager),
    onSystemAlert: socketManager.onSystemAlert.bind(socketManager),
    emitCheckIn: socketManager.emitCheckIn.bind(socketManager),
    requestQueuePosition: socketManager.requestQueuePosition.bind(socketManager),
    emitConsultationStart: socketManager.emitConsultationStart.bind(socketManager),
    emitConsultationEnd: socketManager.emitConsultationEnd.bind(socketManager),
    off: socketManager.off.bind(socketManager)
  };
} 