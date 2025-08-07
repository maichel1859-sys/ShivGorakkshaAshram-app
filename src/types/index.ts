import { Role, AppointmentStatus, QueueStatus, RemedyType, Priority, Prisma } from "@prisma/client"

export interface User {
  id: string
  name?: string | null
  email: string
  role: Role
  phone?: string | null
  dateOfBirth?: Date | null
  address?: string | null
  emergencyContact?: string | null
  preferences?: Record<string, unknown>
  isActive: boolean
  image?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Appointment {
  id: string
  userId: string
  gurujiId?: string | null
  date: Date
  startTime: Date
  endTime: Date
  status: AppointmentStatus
  priority: Priority
  reason?: string | null
  notes?: string | null
  isRecurring: boolean
  recurringPattern?: Record<string, unknown>
  qrCode?: string | null
  checkedInAt?: Date | null
  createdAt: Date
  updatedAt: Date
  user?: User
  guruji?: User | null
}

export interface QueueEntry {
  id: string
  appointmentId: string
  userId: string
  gurujiId?: string | null
  position: number
  status: QueueStatus
  priority: Priority
  estimatedWait?: number | null
  checkedInAt: Date
  startedAt?: Date | null
  completedAt?: Date | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
  appointment?: Appointment
  user?: User
  guruji?: User | null
}

export interface ConsultationSession {
  id: string
  appointmentId: string
  patientId: string
  gurujiId: string
  startTime: Date
  endTime?: Date | null
  duration?: number | null
  symptoms?: string | null
  diagnosis?: string | null
  notes?: string | null
  recordings?: Prisma.JsonValue | null
  createdAt: Date
  updatedAt: Date
  appointment?: Appointment
  patient?: User
  guruji?: User
}

export interface RemedyTemplate {
  id: string
  name: string
  type: RemedyType
  category: string
  description?: string | null
  instructions: string
  dosage?: string | null
  duration?: string | null
  language: string
  isActive: boolean
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface RemedyDocument {
  id: string
  consultationSessionId: string
  templateId: string
  userId: string
  customInstructions?: string | null
  customDosage?: string | null
  customDuration?: string | null
  pdfUrl?: string | null
  emailSent: boolean
  smsSent: boolean
  deliveredAt?: Date | null
  createdAt: Date
  updatedAt: Date
  template?: RemedyTemplate
  user?: User
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: string
  data?: Record<string, unknown>
  read: boolean
  emailSent: boolean
  smsSent: boolean
  createdAt: Date
  user?: User
}

export interface SystemSetting {
  id: string
  key: string
  value: string
  type: string
  category?: string | null
  description?: string | null
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DashboardStats {
  totalAppointments: number
  todayAppointments: number
  activeQueue: number
  completedSessions: number
  pendingRemedies: number
}

export interface TimeSlot {
  start: string
  end: string
  available: boolean
  gurujiId?: string
}

export interface QueueUpdate {
  type: 'position_update' | 'status_change' | 'estimate_update'
  queueEntry: QueueEntry
  message?: string
}

// Form types for React Hook Form
export interface AppointmentFormData {
  gurujiId?: string
  date: string
  time: string
  reason?: string
  priority: Priority
  isRecurring: boolean
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    interval: number
    endDate?: string
  }
}

export interface UserRegistrationData {
  name: string
  email: string
  password: string
  confirmPassword: string
  phone?: string
  dateOfBirth?: string
  address?: string
  emergencyContact?: string
}

export interface RemedyFormData {
  templateId: string
  customInstructions?: string
  customDosage?: string
  customDuration?: string
}

// Utility types for better type safety
export type ApiResponse<T = unknown> = {
  success: true;
  data: T;
  message?: string;
} | {
  success: false;
  error: string;
  code?: string;
  errors?: Record<string, string>;
};

export type ServerActionResponse<T = unknown> = {
  success: true;
  data?: T;
  message?: string;
} | {
  success: false;
  error: string;
  fieldErrors?: Record<string, string>;
};

// Generic search/filter types
export type SearchParams = {
  search?: string;
  status?: string;
  date?: string;
  page?: string;
  limit?: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

// Database operation types
export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateUserInput = Partial<Pick<User, 'name' | 'phone' | 'address' | 'emergencyContact' | 'preferences' | 'isActive'>>;

export type CreateAppointmentInput = Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'guruji'>;
export type UpdateAppointmentInput = Partial<Pick<Appointment, 'status' | 'notes' | 'startTime' | 'endTime' | 'priority'>>;

// Component prop types
export type TableColumn<T = unknown> = {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
};

export type FormField = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'date' | 'datetime-local';
  placeholder?: string;
  required?: boolean;
  validation?: Record<string, unknown>;
  options?: { value: string; label: string }[];
};

export { Role, AppointmentStatus, QueueStatus, RemedyType, Priority }