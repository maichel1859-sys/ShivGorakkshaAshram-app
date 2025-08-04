import { z } from "zod";

// Base schemas
export const baseUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
});

export const basePasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// User schemas
export const userRegistrationSchema = baseUserSchema.extend({
  ...basePasswordSchema.shape,
  role: z.enum(["USER", "COORDINATOR", "GURUJI", "ADMIN"]).default("USER"),
  isActive: z.boolean().default(true),
});

export const userUpdateSchema = baseUserSchema.extend({
  role: z.enum(["USER", "COORDINATOR", "GURUJI", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

export const userLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Appointment schemas
export const appointmentSchema = z.object({
  gurujiId: z.string().min(1, "Please select a Guruji"),
  date: z.string().min(1, "Please select a date"),
  time: z.string().min(1, "Please select a time"),
  reason: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.object({
    frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
    interval: z.number().min(1).max(12).optional(),
    endDate: z.string().optional(),
  }).optional(),
});

export const appointmentUpdateSchema = appointmentSchema.partial();

// Remedy schemas
export const remedyTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["HOMEOPATHIC", "AYURVEDIC", "SPIRITUAL", "LIFESTYLE", "DIETARY"]),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  instructions: z.string().min(1, "Instructions are required"),
  dosage: z.string().optional(),
  duration: z.string().optional(),
  language: z.string().default("en"),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

export const remedyPrescriptionSchema = z.object({
  templateId: z.string().min(1, "Template is required"),
  customInstructions: z.string().optional(),
  customDosage: z.string().optional(),
  customDuration: z.string().optional(),
});

// Queue schemas
export const queueEntrySchema = z.object({
  appointmentId: z.string().min(1, "Appointment is required"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  notes: z.string().optional(),
});

// Consultation schemas
export const consultationSchema = z.object({
  appointmentId: z.string().min(1, "Appointment is required"),
  symptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
});

// Notification schemas
export const notificationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.enum(["appointment", "remedy", "queue", "system", "reminder"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  data: z.record(z.any()).optional(),
});

// Settings schemas
export const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  appointmentReminders: z.boolean(),
  queueUpdates: z.boolean(),
  systemAlerts: z.boolean(),
});

export const privacySettingsSchema = z.object({
  profileVisibility: z.enum(["public", "private", "friends"]),
  shareHealthData: z.boolean(),
  allowAnalytics: z.boolean(),
  dataRetention: z.enum(["1_month", "3_months", "6_months", "1_year", "forever"]),
});

// Search and filter schemas
export const searchFilterSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// These schemas are being replaced by the unified-schemas.ts file
// Keeping for backward compatibility during migration 