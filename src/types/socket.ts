import { NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer, Socket } from 'net';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io: ServerIO;
    };
  };
};

// Core data interfaces
export interface QueueData {
  id: string;
  userId: string;
  gurujiId: string;
  position: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  checkedInAt: string;
  userName?: string;
  gurujiName?: string;
  appointmentId?: string;
  estimatedWaitTime?: number;
  notes?: string;
}

export interface AppointmentData {
  id: string;
  userId: string;
  gurujiId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  reason?: string;
  userName?: string;
  gurujiName?: string;
}

export interface RemedyData {
  id: string;
  patientId: string;
  gurujiId: string;
  templateId?: string;
  prescription: string;
  instructions: string;
  createdAt: string;
  patientName?: string;
  gurujiName?: string;
}

export interface SystemAnnouncement {
  message: string;
  type: 'info' | 'warning' | 'urgent';
  targetRoles?: string[];
}

// Socket event interfaces
export interface ServerToClientEvents {
  // Queue events
  'queue:updated': (data: { gurujiId: string; queueData: QueueData[] }) => void;
  'queue:position-changed': (data: { userId: string; position: number; gurujiId: string }) => void;
  
  // Check-in events
  'checkin:success': (data: { userId: string; position: number; gurujiId: string; estimatedWaitTime?: number }) => void;
  'checkin:patient-joined': (data: { gurujiId: string; patientId: string; queuePosition: number }) => void;
  
  // Consultation events
  'consultation:ready': (data: { userId: string; gurujiId: string }) => void;
  'consultation:started': (data: { gurujiId: string; patientId: string }) => void;
  'consultation:completed': (data: { userId: string; gurujiId: string }) => void;
  'consultation:next-patient': (data: { userId: string; gurujiId: string }) => void;
  
  // Appointment events
  'appointment:confirmed': (data: { userId: string; appointment: AppointmentData }) => void;
  'appointment:updated': (data: { userId: string; appointment: AppointmentData }) => void;
  'appointment:reminder': (data: { userId: string; appointment: AppointmentData; minutesUntil: number }) => void;
  
  // Remedy events
  'remedy:prescribed': (data: { userId: string; remedy: RemedyData }) => void;
  
  // System events
  'system:announcement': (data: SystemAnnouncement) => void;
  'notification:new': (data: { userId: string; notification: { id: string; title: string; message: string; type: string; createdAt: string } }) => void;
}

export interface ClientToServerEvents {
  // Room management
  'join:user-room': (data: { userId: string }) => void;
  'join:queue-room': (data: { gurujiId: string }) => void;
  'join:admin-room': () => void;
  'leave:queue-room': (data: { gurujiId: string }) => void;
  
  // Queue operations
  'queue:checkin': (data: { userId: string; gurujiId: string; appointmentId?: string }) => void;
  'queue:update-positions': (data: { gurujiId: string; queueData: QueueData[] }) => void;
  
  // Consultation operations
  'consultation:start': (data: { gurujiId: string; patientId: string }) => void;
  'consultation:end': (data: { gurujiId: string; patientId: string; nextPatientId?: string }) => void;
  
  // Appointment operations
  'appointment:book': (data: { userId: string; appointment: Omit<AppointmentData, 'id'> }) => void;
  'appointment:update': (data: { appointmentId: string; updates: Partial<AppointmentData> }) => void;
  
  // Remedy operations
  'remedy:prescribe': (data: { patientId: string; gurujiId: string; remedy: Omit<RemedyData, 'id' | 'createdAt'> }) => void;
  
  // System operations
  'system:broadcast': (data: SystemAnnouncement) => void;
}

// Socket authentication data
export interface SocketAuthData {
  userId: string;
  role: 'USER' | 'COORDINATOR' | 'GURUJI' | 'ADMIN';
  token?: string;
}