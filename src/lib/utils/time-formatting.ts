/**
 * Centralized time formatting utilities for consistent time display across the application
 * This ensures all appointment times are displayed consistently regardless of user's timezone
 */

import { parseISO } from 'date-fns';

// App-wide timezone configuration (fixed default: IST)
const APP_TIMEZONE = 'Asia/Kolkata';
const APP_TZ_OFFSET = '+05:30';

function ensureDate(input: Date | string): Date {
  return typeof input === 'string' ? new Date(input) : input;
}

function formatInTimeZone(dateTime: Date | string, opts: Intl.DateTimeFormatOptions): string {
  const d = ensureDate(dateTime);
  return new Intl.DateTimeFormat('en-US', { timeZone: APP_TIMEZONE, ...opts }).format(d);
}

/**
 * Convert a local date/time in app timezone to a UTC Date
 * Example: toAppZonedDate('2025-10-09', '09:35') -> Date at 04:05 UTC
 * Example: toAppZonedDate('2025-02-15', '10:00') -> Date representing 10:00 AM IST
 */
export function toAppZonedDate(dateStr: string, timeStr?: string): Date {
  // Normalize time string to HH:MM:SS format
  let time = '00:00:00';
  if (timeStr) {
    const parts = timeStr.split(':');
    if (parts.length === 1) {
      // Just hour, e.g., "10"
      time = `${parts[0].padStart(2, '0')}:00:00`;
    } else if (parts.length === 2) {
      // Hour and minute, e.g., "10:00" or "09:30"
      time = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
    } else {
      // Already has seconds, e.g., "10:00:00"
      time = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
    }
  }

  // Construct an ISO string with explicit offset for IST (+05:30)
  // Example: 2025-02-15T10:00:00+05:30
  const isoString = `${dateStr}T${time}${APP_TZ_OFFSET}`;
  return new Date(isoString);
}

/**
 * Format appointment time consistently across all components
 * Always shows time in 12-hour format with AM/PM
 */
export function formatAppointmentTime(dateTime: Date | string): string {
  return formatInTimeZone(dateTime, { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Format appointment time with leading zero for consistency
 * Shows time in 12-hour format with leading zero (e.g., 05:00 PM)
 */
export function formatAppointmentTimeWithLeadingZero(dateTime: Date | string): string {
  return formatInTimeZone(dateTime, { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Format appointment date consistently
 * Shows date in format: Jan 15, 2024
 */
export function formatAppointmentDate(dateTime: Date | string): string {
  return formatInTimeZone(dateTime, { month: 'short', day: '2-digit', year: 'numeric' });
}

/**
 * Format appointment date and time together
 * Shows: Jan 15, 2024 at 5:00 PM
 */
export function formatAppointmentDateTime(dateTime: Date | string): string {
  const date = formatAppointmentDate(dateTime);
  const time = formatAppointmentTime(dateTime);
  return `${date} at ${time}`;
}

/**
 * Format time range for appointments
 * Shows: 5:00 PM - 5:05 PM
 */
export function formatAppointmentTimeRange(startTime: Date | string, endTime: Date | string): string {
  const startFormatted = formatAppointmentTime(startTime);
  const endFormatted = formatAppointmentTime(endTime);
  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Format time range with leading zeros
 * Shows: 05:00 PM - 05:05 PM
 */
export function formatAppointmentTimeRangeWithLeadingZero(startTime: Date | string, endTime: Date | string): string {
  const startFormatted = formatAppointmentTimeWithLeadingZero(startTime);
  const endFormatted = formatAppointmentTimeWithLeadingZero(endTime);
  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Format time range for appointments with optional end time
 * Shows: 5:00 PM - 5:05 PM or just 5:00 PM if no end time
 */
export function formatAppointmentTimeRangeOptional(startTime: Date | string, endTime?: Date | string | null): string {
  const startFormatted = formatAppointmentTime(startTime);
  if (!endTime) return startFormatted;
  const endFormatted = formatAppointmentTime(endTime);
  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Format check-in time consistently
 * Shows: Checked in at 4:45 PM
 */
export function formatCheckInTime(dateTime: Date | string): string {
  return `Checked in at ${formatAppointmentTime(dateTime)}`;
}

/**
 * Format relative time (e.g., "2 hours ago", "in 30 minutes")
 * Uses date-fns formatDistanceToNow
 */
export function formatRelativeTime(dateTime: Date | string): string {
  const date = typeof dateTime === 'string' ? parseISO(dateTime) : dateTime;
  const now = new Date();
  const diffInMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 0) {
    // Past time
    const absMinutes = Math.abs(diffInMinutes);
    if (absMinutes < 60) {
      return `${absMinutes} minutes ago`;
    } else if (absMinutes < 1440) { // 24 hours
      const hours = Math.floor(absMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return `${formatAppointmentDate(date)} ${formatAppointmentTime(date)}`;
    }
  } else {
    // Future time
    if (diffInMinutes < 60) {
      return `in ${diffInMinutes} minutes`;
    } else if (diffInMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${formatAppointmentDate(date)} ${formatAppointmentTime(date)}`;
    }
  }
}

/**
 * Get time until appointment
 * Shows: "in 2 hours" or "2 hours ago"
 */
export function getTimeUntilAppointment(appointmentTime: Date | string): string {
  const appointment = typeof appointmentTime === 'string' ? parseISO(appointmentTime) : appointmentTime;
  const now = new Date();
  const diffInMinutes = Math.floor((appointment.getTime() - now.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 0) {
    const absMinutes = Math.abs(diffInMinutes);
    if (absMinutes < 60) {
      return `${absMinutes} minutes ago`;
    } else {
      const hours = Math.floor(absMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
  } else {
    if (diffInMinutes < 60) {
      return `in ${diffInMinutes} minutes`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    }
  }
}

/**
 * Check if appointment time is in the past
 */
export function isAppointmentInPast(appointmentTime: Date | string): boolean {
  const appointment = typeof appointmentTime === 'string' ? parseISO(appointmentTime) : appointmentTime;
  return appointment.getTime() < new Date().getTime();
}

/**
 * Check if appointment time is today
 */
export function isAppointmentToday(appointmentTime: Date | string): boolean {
  const appointment = typeof appointmentTime === 'string' ? parseISO(appointmentTime) : appointmentTime;
  const today = new Date();
  return appointment.toDateString() === today.toDateString();
}

/**
 * Check if appointment time is tomorrow
 */
export function isAppointmentTomorrow(appointmentTime: Date | string): boolean {
  const appointment = typeof appointmentTime === 'string' ? parseISO(appointmentTime) : appointmentTime;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return appointment.toDateString() === tomorrow.toDateString();
}

/**
 * Get appointment status based on time
 */
export function getAppointmentTimeStatus(appointmentTime: Date | string): 'upcoming' | 'today' | 'past' {
  const appointment = typeof appointmentTime === 'string' ? parseISO(appointmentTime) : appointmentTime;
  const now = new Date();
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (appointment.getTime() < now.getTime()) {
    return 'past';
  } else if (isAppointmentToday(appointment)) {
    return 'today';
  } else {
    return 'upcoming';
  }
}
