"use client";

import { toast } from 'sonner';

// Simple toast utility with consistent styling and common use cases
export const showToast = {
  success: (message: string, options?: { duration?: number; id?: string }) => {
    toast.success(message, {
      duration: options?.duration || 4000,
      id: options?.id,
    });
  },

  error: (message: string, options?: { duration?: number; id?: string }) => {
    toast.error(message, {
      duration: options?.duration || 5000,
      id: options?.id,
    });
  },

  info: (message: string, options?: { duration?: number; id?: string }) => {
    toast.info(message, {
      duration: options?.duration || 4000,
      id: options?.id,
    });
  },

  warning: (message: string, options?: { duration?: number; id?: string }) => {
    toast.warning(message, {
      duration: options?.duration || 4000,
      id: options?.id,
    });
  },

  loading: (message: string, options?: { id?: string }) => {
    toast.loading(message, {
      id: options?.id,
    });
  },

  dismiss: (id?: string) => {
    if (id) {
      toast.dismiss(id);
    } else {
      toast.dismiss();
    }
  },
};

// Common toast messages for the app
export const commonToasts = {
  // Auth
  sessionExpired: () => showToast.error('Your session has expired. Please sign in again.', { id: 'session-expired' }),
  accessDenied: () => showToast.error('Access denied. You do not have permission to access this resource.', { id: 'access-denied' }),
  unauthorized: () => showToast.error('Please sign in to access this feature.', { id: 'unauthorized' }),
  
  // Queue
  consultationStarted: (devoteeName: string) => showToast.success(`Started consultation with ${devoteeName}`),
  consultationCompleted: (devoteeName: string) => showToast.success(`Completed consultation with ${devoteeName}`),
  remedyPrescribed: (devoteeName: string) => showToast.success(`Remedy prescribed for ${devoteeName}`),
  
  // Network
  offline: () => showToast.warning('You are offline. Some features may not work.', { id: 'offline-status' }),
  online: () => showToast.success('Connection restored. You are back online.', { id: 'online-status' }),
  connectionError: () => showToast.error('Connection error. Please check your internet connection.', { id: 'connection-error' }),
  
  // Validation
  noPhoneNumber: () => showToast.info('No phone number available'),
  noEmail: () => showToast.info('No email address available'),
  noContactInfo: () => showToast.info('No contact information available'),
  
  // Form errors
  formError: (message: string) => showToast.error(message, { id: 'form-error' }),
  validationError: (field: string, message: string) => showToast.error(`${field}: ${message}`, { id: `validation-${field}` }),
};

// Export toast directly for cases where you need full control
export { toast };
