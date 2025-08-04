import { Server as NetServer } from 'http';
import { NextApiRequest } from 'next';
import { Server as ServerIO } from 'socket.io';
import { NextApiResponseServerIO } from '@/types/socket';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const httpServer: NetServer = res.socket.server as NetServer;
    const io = new ServerIO(httpServer, {
      path: '/api/socket',
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    // Real-time queue management
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Join queue room for real-time updates
      socket.on('join-queue', (gurujiId: string) => {
        socket.join(`queue-${gurujiId}`);
        console.log(`Client ${socket.id} joined queue-${gurujiId}`);
      });

      // Leave queue room
      socket.on('leave-queue', (gurujiId: string) => {
        socket.leave(`queue-${gurujiId}`);
        console.log(`Client ${socket.id} left queue-${gurujiId}`);
      });

      // Join user notifications room
      socket.on('join-user', (userId: string) => {
        socket.join(`user-${userId}`);
        console.log(`Client ${socket.id} joined user-${userId} notifications`);
      });

      // Leave user notifications room
      socket.on('leave-user', (userId: string) => {
        socket.leave(`user-${userId}`);
        console.log(`Client ${socket.id} left user-${userId} notifications`);
      });

      // Join admin/coordinator room for system updates
      socket.on('join-admin', () => {
        socket.join('admin-updates');
        console.log(`Client ${socket.id} joined admin updates`);
      });

      // Handle queue position updates
      socket.on('update-queue-position', (data: {
        gurujiId: string;
        queueData: unknown[];
      }) => {
        // Broadcast to all clients watching this queue
        socket.to(`queue-${data.gurujiId}`).emit('queue-updated', data.queueData);
      });

      // Handle check-in events
      socket.on('patient-checkin', (data: {
        gurujiId: string;
        patientId: string;
        queuePosition: number;
      }) => {
        // Notify queue watchers
        socket.to(`queue-${data.gurujiId}`).emit('patient-checked-in', data);
        
        // Notify the specific patient
        socket.to(`user-${data.patientId}`).emit('checkin-confirmed', {
          position: data.queuePosition,
          gurujiId: data.gurujiId
        });
      });

      // Handle consultation start/end
      socket.on('consultation-start', (data: {
        gurujiId: string;
        patientId: string;
      }) => {
        socket.to(`queue-${data.gurujiId}`).emit('consultation-started', data);
        socket.to(`user-${data.patientId}`).emit('consultation-ready', data);
      });

      socket.on('consultation-end', (data: {
        gurujiId: string;
        patientId: string;
        nextPatientId?: string;
      }) => {
        socket.to(`queue-${data.gurujiId}`).emit('consultation-ended', data);
        socket.to(`user-${data.patientId}`).emit('consultation-completed', data);
        
        if (data.nextPatientId) {
          socket.to(`user-${data.nextPatientId}`).emit('your-turn-next', {
            gurujiId: data.gurujiId
          });
        }
      });

      // Handle appointment notifications
      socket.on('appointment-booked', (data: {
        patientId: string;
        appointmentData: unknown;
      }) => {
        socket.to(`user-${data.patientId}`).emit('appointment-confirmed', data.appointmentData);
        socket.to('admin-updates').emit('new-appointment', data.appointmentData);
      });

      // Handle remedy notifications
      socket.on('remedy-prescribed', (data: {
        patientId: string;
        gurujiId: string;
        remedyData: unknown;
      }) => {
        socket.to(`user-${data.patientId}`).emit('remedy-received', data.remedyData);
      });

      // Handle system announcements
      socket.on('system-announcement', (data: {
        message: string;
        type: 'info' | 'warning' | 'urgent';
        targetRoles?: string[];
      }) => {
        if (data.targetRoles && data.targetRoles.length > 0) {
          data.targetRoles.forEach(role => {
            socket.to(`role-${role}`).emit('announcement', data);
          });
        } else {
          io.emit('announcement', data);
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
  }
  res.end();
}