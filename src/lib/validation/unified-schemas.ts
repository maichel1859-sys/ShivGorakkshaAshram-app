import { z } from "zod";

// ========================================
// BASE VALIDATION PRIMITIVES
// ========================================

// Common field validations
export const emailSchema = z.string().email("Invalid email address");

// Enhanced phone validation with Indian mobile support
export const phoneSchema = z.string()
  .min(10, "Phone number must be at least 10 digits")
  .max(15, "Phone number must be at most 15 digits")
  .refine((phone) => {
    // Clean the phone number
    const cleaned = phone.replace(/\D/g, '');
    
    // Indian mobile number validation (10 digits starting with 6-9)
    const indianMobile = /^[6-9]\d{9}$/.test(cleaned);
    
    // International format validation
    const international = /^[\+]?[1-9][\d]{6,14}$/.test(phone.replace(/\s/g, ''));
    
    return indianMobile || international;
  }, "Invalid phone number format. Must be a valid Indian mobile number (10 digits starting with 6-9) or international format");

export const strongPasswordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character");

export const basicPasswordSchema = z.string()
  .min(6, "Password must be at least 6 characters");

export const nameSchema = z.string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be less than 100 characters")
  .regex(/^[a-zA-Z\s\u00C0-\u017F]+$/, "Name can only contain letters and spaces");

export const idSchema = z.string().min(1, "ID is required");

export const optionalStringSchema = z.string().optional().or(z.literal(""));

// Date and time validations
export const dateStringSchema = z.string().refine((date) => {
  return !isNaN(Date.parse(date));
}, "Invalid date format");

export const futureDateTime = z.string().refine((date) => {
  const appointmentDate = new Date(date);
  const now = new Date();
  return appointmentDate > now;
}, "Date must be in the future");

export const businessHoursTime = z.string().refine((dateTime) => {
  const date = new Date(dateTime);
  const hours = date.getHours();
  const day = date.getDay();
  
  // Check business hours (9 AM to 6 PM) and not Sunday
  return hours >= 9 && hours < 18 && day !== 0;
}, "Time must be during business hours (9 AM - 6 PM) and not on Sunday");

// ========================================
// ENUM DEFINITIONS
// ========================================

export const RoleEnum = z.enum(["USER", "COORDINATOR", "GURUJI", "ADMIN"]);
export const AppointmentStatusEnum = z.enum(["BOOKED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]);
export const QueueStatusEnum = z.enum(["WAITING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export const RemedyTypeEnum = z.enum(["HOMEOPATHIC", "AYURVEDIC", "SPIRITUAL", "LIFESTYLE", "DIETARY"]);
export const PriorityEnum = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
export const NotificationTypeEnum = z.enum(["appointment", "remedy", "queue", "system", "reminder"]);
export const RecurrenceEnum = z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]);

// User category types for different registration flows
export const UserCategoryEnum = z.enum(["SELF_SERVICE", "ASSISTED", "WALK_IN", "FAMILY_MEMBER", "EMERGENCY"]);
export const RegistrationMethodEnum = z.enum(["SELF_REGISTRATION", "COORDINATOR_ASSISTED", "FAMILY_PROXY", "WALK_IN", "PHONE_BOOKING"]);
export const TechAccessibilityEnum = z.enum(["FULL_ACCESS", "LIMITED_ACCESS", "NO_ACCESS", "ASSISTED_ACCESS"]);

// ========================================
// USER SCHEMAS
// ========================================

export const baseUserSchema = z.object({
  name: nameSchema,
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  dateOfBirth: dateStringSchema.optional(),
  address: z.string().max(500, "Address must be less than 500 characters").optional(),
  emergencyContact: phoneSchema.optional(),
});

// Require either email or phone
export const userContactSchema = baseUserSchema.refine(
  (data) => data.email || data.phone,
  {
    message: "Either email or phone number is required",
    path: ["email"],
  }
);

export const passwordConfirmationSchema = z.object({
  password: strongPasswordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const userRegistrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  role: z.enum(["USER", "COORDINATOR", "GURUJI", "ADMIN"]).default("USER"),
  isActive: z.boolean().default(true),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const userUpdateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  role: z.enum(["USER", "COORDINATOR", "GURUJI", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const phoneLoginSchema = z.object({
  phone: phoneSchema,
});

export const otpVerificationSchema = z.object({
  phone: phoneSchema,
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

// ========================================
// APPOINTMENT SCHEMAS  
// ========================================

export const appointmentTimeSlotSchema = z.object({
  date: dateStringSchema,
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  duration: z.number().min(5).max(60).default(5), // Duration in minutes
});

export const recurrencePatternSchema = z.object({
  frequency: RecurrenceEnum,
  interval: z.number().min(1).max(12).default(1),
  endDate: futureDateTime.optional(),
  endAfterOccurrences: z.number().min(1).max(52).optional(),
}).refine((data) =>
  data.endDate || data.endAfterOccurrences,
  {
    message: "Either end date or number of occurrences is required",
    path: ["endDate"],
  }
);

export const appointmentBookingSchema = z.object({
  gurujiId: idSchema,
  userId: idSchema.optional(), // For admin/coordinator booking
  timeSlot: appointmentTimeSlotSchema,
  priority: PriorityEnum.default("NORMAL"),
  reason: z.string().max(500, "Reason must be less than 500 characters").optional(),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
  isRecurring: z.boolean().default(false),
  recurrencePattern: recurrencePatternSchema.optional(),
}).refine((data) => {
  if (data.isRecurring && !data.recurrencePattern) {
    return false;
  }
  return true;
}, {
  message: "Recurrence pattern is required when booking recurring appointments",
  path: ["recurrencePattern"],
});

export const appointmentUpdateSchema = z.object({
  timeSlot: appointmentTimeSlotSchema.optional(),
  priority: PriorityEnum.optional(),
  status: AppointmentStatusEnum.optional(),
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  checkedInAt: dateStringSchema.optional(),
});

// ========================================
// REMEDY SCHEMAS
// ========================================

export const remedyTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be less than 200 characters"),
  type: RemedyTypeEnum,
  category: z.string().min(1, "Category is required").max(100, "Category must be less than 100 characters"),
  description: z.string().max(2000, "Description must be less than 2000 characters").optional(),
  instructions: z.string().min(10, "Instructions must be at least 10 characters").max(5000, "Instructions must be less than 5000 characters"),
  dosage: z.string().max(200, "Dosage must be less than 200 characters").optional(),
  duration: z.string().max(100, "Duration must be less than 100 characters").optional(),
  language: z.string().default("en"),
  tags: z.array(z.string().max(50, "Each tag must be less than 50 characters")).max(10, "Maximum 10 tags allowed").default([]),
  isActive: z.boolean().default(true),
});

export const remedyPrescriptionSchema = z.object({
  consultationSessionId: idSchema,
  templateId: idSchema,
  customInstructions: z.string().max(2000, "Custom instructions must be less than 2000 characters").optional(),
  customDosage: z.string().max(200, "Custom dosage must be less than 200 characters").optional(),
  customDuration: z.string().max(100, "Custom duration must be less than 100 characters").optional(),
  sendEmail: z.boolean().default(true),
  sendSms: z.boolean().default(false),
  deliveryNotes: z.string().max(500, "Delivery notes must be less than 500 characters").optional(),
});

// ========================================
// QUEUE SCHEMAS
// ========================================

export const queueEntrySchema = z.object({
  appointmentId: idSchema,
  priority: PriorityEnum.default("NORMAL"),
  estimatedWait: z.number().min(0).optional(), // in minutes
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
});

export const queuePositionUpdateSchema = z.object({
  position: z.number().min(1),
  estimatedWait: z.number().min(0).optional(),
});

// ========================================
// CONSULTATION SCHEMAS
// ========================================

export const consultationSessionSchema = z.object({
  appointmentId: idSchema,
  symptoms: z.string().max(2000, "Symptoms must be less than 2000 characters").optional(),
  diagnosis: z.string().max(2000, "Diagnosis must be less than 2000 characters").optional(),
  notes: z.string().max(5000, "Notes must be less than 5000 characters").optional(),
  recordings: z.array(z.string().url("Invalid recording URL")).optional(),
  startTime: dateStringSchema.optional(),
  endTime: dateStringSchema.optional(),
});

// ========================================
// NOTIFICATION SCHEMAS
// ========================================

export const notificationSchema = z.object({
  userId: idSchema,
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  message: z.string().min(1, "Message is required").max(1000, "Message must be less than 1000 characters"),
  type: NotificationTypeEnum,
  priority: PriorityEnum.default("NORMAL"),
  data: z.record(z.string(), z.unknown()).optional(),
  sendEmail: z.boolean().default(false),
  sendSms: z.boolean().default(false),
  scheduledFor: dateStringSchema.optional(),
});

export const bulkNotificationSchema = z.object({
  userIds: z.array(idSchema).min(1, "At least one user is required"),
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().min(1, "Message is required").max(1000),
  type: NotificationTypeEnum,
  priority: PriorityEnum.default("NORMAL"),
  sendEmail: z.boolean().default(false),
  sendSms: z.boolean().default(false),
  scheduledFor: dateStringSchema.optional(),
});

// ========================================
// SETTINGS SCHEMAS
// ========================================

export const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  pushNotifications: z.boolean().default(true),
  appointmentReminders: z.boolean().default(true),
  queueUpdates: z.boolean().default(true),
  systemAlerts: z.boolean().default(true),
  remedyNotifications: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
});

export const privacySettingsSchema = z.object({
  profileVisibility: z.enum(["public", "private", "coordinators_only"]).default("coordinators_only"),
  shareHealthData: z.boolean().default(false),
  allowAnalytics: z.boolean().default(true),
  dataRetention: z.enum(["3_months", "6_months", "1_year", "2_years", "forever"]).default("1_year"),
  allowFamilyAccess: z.boolean().default(true),
});

export const systemSettingsSchema = z.object({
  siteName: z.string().min(1, "Site name is required").max(100),
  siteDescription: z.string().max(500).optional(),
  contactEmail: emailSchema,
  contactPhone: phoneSchema.optional(),
  timezone: z.string().min(1, "Timezone is required"),
  language: z.string().min(1, "Language is required").default("en"),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).default("DD/MM/YYYY"),
  timeFormat: z.enum(["12", "24"]).default("12"),
  appointmentSlotDuration: z.number().min(15).max(180).default(30),
  maxAdvanceBookingDays: z.number().min(1).max(365).default(90),
  allowCancellation: z.boolean().default(true),
  cancellationDeadlineHours: z.number().min(0).max(168).default(24),
  enableWaitlist: z.boolean().default(true),
  maxWaitlistSize: z.number().min(1).max(100).default(20),
  enableNotifications: z.boolean().default(true),
  enableSmsNotifications: z.boolean().default(false),
  enableEmailNotifications: z.boolean().default(true),
  autoBackupEnabled: z.boolean().default(true),
  backupFrequencyHours: z.number().min(1).max(168).default(24),
  maintenanceMode: z.boolean().default(false),
  maintenanceMessage: z.string().max(500).optional(),
});

// ========================================
// FAMILY CONTACT SCHEMAS
// ========================================

export const familyContactSchema = z.object({
  elderlyPhone: phoneSchema,
  elderlyName: nameSchema,
  familyContactPhone: phoneSchema,
  familyContactName: nameSchema,
  familyContactEmail: emailSchema.optional(),
  relationship: z.string().min(1, "Relationship is required").max(50),
  requestType: z.enum(['register', 'book_appointment', 'check_status', 'get_remedy']),
  message: z.string().max(500).optional(),
  canBookAppointments: z.boolean().default(true),
  canViewRemedies: z.boolean().default(true),
  canReceiveUpdates: z.boolean().default(true),
});

// ========================================
// API QUERY SCHEMAS
// ========================================

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const dateRangeSchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: "Start date must be before or equal to end date",
  path: ["endDate"],
});

export const searchFilterSchema = z.object({
  search: z.string().optional(),
  status: AppointmentStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  type: RemedyTypeEnum.optional(),
  role: RoleEnum.optional(),
  isActive: z.boolean().optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ========================================
// CHECK-IN SCHEMAS
// ========================================

export const qrCheckinSchema = z.object({
  qrCode: z.string().min(1, "QR code is required"),
  location: z.string().optional(),
});

export const manualCheckinSchema = z.object({
  appointmentId: idSchema,
  verificationCode: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// ========================================
// AUDIT LOG SCHEMAS
// ========================================

export const auditLogSchema = z.object({
  action: z.string().min(1, "Action is required"),
  resource: z.string().min(1, "Resource is required"),
  resourceId: z.string().optional(),
  oldData: z.record(z.string(), z.unknown()).optional(),
  newData: z.record(z.string(), z.unknown()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

// ========================================
// PHONE NUMBER UTILITIES
// ========================================

export const normalizePhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  // If it starts with +91, remove it for Indian numbers
  if (phone.startsWith('+91')) {
    return cleaned.substring(2);
  }
  
  // If it starts with 91 and has 12 digits total, remove 91
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned.substring(2);
  }
  
  // If it starts with 0 and has 11 digits, remove the leading 0
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return cleaned.substring(1);
  }
  
  return cleaned;
};

export const formatPhoneForDisplay = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.length === 10 && /^[6-9]\d{9}$/.test(normalized)) {
    // Format Indian mobile as +91 XXXXX XXXXX
    return `+91 ${normalized.substring(0, 5)} ${normalized.substring(5)}`;
  }
  
  return phone; // Return original if can't format
};

export const validateIndianMobile = (phone: string): boolean => {
  const normalized = normalizePhoneNumber(phone);
  return /^[6-9]\d{9}$/.test(normalized);
};

// Enhanced phone schema with normalization
export const normalizedPhoneSchema = phoneSchema.transform((phone) => normalizePhoneNumber(phone));

// ========================================
// VALIDATION UTILITIES
// ========================================

export const validateFutureDate = (date: string | Date): boolean => {
  const inputDate = new Date(date);
  const now = new Date();
  return inputDate > now;
};

export const validateDateRange = (startDate: string | Date, endDate: string | Date): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start < end;
};

export const validateBusinessHours = (dateTime: string | Date): {
  isValid: boolean;
  error?: string;
} => {
  const date = new Date(dateTime);
  const hours = date.getHours();
  const dayOfWeek = date.getDay();
  
  if (dayOfWeek === 0) {
    return { isValid: false, error: "Appointments cannot be scheduled on Sundays" };
  }
  
  if (hours < 9 || hours >= 18) {
    return { isValid: false, error: "Appointments can only be scheduled between 9:00 AM and 6:00 PM" };
  }
  
  return { isValid: true };
};

export const getValidationErrors = (error: z.ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};
  error.errors.forEach((err) => {
    const path = err.path.join(".");
    errors[path] = err.message;
  });
  return errors;
};

// ========================================
// TYPE EXPORTS
// ========================================

export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type PhoneLogin = z.infer<typeof phoneLoginSchema>;
export type OTPVerification = z.infer<typeof otpVerificationSchema>;

export type AppointmentBooking = z.infer<typeof appointmentBookingSchema>;
export type AppointmentUpdate = z.infer<typeof appointmentUpdateSchema>;
export type AppointmentTimeSlot = z.infer<typeof appointmentTimeSlotSchema>;
export type RecurrencePattern = z.infer<typeof recurrencePatternSchema>;

export type RemedyTemplate = z.infer<typeof remedyTemplateSchema>;
export type RemedyPrescription = z.infer<typeof remedyPrescriptionSchema>;

export type QueueEntry = z.infer<typeof queueEntrySchema>;
export type ConsultationSession = z.infer<typeof consultationSessionSchema>;

export type NotificationData = z.infer<typeof notificationSchema>;
export type BulkNotification = z.infer<typeof bulkNotificationSchema>;

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type PrivacySettings = z.infer<typeof privacySettingsSchema>;
export type SystemSettings = z.infer<typeof systemSettingsSchema>;

export type FamilyContact = z.infer<typeof familyContactSchema>;
export type SearchFilter = z.infer<typeof searchFilterSchema>;
export type QRCheckin = z.infer<typeof qrCheckinSchema>;
export type ManualCheckin = z.infer<typeof manualCheckinSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;

export const appointmentFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['BOOKED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  gurujiId: z.string().optional(),
});

// ========================================
// WALK-IN AND ASSISTED BOOKING SCHEMAS
// ========================================

// Quick registration for walk-in users
export const quickRegistrationSchema = z.object({
  name: nameSchema,
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  age: z.number().min(1).max(120).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().max(500).optional(),
  emergencyContact: phoneSchema.optional(),
  emergencyContactName: z.string().max(100).optional(),
  userCategory: UserCategoryEnum.default("WALK_IN"),
  registrationMethod: RegistrationMethodEnum.default("COORDINATOR_ASSISTED"),
  techAccessibility: TechAccessibilityEnum.default("NO_ACCESS"),
  notes: z.string().max(1000).optional(),
  guardianName: z.string().max(100).optional(), // For minors
  guardianPhone: phoneSchema.optional(),
  guardianEmail: emailSchema.optional(),
}).refine(
  (data) => data.phone || data.email || data.guardianPhone,
  {
    message: "At least one contact method (phone, email, or guardian phone) is required",
    path: ["phone"],
  }
);

// Triage assessment for walk-ins
export const triageAssessmentSchema = z.object({
  hasMobile: z.boolean(),
  canUseApp: z.boolean().optional(),
  needsAssistance: z.boolean(),
  isEmergency: z.boolean().default(false),
  hasAppointment: z.boolean(),
  existingDevotee: z.boolean().optional(),
  preferredMethod: z.enum(["SELF_SERVICE", "ASSISTED", "FAMILY_HELP"]).optional(),
  language: z.string().optional(),
  specialNeeds: z.string().max(500).optional(),
});

// Phone-based booking schema
export const phoneBookingSchema = z.object({
  devoteeName: nameSchema,
  devoteePhone: phoneSchema,
  devoteeEmail: emailSchema.optional(),
  callerName: z.string().max(100).optional(),
  callerPhone: phoneSchema.optional(),
  callerRelation: z.string().max(50).optional(),
  gurujiId: idSchema,
  preferredDate: dateStringSchema,
  preferredTime: z.string(),
  reason: z.string().max(500),
  priority: PriorityEnum.default("NORMAL"),
  notes: z.string().max(1000).optional(),
  isCallerDevotee: z.boolean().default(true),
});

// Family/proxy booking schema
export const familyBookingSchema = z.object({
  devoteeName: nameSchema,
  devoteePhone: phoneSchema.optional(),
  devoteeEmail: emailSchema.optional(),
  devoteeAge: z.number().min(1).max(120).optional(),
  devoteeGender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  bookerName: nameSchema,
  bookerPhone: phoneSchema,
  bookerEmail: emailSchema.optional(),
  relationship: z.string().max(50),
  gurujiId: idSchema,
  appointmentDate: dateStringSchema,
  appointmentTime: z.string(),
  reason: z.string().max(500),
  priority: PriorityEnum.default("NORMAL"),
  notes: z.string().max(1000).optional(),
  consentGiven: z.boolean().refine(val => val === true, "Devotee consent is required"),
});

// Emergency queue entry schema
export const emergencyQueueSchema = z.object({
  devoteeName: nameSchema,
  devoteePhone: phoneSchema.optional(),
  emergencyContact: phoneSchema,
  emergencyContactName: nameSchema,
  emergencyNature: z.string().max(500),
  gurujiId: idSchema.optional(), // Can be assigned later
  priority: z.enum(["HIGH", "URGENT"]).default("URGENT"),
  notes: z.string().max(1000).optional(),
  skipNormalQueue: z.boolean().default(true),
});

// User lookup schema
export const userLookupSchema = z.object({
  searchTerm: z.string().min(1, "Search term is required"),
  searchType: z.enum(["PHONE", "EMAIL", "NAME", "ID"]).default("PHONE"),
  includeInactive: z.boolean().default(false),
});

// Reception workflow schema
export const receptionWorkflowSchema = z.object({
  step: z.enum(["TRIAGE", "LOOKUP", "REGISTER", "BOOK", "CHECKIN", "QUEUE"]),
  userCategory: UserCategoryEnum,
  data: z.record(z.string(), z.unknown()).optional(),
  coordinatorId: idSchema,
  timestamp: z.string().default(() => new Date().toISOString()),
});

// Bulk check-in schema for events
export const bulkCheckinSchema = z.object({
  appointmentIds: z.array(idSchema).min(1, "At least one appointment ID is required"),
  coordinatorId: idSchema,
  notes: z.string().max(500).optional(),
  eventType: z.string().max(100).optional(),
});

// ========================================
// TYPE EXPORTS FOR NEW SCHEMAS
// ========================================

export type QuickRegistration = z.infer<typeof quickRegistrationSchema>;
export type TriageAssessment = z.infer<typeof triageAssessmentSchema>;
export type PhoneBooking = z.infer<typeof phoneBookingSchema>;
export type FamilyBooking = z.infer<typeof familyBookingSchema>;
export type EmergencyQueue = z.infer<typeof emergencyQueueSchema>;
export type UserLookup = z.infer<typeof userLookupSchema>;
export type ReceptionWorkflow = z.infer<typeof receptionWorkflowSchema>;
export type BulkCheckin = z.infer<typeof bulkCheckinSchema>;

export type UserCategory = z.infer<typeof UserCategoryEnum>;
export type RegistrationMethod = z.infer<typeof RegistrationMethodEnum>;
export type TechAccessibility = z.infer<typeof TechAccessibilityEnum>;