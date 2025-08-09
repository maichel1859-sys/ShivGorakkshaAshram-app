/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server as NetServer } from 'http';
import { Server as ServerIO } from 'socket.io';
import { 
  ServerToClientEvents, 
  ClientToServerEvents, 
  SocketAuthData
} from '@/types/socket';
import { instrument } from '@socket.io/admin-ui';

// Global Socket.IO server instance
let io: ServerIO<ClientToServerEvents, ServerToClientEvents> | null = null;

// Initialize Socket.IO server
export function initSocketServer(httpServer: NetServer): ServerIO<ClientToServerEvents, ServerToClientEvents> {
  if (io) {
    return io;
  }

  console.log('Initializing Socket.IO server...');
  
  io = new ServerIO(httpServer, {
    path: '/socket.io',
    cors: {
      origin: [
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        'https://admin.socket.io'
      ],
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

  setupSocketMiddleware();
  setupSocketEventHandlers();

  // Enable hosted Admin UI (https://admin.socket.io)
  instrument(io, { auth: false });

  console.log('Socket.IO server initialized successfully');
  return io;
}

// Setup Socket.IO middleware for authentication
function setupSocketMiddleware() {
  if (!io) return;

  io.use((socket, next) => {
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

// Setup Socket.IO event handlers
function setupSocketEventHandlers() {
  if (!io) return;

  io.on('connection', (socket) => {
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

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id} (User: ${authData.userId})`);
    });
  });
}

// Get Socket.IO server instance
export function getSocketServer(): ServerIO<ClientToServerEvents, ServerToClientEvents> | null {
  return io;
}

// Broadcast functions
export function broadcastToUser(userId: string, event: keyof ServerToClientEvents, data: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function broadcastToQueue(gurujiId: string, event: keyof ServerToClientEvents, data: any) {
  if (io) {
    io.to(`queue:${gurujiId}`).emit(event, data);
  }
}

export function broadcastToAdmins(event: keyof ServerToClientEvents, data: any) {
  if (io) {
    io.to('admin').emit(event, data);
  }
} 