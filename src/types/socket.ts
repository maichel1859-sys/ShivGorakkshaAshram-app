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

// Define proper types for socket data
export interface QueueData {
  id: string;
  userId: string;
  gurujiId: string;
  position: number;
  status: string;
  checkedInAt: string;
}

export interface AppointmentData {
  id: string;
  userId: string;
  gurujiId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  priority: string;
  reason?: string;
}

export interface RemedyData {
  id: string;
  patientId: string;
  gurujiId: string;
  templateId: string;
  prescription: string;
  instructions: string;
  createdAt: string;
}

// Socket event types for type safety
export interface ServerToClientEvents {
  'queue-updated': (queueData: QueueData[]) => void;
  'patient-checked-in': (data: { gurujiId: string; patientId: string; queuePosition: number }) => void;
  'checkin-confirmed': (data: { position: number; gurujiId: string }) => void;
  'consultation-started': (data: { gurujiId: string; patientId: string }) => void;
  'consultation-ready': (data: { gurujiId: string; patientId: string }) => void;
  'consultation-ended': (data: { gurujiId: string; patientId: string; nextPatientId?: string }) => void;
  'consultation-completed': (data: { gurujiId: string; patientId: string }) => void;
  'your-turn-next': (data: { gurujiId: string }) => void;
  'appointment-confirmed': (appointmentData: AppointmentData) => void;
  'new-appointment': (appointmentData: AppointmentData) => void;
  'remedy-received': (remedyData: RemedyData) => void;
  'announcement': (data: { message: string; type: string }) => void;
}

export interface ClientToServerEvents {
  'join-queue': (gurujiId: string) => void;
  'leave-queue': (gurujiId: string) => void;
  'join-user': (userId: string) => void;
  'leave-user': (userId: string) => void;
  'join-admin': () => void;
  'update-queue-position': (data: { gurujiId: string; queueData: QueueData[] }) => void;
  'patient-checkin': (data: { gurujiId: string; patientId: string; queuePosition: number }) => void;
  'consultation-start': (data: { gurujiId: string; patientId: string }) => void;
  'consultation-end': (data: { gurujiId: string; patientId: string; nextPatientId?: string }) => void;
  'appointment-booked': (data: { patientId: string; appointmentData: AppointmentData }) => void;
  'remedy-prescribed': (data: { patientId: string; gurujiId: string; remedyData: RemedyData }) => void;
  'system-announcement': (data: { message: string; type: string; targetRoles?: string[] }) => void;
}