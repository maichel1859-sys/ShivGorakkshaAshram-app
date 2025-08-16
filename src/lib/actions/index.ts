// Server Actions - Main exports
// Organized by functionality for better maintainability

// Authentication & User Management
export * from './auth-actions';
export * from './user-actions';

// Appointment & Queue Management
export * from './appointment-actions';
export * from './queue-actions';
export * from './location-actions';

// Consultation & Check-in
export * from './consultation-actions';
export * from './checkin-actions';

// Remedy & Notification
export * from './remedy-actions';
export * from './notification-actions';

// Settings & Dashboard
export * from './settings-actions';
export * from './dashboard-actions';

// Re-export commonly used actions for convenience
export {
  // Auth actions
  registerUser,
  sendPhoneOTP,
  verifyPhoneOTP,
  addFamilyContact,
  changePassword,
} from './auth-actions';

export {
  // User actions
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
} from './user-actions';

export {
  // Appointment actions
  getAppointments,
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getAppointmentAvailability,
} from './appointment-actions';

export {
  // Queue actions
  joinQueue,
  leaveQueue,
  updateQueueStatus,
} from './queue-actions';

export {
  // Consultation actions
  getConsultations,
  createConsultation,
  updateConsultation,
  deleteConsultation,
} from './consultation-actions';

export {
  // Check-in actions
  checkInWithQR,
  manualCheckIn,
  getCheckInHistory,
} from './checkin-actions';

export {
  // Remedy actions
  getRemedyTemplates,
  prescribeRemedy,
  getUserRemedies,
} from './remedy-actions';

export {
  // Notification actions
  getUserNotifications,
  markNotificationAsRead,
  createNotification,
} from './notification-actions';

export {
  // Settings actions
  getUserSettings,
  updateUserSettings,
  getSystemSettings,
} from './settings-actions';

export {
  // Auth actions
  getFamilyContacts,
} from './auth-actions';

export {
  // Dashboard actions
  getAdminDashboardStats,
  getCoordinatorDashboard,
  getGurujiDashboard,
  getSystemAlerts,
  getUsageReports,
} from './dashboard-actions'; 