/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server as NetServer } from 'http';
import { Server as ServerIO } from 'socket.io';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import { 
  ServerToClientEvents, 
  ClientToServerEvents, 
  SocketAuthData,
  AppointmentData,
  RemedyData,
  QueueData
} from '@/types/socket';
import { prisma } from '@/lib/database/prisma';
import { getQueueStatus, joinQueue } from '@/lib/actions/queue-actions';
import { bookAppointment, updateAppointment } from '@/lib/actions/appointment-actions';
import { prescribeRemedy } from '@/lib/actions/remedy-actions';

// Server-side socket types
type ServerSocketType = ServerIO<ClientToServerEvents, ServerToClientEvents>;
type ClientSocketType = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

// Server-side socket manager
export class SocketServerManager {
  private io: ServerSocketType | null = null;

  init(httpServer: NetServer): ServerSocketType {
    if (this.io) {
      return this.io;
    }

    console.log('Socket.IO server initializing...');
    this.io = new ServerIO(httpServer, {
      path: '/socket.io',
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 10000,
      maxHttpBufferSize: 1e6
    });

    this.setupServerMiddleware();
    this.setupServerEventHandlers();

    return this.io;
  }

  private setupServerMiddleware() {
    if (!this.io) return;

    this.io.use((socket, next) => {
      try {
        const authData = socket.handshake.auth as SocketAuthData;
        
        // For development, allow connections without auth
        if (process.env.NODE_ENV === 'development') {
          if (!authData.userId || !authData.role) {
            console.warn('Socket connection without auth in development mode');
            socket.data = {
              userId: 'dev-user',
              role: 'USER',
              token: 'dev-token'
            } as SocketAuthData;
          } else {
            socket.data = authData;
          }
        } else {
          // Production authentication
          if (!authData.userId || !authData.role) {
            return next(new Error('Authentication required'));
          }
          socket.data = authData;
        }

        next();
      } catch (error) {
        console.error('Socket middleware error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupServerEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      const authData: SocketAuthData = socket.data;
      console.log(`Client connected: ${socket.id} (User: ${authData.userId}, Role: ${authData.role})`);

      // Room Management Events
      socket.on('join:user-room', ({ userId }) => {
        socket.join(`user:${userId}`);
        console.log(`Socket ${socket.id} joined user room: user:${userId}`);
      });

      socket.on('join:queue-room', ({ gurujiId }) => {
        socket.join(`queue:${gurujiId}`);
        console.log(`Socket ${socket.id} joined queue room: queue:${gurujiId}`);
      });

      socket.on('leave:queue-room', ({ gurujiId }) => {
        socket.leave(`queue:${gurujiId}`);
        console.log(`Socket ${socket.id} left queue room: queue:${gurujiId}`);
      });

      socket.on('join:admin-room', () => {
        if (authData.role === 'ADMIN' || authData.role === 'COORDINATOR') {
          socket.join('admin');
          console.log(`Socket ${socket.id} joined admin room`);
        }
      });

      // Queue Operation Events
      socket.on('queue:checkin', async (data) => {
        try {
          const formData = new FormData();
          formData.append('gurujiId', data.gurujiId);
          if (data.appointmentId) {
            formData.append('appointmentId', data.appointmentId);
          }

          const queueResult = await joinQueue(formData);

          if (queueResult.success && queueResult.queueEntry) {
            const queuePosition = queueResult.queueEntry.position || 0;
            
            socket.emit('checkin:success', {
              userId: data.userId,
              position: queuePosition,
              gurujiId: data.gurujiId,
              estimatedWaitTime: this.calculateEstimatedWaitTime(queuePosition)
            });

            socket.to(`queue:${data.gurujiId}`).emit('checkin:patient-joined', {
              gurujiId: data.gurujiId,
              patientId: data.userId,
              queuePosition
            });

            console.log(`Patient ${data.userId} checked in to queue ${data.gurujiId} at position ${queuePosition}`);
          } else {
            console.error('Queue check-in failed:', queueResult.error);
          }
        } catch (error) {
          console.error('Check-in error:', error);
        }
      });

      socket.on('queue:update-positions', async (data) => {
        try {
          const queueStatus = await getQueueStatus();
          
          if (queueStatus.success && queueStatus.queueStatus) {
            const queueData = queueStatus.queueStatus.currentQueue.map(entry => ({
              id: entry.id,
              userId: entry.userId,
              gurujiId: entry.gurujiId || '',
              position: entry.position,
              status: entry.status as 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
              priority: entry.priority === 'NORMAL' ? 'MEDIUM' : entry.priority as 'LOW' | 'HIGH' | 'MEDIUM',
              checkedInAt: entry.createdAt.toISOString(),
              userName: entry.user.name || undefined,
              gurujiName: entry.guruji?.name || undefined,
              appointmentId: entry.appointmentId,
              estimatedWaitTime: queueStatus.queueStatus.estimatedWaitTime
            }));

            socket.to(`queue:${data.gurujiId}`).emit('queue:updated', {
              gurujiId: data.gurujiId,
              queueData
            });

            queueData.forEach((entry) => {
              socket.to(`user:${entry.userId}`).emit('queue:position-changed', {
                userId: entry.userId,
                position: entry.position,
                gurujiId: data.gurujiId
              });
            });

            console.log(`Queue positions updated for guruji ${data.gurujiId}`);
          }
        } catch (error) {
          console.error('Queue update error:', error);
        }
      });

      // Consultation Operation Events
      socket.on('consultation:start', (data) => {
        socket.to(`user:${data.patientId}`).emit('consultation:ready', {
          userId: data.patientId,
          gurujiId: data.gurujiId
        });

        socket.to(`queue:${data.gurujiId}`).emit('consultation:started', data);
        console.log(`Consultation started: Guruji ${data.gurujiId} with Patient ${data.patientId}`);
      });

      socket.on('consultation:end', (data) => {
        socket.to(`user:${data.patientId}`).emit('consultation:completed', {
          userId: data.patientId,
          gurujiId: data.gurujiId
        });

        if (data.nextPatientId) {
          socket.to(`user:${data.nextPatientId}`).emit('consultation:next-patient', {
            userId: data.nextPatientId,
            gurujiId: data.gurujiId
          });
        }

        console.log(`Consultation ended: Guruji ${data.gurujiId} with Patient ${data.patientId}`);
      });

      // Appointment Operation Events
      socket.on('appointment:book', async (data) => {
        try {
          const formData = new FormData();
          formData.append('gurujiId', data.appointment.gurujiId);
          formData.append('date', data.appointment.date);
          formData.append('startTime', data.appointment.startTime);
          if (data.appointment.reason) {
            formData.append('reason', data.appointment.reason);
          }
          formData.append('priority', data.appointment.priority || 'NORMAL');

          const appointmentResult = await bookAppointment(formData);
          
          if (appointmentResult.success && appointmentResult.appointment) {
            const appointmentData: AppointmentData = {
              id: appointmentResult.appointment.id,
              userId: appointmentResult.appointment.userId,
              gurujiId: appointmentResult.appointment.gurujiId || '',
              date: appointmentResult.appointment.date.toISOString(),
              startTime: appointmentResult.appointment.startTime.toISOString(),
              endTime: appointmentResult.appointment.endTime.toISOString(),
              status: appointmentResult.appointment.status as 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
              priority: appointmentResult.appointment.priority === 'NORMAL' ? 'MEDIUM' : appointmentResult.appointment.priority as 'LOW' | 'HIGH' | 'MEDIUM',
              reason: appointmentResult.appointment.reason || undefined,
              userName: appointmentResult.appointment.user.name || undefined,
              gurujiName: appointmentResult.appointment.guruji?.name || undefined
            };

            socket.to(`user:${data.userId}`).emit('appointment:confirmed', {
              userId: data.userId,
              appointment: appointmentData
            });

            socket.to('admin').emit('appointment:confirmed', {
              userId: data.userId,
              appointment: appointmentData
            });

            console.log(`Appointment booked for user ${data.userId}`);
          } else {
            console.error('Appointment booking failed');
          }
        } catch (error) {
          console.error('Appointment booking error:', error);
        }
      });

      socket.on('appointment:update', async (data) => {
        try {
          const formData = new FormData();
          Object.entries(data.updates).forEach(([key, value]) => {
            formData.append(key, String(value));
          });

          const updateResult = await updateAppointment(data.appointmentId, formData);
          
          if (updateResult.success) {
            const updatedAppointment = await prisma.appointment.findUnique({
              where: { id: data.appointmentId },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
                guruji: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            });

            if (updatedAppointment) {
              const appointmentData: AppointmentData = {
                id: updatedAppointment.id,
                userId: updatedAppointment.userId,
                gurujiId: updatedAppointment.gurujiId || '',
                date: updatedAppointment.date.toISOString(),
                startTime: updatedAppointment.startTime.toISOString(),
                endTime: updatedAppointment.endTime.toISOString(),
                status: updatedAppointment.status as 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
                priority: updatedAppointment.priority === 'NORMAL' ? 'MEDIUM' : updatedAppointment.priority as 'LOW' | 'HIGH' | 'MEDIUM',
                reason: updatedAppointment.reason || undefined,
                userName: updatedAppointment.user.name || undefined,
                gurujiName: updatedAppointment.guruji?.name || undefined
              };

              socket.to(`user:${updatedAppointment.userId}`).emit('appointment:updated', {
                userId: updatedAppointment.userId,
                appointment: appointmentData
              });

              console.log(`Appointment ${data.appointmentId} updated`);
            }
          } else {
            console.error('Appointment update failed:', updateResult.error);
          }
        } catch (error) {
          console.error('Appointment update error:', error);
        }
      });

      // Remedy Operation Events
      socket.on('remedy:prescribe', async (data) => {
        try {
          const formData = new FormData();
          formData.append('patientId', data.patientId);
          formData.append('gurujiId', data.gurujiId);
          formData.append('templateId', data.remedy.templateId || '');
          formData.append('prescription', data.remedy.prescription);
          formData.append('instructions', data.remedy.instructions);

          const remedyResult = await prescribeRemedy(formData);
          
          if (remedyResult.success && remedyResult.remedy) {
            const remedyData: RemedyData = {
              id: remedyResult.remedy.id,
              patientId: remedyResult.remedy.consultationSession.appointment.userId,
              gurujiId: remedyResult.remedy.consultationSession.appointment.gurujiId || '',
              templateId: remedyResult.remedy.templateId || undefined,
              prescription: remedyResult.remedy.template.name,
              instructions: remedyResult.remedy.customInstructions || remedyResult.remedy.template.instructions,
              createdAt: remedyResult.remedy.createdAt.toISOString(),
              patientName: remedyResult.remedy.consultationSession.appointment.user.name || undefined,
              gurujiName: remedyResult.remedy.consultationSession.appointment.guruji?.name || undefined
            };

            socket.to(`user:${data.patientId}`).emit('remedy:prescribed', {
              userId: data.patientId,
              remedy: remedyData
            });

            console.log(`Remedy prescribed to patient ${data.patientId} by guruji ${data.gurujiId}`);
          } else {
            console.error('Remedy prescription failed');
          }
        } catch (error) {
          console.error('Remedy prescription error:', error);
        }
      });

      // System Operation Events
      socket.on('system:broadcast', (data) => {
        if (authData.role === 'ADMIN' || authData.role === 'COORDINATOR') {
          if (data.targetRoles && data.targetRoles.length > 0) {
            data.targetRoles.forEach(role => {
              socket.to(`role:${role}`).emit('system:announcement', data);
            });
          } else {
            this.io?.emit('system:announcement', data);
          }
          
          console.log(`System announcement broadcasted: ${data.message}`);
        }
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id} (User: ${authData.userId})`);
      });
    });
  }

  private calculateEstimatedWaitTime(position: number): number {
    const averageConsultationTime = 30; // minutes
    return position * averageConsultationTime;
  }

  getSocketServer(): ServerSocketType | null {
    return this.io;
  }

  broadcastToUser(userId: string, event: keyof ServerToClientEvents, data: any) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  broadcastToQueue(gurujiId: string, event: keyof ServerToClientEvents, data: any) {
    if (this.io) {
      this.io.to(`queue:${gurujiId}`).emit(event, data);
    }
  }

  broadcastToAdmins(event: keyof ServerToClientEvents, data: any) {
    if (this.io) {
      this.io.to('admin').emit(event, data);
    }
  }
}

// Client-side socket manager
export class SocketClientManager {
  private socket: ClientSocketType | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private authData: SocketAuthData | null = null;
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private connectionPromise: Promise<ClientSocketType> | null = null;

  private static instance: SocketClientManager;

  private constructor() {}

  static getInstance(): SocketClientManager {
    if (!SocketClientManager.instance) {
      SocketClientManager.instance = new SocketClientManager();
    }
    return SocketClientManager.instance;
  }

  async connect(authData: SocketAuthData): Promise<ClientSocketType> {
    // If already connected with same user, return existing socket
    if (this.socket?.connected && this.authData?.userId === authData.userId) {
      return this.socket;
    }

    // If connection is in progress, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Disconnect existing socket if different user
    if (this.socket && this.authData?.userId !== authData.userId) {
      this.disconnect();
    }

    this.authData = authData;
    
    // Create connection promise
    this.connectionPromise = this.createConnection();
    
    try {
      const socket = await this.connectionPromise;
      this.connectionPromise = null;
      return socket;
    } catch (error) {
      this.connectionPromise = null;
      throw error;
    }
  }

  private createConnection(): Promise<ClientSocketType> {
    return new Promise((resolve, reject) => {
      if (!this.authData) {
        reject(new Error('Authentication data required'));
        return;
      }

      const serverUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      this.socket = ClientIO(serverUrl, {
        path: '/socket.io',
        auth: {
          userId: this.authData.userId,
          role: this.authData.role,
          token: this.authData.token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 20000,
        forceNew: true
      });

      const socket = this.socket;

      // Connection event handlers
      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        this.reconnectAttempts = 0;
        
        // Join user room
        this.joinUserRoom(this.authData!.userId);
        
        // Join admin room if applicable
        if (this.authData!.role === 'ADMIN' || this.authData!.role === 'COORDINATOR') {
          this.joinAdminRoom();
        }

        resolve(socket);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          reject(error);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          socket.connect();
        }
      });

      // Setup other event listeners
      this.setupClientEventListeners();
    });
  }

  private setupClientEventListeners() {
    if (!this.socket || !this.authData) return;

    (this.socket as any).on('reconnect', (attemptNumber: number) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
      
      // Rejoin rooms after reconnection
      this.joinUserRoom(this.authData!.userId);
      if (this.authData!.role === 'ADMIN' || this.authData!.role === 'COORDINATOR') {
        this.joinAdminRoom();
      }
    });

    (this.socket as any).on('reconnect_error', (error: unknown) => {
      console.error('Socket reconnection error:', error);
    });
  }

  // Room management
  joinUserRoom(userId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join:user-room', { userId });
    }
  }

  joinQueueRoom(gurujiId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join:queue-room', { gurujiId });
    }
  }

  leaveQueueRoom(gurujiId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave:queue-room', { gurujiId });
    }
  }

  joinAdminRoom() {
    if (this.socket?.connected) {
      this.socket.emit('join:admin-room');
    }
  }

  // Queue operations
  checkIn(data: { userId: string; gurujiId: string; appointmentId?: string }) {
    if (this.socket?.connected) {
      this.socket.emit('queue:checkin', data);
    }
  }

  updateQueuePositions(data: { gurujiId: string; queueData: QueueData[] }) {
    if (this.socket?.connected) {
      this.socket.emit('queue:update-positions', data);
    }
  }

  // Consultation operations
  startConsultation(data: { gurujiId: string; patientId: string }) {
    if (this.socket?.connected) {
      this.socket.emit('consultation:start', data);
    }
  }

  endConsultation(data: { gurujiId: string; patientId: string; nextPatientId?: string }) {
    if (this.socket?.connected) {
      this.socket.emit('consultation:end', data);
    }
  }

  // Appointment operations
  bookAppointment(data: { userId: string; appointment: Omit<AppointmentData, 'id'> }) {
    if (this.socket?.connected) {
      this.socket.emit('appointment:book', data);
    }
  }

  updateAppointment(data: { appointmentId: string; updates: Partial<AppointmentData> }) {
    if (this.socket?.connected) {
      this.socket.emit('appointment:update', data);
    }
  }

  // Remedy operations
  prescribeRemedy(data: { patientId: string; gurujiId: string; remedy: Omit<RemedyData, 'id' | 'createdAt'> }) {
    if (this.socket?.connected) {
      this.socket.emit('remedy:prescribe', data);
    }
  }

  // Event listeners
  on<K extends keyof ServerToClientEvents>(
    event: K, 
    callback: ServerToClientEvents[K]
  ) {
    if (this.socket) {
      this.socket.on(event, callback as any);
      
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event)!.add(callback as any);
    }
  }

  off<K extends keyof ServerToClientEvents>(
    event: K, 
    callback?: ServerToClientEvents[K]
  ) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback as any);
        this.listeners.get(event)?.delete(callback as any);
      } else {
        this.socket.off(event);
        this.listeners.delete(event);
      }
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.listeners.clear();
    }
  }

  disconnect() {
    if (this.socket) {
      this.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.authData = null;
      this.reconnectAttempts = 0;
      this.connectionPromise = null;
    }
  }

  getSocket(): ClientSocketType | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getAuthData(): SocketAuthData | null {
    return this.authData;
  }
}

// Export singleton instances
export const socketServerManager = new SocketServerManager();
export const socketClientManager = SocketClientManager.getInstance();

// Legacy exports for backward compatibility
export const initSocketServer = (httpServer: NetServer) => socketServerManager.init(httpServer);
export const getSocketServer = () => socketServerManager.getSocketServer();
export const broadcastToUser = (userId: string, event: keyof ServerToClientEvents, data: unknown) => 
  socketServerManager.broadcastToUser(userId, event, data);
export const broadcastToQueue = (gurujiId: string, event: keyof ServerToClientEvents, data: unknown) => 
  socketServerManager.broadcastToQueue(gurujiId, event, data);
export const broadcastToAdmins = (event: keyof ServerToClientEvents, data: unknown) => 
  socketServerManager.broadcastToAdmins(event, data); 