import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { parse, format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts 12-hour time format to 24-hour format
 * @param time12Hour - Time in 12-hour format (e.g., "9:00 AM", "2:30 PM")
 * @returns Time in 24-hour format (e.g., "09:00", "14:30")
 */
export function convertTimeTo24Hour(time12Hour: string): string {
  try {
    // Parse the 12-hour format (e.g., "9:00 AM", "2:30 PM")
    const parsedTime = parse(time12Hour, "h:mm a", new Date());
    // Format to 24-hour format (e.g., "09:00", "14:30")
    return format(parsedTime, "HH:mm");
  } catch (error) {
    console.error("Error converting time format:", error);
    return time12Hour; // Return original if conversion fails
  }
}

/**
 * Converts 24-hour time format to 12-hour format
 * @param time24Hour - Time in 24-hour format (e.g., "09:00", "14:30")
 * @returns Time in 12-hour format (e.g., "9:00 AM", "2:30 PM")
 */
export function convertTimeTo12Hour(time24Hour: string): string {
  try {
    // Parse the 24-hour format (e.g., "09:00", "14:30")
    const parsedTime = parse(time24Hour, "HH:mm", new Date());
    // Format to 12-hour format (e.g., "9:00 AM", "2:30 PM")
    return format(parsedTime, "h:mm a");
  } catch (error) {
    console.error("Error converting time format:", error);
    return time24Hour; // Return original if conversion fails
  }
}

/**
 * Formats date for API submission (YYYY-MM-DD format)
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForAPI(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Formats date for display (readable format)
 * @param date - Date object or date string
 * @returns Formatted date string for display
 */
export function formatDateForDisplay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, "EEEE, MMMM do, yyyy");
}

/**
 * Formats date and time for display
 * @param date - Date object or date string
 * @param time - Time string (12-hour or 24-hour format)
 * @returns Formatted date and time string for display
 */
export function formatDateTimeForDisplay(date: Date | string, time: string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const formattedDate = format(dateObj, "MMM dd, yyyy");
  const formattedTime = time.includes('AM') || time.includes('PM') ? time : convertTimeTo12Hour(time);
  return `${formattedDate} at ${formattedTime}`;
} 