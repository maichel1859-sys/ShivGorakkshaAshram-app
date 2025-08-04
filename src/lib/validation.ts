import { z } from "zod";

// Common validation schemas
export const emailSchema = z.string().email("Invalid email address");
export const phoneSchema = z.string().regex(
  /^[\+]?[1-9][\d]{0,15}$/,
  "Invalid phone number format"
);
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number");

// User validation schemas
export const userRegistrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  email: emailSchema,
  phone: phoneSchema.optional(),
  password: passwordSchema,
  confirmPassword: z.string(),
  dateOfBirth: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters").optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  dateOfBirth: z.string().optional(),
});

// Appointment validation schemas
export const appointmentBookingSchema = z.object({
  gurujiId: z.string().min(1, "Please select a Guruji"),
  date: z.string().min(1, "Date is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
  recurring: z.boolean().default(false),
  recurringPattern: z.enum(["WEEKLY", "MONTHLY"]).optional(),
  recurringEndDate: z.string().optional(),
}).refine((data) => {
  if (data.recurring && !data.recurringPattern) {
    return false;
  }
  return true;
}, {
  message: "Recurring pattern is required when recurring is enabled",
  path: ["recurringPattern"],
}).refine((data) => {
  if (data.recurring && !data.recurringEndDate) {
    return false;
  }
  return true;
}, {
  message: "Recurring end date is required when recurring is enabled",
  path: ["recurringEndDate"],
});

// Remedy validation schemas
export const remedyTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be less than 200 characters"),
  type: z.enum(["HOMEOPATHIC", "AYURVEDIC", "SPIRITUAL", "LIFESTYLE", "DIETARY"]),
  category: z.string().min(1, "Category is required").max(100, "Category must be less than 100 characters"),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  instructions: z.string().min(10, "Instructions must be at least 10 characters").max(2000, "Instructions must be less than 2000 characters"),
  dosage: z.string().max(200, "Dosage must be less than 200 characters").optional(),
  duration: z.string().max(100, "Duration must be less than 100 characters").optional(),
  language: z.string().default("en"),
  tags: z.array(z.string().max(50, "Each tag must be less than 50 characters")).max(10, "Maximum 10 tags allowed").default([]),
  isActive: z.boolean().default(true),
});

export const remedyPrescriptionSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
  patientId: z.string().min(1, "Patient ID is required"),
  customInstructions: z.string().max(1000, "Custom instructions must be less than 1000 characters").optional(),
  customDosage: z.string().max(200, "Custom dosage must be less than 200 characters").optional(),
  customDuration: z.string().max(100, "Custom duration must be less than 100 characters").optional(),
  sendEmail: z.boolean().default(true),
  sendSms: z.boolean().default(false),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
});

// Check-in validation schemas
export const qrCheckinSchema = z.object({
  qrCode: z.string().min(1, "QR code is required"),
});

export const manualCheckinSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required"),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
});

// Notification validation schemas
export const notificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  message: z.string().min(1, "Message is required").max(1000, "Message must be less than 1000 characters"),
  type: z.enum(["appointment", "remedy", "queue", "system", "reminder"]),
  data: z.record(z.any()).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  sendEmail: z.boolean().default(false),
  sendSms: z.boolean().default(false),
});

// System settings validation schema
export const systemSettingsSchema = z.object({
  siteName: z.string().min(1, "Site name is required").max(100, "Site name must be less than 100 characters"),
  siteDescription: z.string().max(500, "Site description must be less than 500 characters").optional(),
  contactEmail: emailSchema,
  contactPhone: phoneSchema.optional(),
  timezone: z.string().min(1, "Timezone is required"),
  language: z.string().min(1, "Language is required"),
  dateFormat: z.string().min(1, "Date format is required"),
  timeFormat: z.enum(["12", "24"]),
  appointmentSlotDuration: z.number().min(15, "Minimum 15 minutes").max(180, "Maximum 3 hours"),
  maxAdvanceBookingDays: z.number().min(1, "Minimum 1 day").max(365, "Maximum 365 days"),
  allowCancellation: z.boolean(),
  cancellationDeadlineHours: z.number().min(0, "Cannot be negative").max(168, "Maximum 1 week"),
  enableNotifications: z.boolean(),
  enableSmsNotifications: z.boolean(),
  enableEmailNotifications: z.boolean(),
  autoBackupEnabled: z.boolean(),
  backupFrequencyHours: z.number().min(1, "Minimum 1 hour").max(168, "Maximum 1 week"),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().max(200, "Maintenance message must be less than 200 characters").optional(),
});

// Utility functions for validation
export function validateEmail(email: string): boolean {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

export function validatePhone(phone: string): boolean {
  try {
    phoneSchema.parse(phone);
    return true;
  } catch {
    return false;
  }
}

export function validatePassword(password: string): { 
  isValid: boolean; 
  errors: string[] 
} {
  try {
    passwordSchema.parse(password);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        isValid: false, 
        errors: error.errors.map(e => e.message) 
      };
    }
    return { isValid: false, errors: ["Invalid password"] };
  }
}

// Date validation utilities
export function validateFutureDate(date: string | Date): boolean {
  const inputDate = new Date(date);
  const now = new Date();
  return inputDate > now;
}

export function validateDateRange(startDate: string | Date, endDate: string | Date): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start < end;
}

export function validateAppointmentTime(date: string | Date): {
  isValid: boolean;
  error?: string;
} {
  const appointmentDate = new Date(date);
  const now = new Date();
  
  // Check if date is in the future
  if (appointmentDate <= now) {
    return { 
      isValid: false, 
      error: "Appointment must be scheduled for a future date and time" 
    };
  }
  
  // Check if appointment is within business hours (9 AM to 6 PM)
  const hours = appointmentDate.getHours();
  if (hours < 9 || hours >= 18) {
    return { 
      isValid: false, 
      error: "Appointments can only be scheduled between 9:00 AM and 6:00 PM" 
    };
  }
  
  // Check if appointment is not on Sunday (assuming Sunday = 0)
  const dayOfWeek = appointmentDate.getDay();
  if (dayOfWeek === 0) {
    return { 
      isValid: false, 
      error: "Appointments cannot be scheduled on Sundays" 
    };
  }
  
  return { isValid: true };
}

// Form validation helper
export function getFormErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join(".");
    errors[path] = err.message;
  });
  
  return errors;
}

// API response validation
export const apiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.unknown().optional(),
  errors: z.array(z.string()).optional(),
});

export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
};