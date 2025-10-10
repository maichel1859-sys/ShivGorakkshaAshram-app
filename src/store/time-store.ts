/**
 * Centralized Time Store using Zustand
 * Provides consistent time across the entire application
 * All times are managed in IST (Indian Standard Time) timezone
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// IST timezone configuration
const IST_TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET = 5.5 * 60; // IST is UTC+5:30 (5.5 hours = 330 minutes)

interface TimeState {
  // Current time in IST
  currentTime: Date;
  
  // Timezone information
  timezone: string;
  timezoneOffset: number;
  
  // Actions
  updateTime: (newTime: Date) => void;
  getCurrentTime: () => Date;
  getCurrentTimeIST: () => Date;
  formatTime: (date: Date | string) => string;
  formatTimeWithSeconds: (date: Date | string) => string;
  formatDate: (date: Date | string) => string;
  formatDateTime: (date: Date | string) => string;
  formatTimeRange: (start: Date | string, end?: Date | string | null) => string;
  isToday: (date: Date | string) => boolean;
  isAppointmentInTimeWindow: (appointmentTime: Date | string, windowBefore: number, windowAfter: number) => boolean;
}

export const useTimeStore = create<TimeState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentTime: new Date(),
    timezone: IST_TIMEZONE,
    timezoneOffset: IST_OFFSET,

    // Actions
    updateTime: (newTime: Date) => {
      set({ currentTime: newTime });
    },

    getCurrentTime: () => {
      return get().currentTime;
    },

    getCurrentTimeIST: () => {
      const now = new Date();
      // Convert UTC time to IST
      const istTime = new Date(now.getTime() + (IST_OFFSET * 60 * 1000));
      return istTime;
    },

    formatTime: (date: Date | string) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleTimeString('en-IN', {
        timeZone: IST_TIMEZONE,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    },

    formatTimeWithSeconds: (date: Date | string) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleTimeString('en-IN', {
        timeZone: IST_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    },

    formatDate: (date: Date | string) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('en-IN', {
        timeZone: IST_TIMEZONE,
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    },

    formatDateTime: (date: Date | string) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleString('en-IN', {
        timeZone: IST_TIMEZONE,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    },

    formatTimeRange: (start: Date | string, end?: Date | string | null) => {
      const s = typeof start === 'string' ? new Date(start) : start;
      const e = end ? (typeof end === 'string' ? new Date(end) : end) : null;
      const startStr = s.toLocaleTimeString('en-IN', {
        timeZone: IST_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      if (!e) return startStr;
      const endStr = e.toLocaleTimeString('en-IN', {
        timeZone: IST_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      return `${startStr} - ${endStr}`;
    },

    isToday: (date: Date | string) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const currentTime = get().getCurrentTimeIST();
      
      const dateOnly = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
      const todayOnly = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
      
      return dateOnly.getTime() === todayOnly.getTime();
    },

    isAppointmentInTimeWindow: (appointmentTime: Date | string, windowBefore: number, windowAfter: number) => {
      const appointment = typeof appointmentTime === 'string' ? new Date(appointmentTime) : appointmentTime;
      const currentTime = get().getCurrentTimeIST();
      
      const windowStart = new Date(appointment.getTime() - (windowBefore * 60 * 1000));
      const windowEnd = new Date(appointment.getTime() + (windowAfter * 60 * 1000));
      
      return currentTime >= windowStart && currentTime <= windowEnd;
    }
  }))
);

// Auto-update time every second
let timeInterval: NodeJS.Timeout | null = null;

export const startTimeSync = () => {
  if (timeInterval) return; // Already running
  
  timeInterval = setInterval(() => {
    const now = new Date();
    const istTime = new Date(now.getTime() + (IST_OFFSET * 60 * 1000));
    useTimeStore.getState().updateTime(istTime);
  }, 1000);
};

export const stopTimeSync = () => {
  if (timeInterval) {
    clearInterval(timeInterval);
    timeInterval = null;
  }
};

// Socket-based time synchronization
export const syncTimeFromSocket = (serverTime: string | number) => {
  const serverDate = new Date(serverTime);
  const istTime = new Date(serverDate.getTime() + (IST_OFFSET * 60 * 1000));
  useTimeStore.getState().updateTime(istTime);
};

// Utility functions for backward compatibility
export const getCurrentTimeIST = () => useTimeStore.getState().getCurrentTimeIST();
export const formatTimeIST = (date: Date | string) => useTimeStore.getState().formatTime(date);
export const formatDateIST = (date: Date | string) => useTimeStore.getState().formatDate(date);
export const formatDateTimeIST = (date: Date | string) => useTimeStore.getState().formatDateTime(date);

