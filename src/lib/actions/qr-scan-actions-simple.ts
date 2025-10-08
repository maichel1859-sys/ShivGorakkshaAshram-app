'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/prisma';
import { revalidatePath } from 'next/cache';
import { validateLocationQRData } from '@/lib/utils/qr-validation';
import { calculateDistance } from '@/lib/utils/geolocation';
import {
  emitQueueEvent,
  emitAppointmentEvent,
  SocketEventTypes
} from '@/lib/socket/socket-emitter';

interface QRScanData {
  locationId: string; // e.g., "GURUJI_LOC_001"
  locationName: string;
  timestamp: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface TimeWindowConfig {
  beforeAppointment: number; // minutes before appointment
  afterAppointment: number;  // minutes after appointment
}

const TIME_WINDOW_CONFIG: TimeWindowConfig = {
  beforeAppointment: 20,
  afterAppointment: 15
};

/**
 * Normalize appointment time to handle timezone issues
 * This ensures we're comparing times in the same timezone context
 */
function normalizeAppointmentTime(appointmentTime: Date): Date {
  // Get the appointment time components
  const year = appointmentTime.getFullYear();
  const month = appointmentTime.getMonth();
  const date = appointmentTime.getDate();
  const hours = appointmentTime.getHours();
  const minutes = appointmentTime.getMinutes();
  const seconds = appointmentTime.getSeconds();
  
  // Create a new date in the current timezone context
  // This ensures we're working with the same timezone as the current time
  return new Date(year, month, date, hours, minutes, seconds);
}

/**
 * Process QR code scan for appointment check-in with geolocation validation
 * Users must be within 100m of the QR code location to scan successfully
 */
export async function processQRScanSimple(qrData: string, userCoordinates?: { latitude: number; longitude: number }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // Validate QR code data
    const validation = validateLocationQRData(qrData);
    if (!validation.valid) {
      return { success: false, error: validation.error || 'Invalid QR code' };
    }

    const { locationId, locationName, timestamp, coordinates: qrCoordinates } = validation.data!;
    // Use current time as scan time for manual input or simple QR codes
    // For actual QR codes with embedded timestamp, use that timestamp
    const scanTime = timestamp > 0 ? new Date(timestamp) : new Date();

    console.log(`QR Scan attempt - User: ${session.user.id}, Location: ${locationName} (${locationId}), Time: ${scanTime.toISOString()}`);

    // Geolocation validation - user must be within 100 meters of the QR code location
    if (userCoordinates && qrCoordinates) {
      const distance = calculateDistance(userCoordinates, qrCoordinates);
      const maxDistance = 100; // 100 meters
      
      if (distance > maxDistance) {
        return { 
          success: false, 
          error: `You are ${Math.round(distance)}m away from the scanning location. Please move within ${maxDistance}m to scan the QR code.` 
        };
      }
      
      console.log(`✅ Location validation passed - Distance: ${Math.round(distance)}m`);
    } else if (userCoordinates) {
      // If user provided coordinates but QR doesn't have coordinates (legacy QR)
      console.log('⚠️ Warning: QR code does not contain location data');
    }

    // Check if user has appointment for TODAY
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointment = await prisma.appointment.findFirst({
      where: {
        userId: session.user.id,
        date: {
          gte: today,
          lt: tomorrow
        },
        status: {
          in: ['BOOKED', 'CONFIRMED']
        }
      },
      include: {
        guruji: true
      }
    });

    if (!appointment) {
      return { 
        success: false, 
        error: 'No appointment found for today. Please book an appointment first.' 
      };
    }

    // Validate time window (20 min before to 15 min after appointment)
    const appointmentTime = normalizeAppointmentTime(new Date(appointment.startTime));
    const timeWindowStart = new Date(appointmentTime.getTime() - (TIME_WINDOW_CONFIG.beforeAppointment * 60 * 1000));
    const timeWindowEnd = new Date(appointmentTime.getTime() + (TIME_WINDOW_CONFIG.afterAppointment * 60 * 1000));

    // Check if appointment is for today
    const currentDate = new Date();
    const appointmentDate = new Date(appointmentTime.getFullYear(), appointmentTime.getMonth(), appointmentTime.getDate());
    const todayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const isAppointmentToday = appointmentDate.getTime() === todayDate.getTime();

    // Debug logging for time validation
    console.log(`⏰ Time validation debug:`, {
      appointmentTime: appointmentTime.toISOString(),
      appointmentTimeLocal: appointmentTime.toLocaleString(),
      scanTime: scanTime.toISOString(),
      scanTimeLocal: scanTime.toLocaleString(),
      timeWindowStart: timeWindowStart.toISOString(),
      timeWindowEnd: timeWindowEnd.toISOString(),
      timeWindowConfig: TIME_WINDOW_CONFIG,
      timeUntilAppointment: Math.round((appointmentTime.getTime() - scanTime.getTime()) / (1000 * 60)) + ' minutes',
      timezoneOffset: new Date().getTimezoneOffset(),
      isInTimeWindow: scanTime >= timeWindowStart && scanTime <= timeWindowEnd,
      isAppointmentToday: isAppointmentToday,
      appointmentDate: appointmentDate.toISOString(),
      todayDate: todayDate.toISOString()
    });

    // Check if appointment is for today first
    if (!isAppointmentToday) {
      const appointmentTimeStr = `${appointmentTime.toLocaleDateString()} at ${appointmentTime.toLocaleTimeString()}`;
      const todayStr = currentDate.toLocaleDateString();
      
      return { 
        success: false, 
        error: `Your appointment is not for today. Your appointment is scheduled for ${appointmentTimeStr}, but today is ${todayStr}. Please check in on the correct date.` 
      };
    }

    if (scanTime < timeWindowStart) {
      const minutesEarly = Math.round((timeWindowStart.getTime() - scanTime.getTime()) / (1000 * 60));
      
      // Use our centralized time formatting for consistent display
      const appointmentTimeStr = `${appointmentTime.toLocaleDateString()} at ${appointmentTime.toLocaleTimeString()}`;
      const timeWindowStartStr = `${timeWindowStart.toLocaleDateString()} at ${timeWindowStart.toLocaleTimeString()}`;
      const scanTimeStr = `${scanTime.toLocaleDateString()} at ${scanTime.toLocaleTimeString()}`;
      
      return { 
        success: false, 
        error: `Too early to check in. Your appointment is at ${appointmentTimeStr}. You can check in starting from ${timeWindowStartStr}. You are ${minutesEarly} minutes too early. (Current time: ${scanTimeStr})` 
      };
    }

    if (scanTime > timeWindowEnd) {
      const minutesLate = Math.round((scanTime.getTime() - timeWindowEnd.getTime()) / (1000 * 60));
      
      // Use our centralized time formatting for consistent display
      const appointmentTimeStr = `${appointmentTime.toLocaleDateString()} at ${appointmentTime.toLocaleTimeString()}`;
      const timeWindowEndStr = `${timeWindowEnd.toLocaleDateString()} at ${timeWindowEnd.toLocaleTimeString()}`;
      const scanTimeStr = `${scanTime.toLocaleDateString()} at ${scanTime.toLocaleTimeString()}`;
      
      return { 
        success: false, 
        error: `Too late to check in. Your appointment was at ${appointmentTimeStr}. The check-in window closed at ${timeWindowEndStr}. You are ${minutesLate} minutes too late. (Current time: ${scanTimeStr})` 
      };
    }

    // Check if user is already in today's queue
    const existingQueueEntry = await prisma.queueEntry.findFirst({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: today,
          lt: tomorrow
        },
        status: {
          in: ['WAITING', 'IN_PROGRESS']
        }
      }
    });

    if (existingQueueEntry) {
      return { 
        success: false, 
        error: 'You are already in today\'s queue. Please wait for your turn.' 
      };
    }

    // Get current queue position (simplified - we'll use gurujiId for now)
    const currentQueueCount = await prisma.queueEntry.count({
      where: {
        gurujiId: appointment.gurujiId,
        createdAt: {
          gte: today,
          lt: tomorrow
        },
        status: {
          in: ['WAITING', 'IN_PROGRESS']
        }
      }
    });

    const queuePosition = currentQueueCount + 1;

    // Calculate estimated wait time (5 minutes per person)
    const estimatedWaitMinutes = queuePosition * 5;

    // Create queue entry
    const queueEntry = await prisma.queueEntry.create({
      data: {
        appointmentId: appointment.id,
        userId: session.user.id,
        gurujiId: appointment.gurujiId,
        position: queuePosition,
        status: 'WAITING',
        priority: appointment.priority || 'NORMAL',
        estimatedWait: estimatedWaitMinutes,
        checkedInAt: scanTime,
        notes: `Checked in via QR scan at ${locationName}`
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        guruji: {
          select: {
            id: true,
            name: true
          }
        },
        appointment: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            reason: true
          }
        }
      }
    });

    // Update appointment status
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: scanTime
      }
    });

    // Emit real-time socket events for queue and appointment updates
    await emitQueueEvent(
      SocketEventTypes.QUEUE_ENTRY_ADDED,
      queueEntry.id,
      {
        id: queueEntry.id,
        position: queueEntry.position,
        status: queueEntry.status,
        estimatedWait: queueEntry.estimatedWait || 0,
        priority: queueEntry.priority,
        appointmentId: appointment.id
      }
    );

    await emitAppointmentEvent(
      SocketEventTypes.APPOINTMENT_CHECKED_IN,
      appointment.id,
      {
        id: appointment.id,
        userId: session.user.id,
        gurujiId: appointment.gurujiId || '',
        date: appointment.date.toISOString().split('T')[0],
        time: appointment.startTime.toLocaleTimeString(),
        status: 'CHECKED_IN',
        reason: appointment.reason || '',
        priority: appointment.priority,
        position: queuePosition,
        estimatedWait: estimatedWaitMinutes
      }
    );

    console.log(`✅ QR Scan successful - User: ${session.user.id}, Queue Position: ${queuePosition}, Wait Time: ${estimatedWaitMinutes} minutes`);

    revalidatePath('/user/queue');
    revalidatePath('/guruji/queue');
    revalidatePath('/user/appointments');

    return {
      success: true,
      data: {
        queueEntry,
        queuePosition,
        estimatedWaitMinutes,
        locationName,
        message: `Successfully checked in at ${locationName}! You are position ${queuePosition} in the queue. Estimated wait time: ${estimatedWaitMinutes} minutes.`
      }
    };

  } catch (error) {
    console.error('QR Scan error:', error);
    return { success: false, error: 'Failed to process QR scan. Please try again.' };
  }
}

/**
 * Get current queue status for a user (simplified)
 */
export async function getUserQueueStatusSimple() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const queueEntry = await prisma.queueEntry.findFirst({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: today,
          lt: tomorrow
        },
        status: {
          in: ['WAITING', 'IN_PROGRESS']
        }
      },
      include: {
        guruji: {
          select: {
            name: true
          }
        }
      }
    });

    if (!queueEntry) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: queueEntry
    };

  } catch (error) {
    console.error('Get queue status error:', error);
    return { success: false, error: 'Failed to get queue status' };
  }
}

/**
 * Generate static QR code data for a location
 */
export async function generateLocationQRDataSimple(locationId: string, locationName: string): Promise<string> {
  const qrData: QRScanData = {
    locationId,
    locationName,
    timestamp: Date.now()
  };
  
  return JSON.stringify(qrData);
}

/**
 * Process manual text input for check-in (alternative to QR scanning)
 * Users can input the location code instead of scanning QR
 */
export async function processManualTextCheckIn(locationCode: string, userCoordinates?: { latitude: number; longitude: number }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // Create QR data from location code (simulate scanning)
    const locationData = {
      locationId: locationCode.toUpperCase(),
      locationName: getLocationNameFromCode(locationCode),
      timestamp: Date.now(),
      coordinates: getLocationCoordinates(locationCode)
    };

    const qrData = JSON.stringify(locationData);

    // Process using the same logic as QR scanning
    return await processQRScanSimple(qrData, userCoordinates);

  } catch (error) {
    console.error('Manual text check-in error:', error);
    return { success: false, error: 'Failed to process manual check-in. Please try again.' };
  }
}

/**
 * Get location name from location code
 */
function getLocationNameFromCode(locationCode: string): string {
  const locationMap: Record<string, string> = {
    'RECEPTION_001': 'Main Reception',
    'GURUJI_LOC_001': 'Main Consultation Room',
    'GURUJI_LOC_002': 'Secondary Consultation Room',
    'CONSULTATION_001': 'Consultation Room 1',
    'MAIN_HALL_001': 'Main Hall',
    'WAITING_AREA_001': 'Waiting Area',
    'EMERGENCY_001': 'Emergency Room',
  };

  return locationMap[locationCode.toUpperCase()] || `Location ${locationCode}`;
}

/**
 * Get location coordinates from location code
 */
function getLocationCoordinates(locationCode: string): { latitude: number; longitude: number } {
  const coordinatesMap: Record<string, { latitude: number; longitude: number }> = {
    'RECEPTION_001': { latitude: 19.0760, longitude: 72.8777 },
    'GURUJI_LOC_001': { latitude: 19.0761, longitude: 72.8778 },
    'GURUJI_LOC_002': { latitude: 19.0762, longitude: 72.8779 },
    'CONSULTATION_001': { latitude: 19.0763, longitude: 72.8780 },
    'MAIN_HALL_001': { latitude: 19.0764, longitude: 72.8781 },
    'WAITING_AREA_001': { latitude: 19.0765, longitude: 72.8782 },
    'EMERGENCY_001': { latitude: 19.0766, longitude: 72.8783 },
  };

  return coordinatesMap[locationCode.toUpperCase()] || { latitude: 19.0760, longitude: 72.8777 };
}

/**
 * Create a test QR code for development
 */
export async function createTestQRCode(): Promise<string> {
  const qrData = {
    locationId: 'GURUJI_LOC_001',
    locationName: 'Main Consultation Room',
    timestamp: Date.now(),
    coordinates: {
      latitude: 19.0760,
      longitude: 72.8777
    }
  };
  return JSON.stringify(qrData);
}

/**
 * Get user's today's appointment with check-in time window information
 */
export async function getTodayAppointmentWithTimeWindow() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get user's appointment for today
    const appointment = await prisma.appointment.findFirst({
      where: {
        userId: session.user.id,
        date: {
          gte: today,
          lt: tomorrow
        },
        status: {
          in: ['BOOKED', 'CONFIRMED']
        }
      },
      include: {
        guruji: true
      }
    });

    if (!appointment) {
      return { 
        success: false, 
        error: 'No appointment found for today' 
      };
    }

    // Calculate time window
    const appointmentTime = normalizeAppointmentTime(new Date(appointment.startTime));
    const timeWindowStart = new Date(appointmentTime.getTime() - (TIME_WINDOW_CONFIG.beforeAppointment * 60 * 1000));
    const timeWindowEnd = new Date(appointmentTime.getTime() + (TIME_WINDOW_CONFIG.afterAppointment * 60 * 1000));
    const now = new Date();

    // Check if currently in time window
    const isInTimeWindow = now >= timeWindowStart && now <= timeWindowEnd;
    const canCheckIn = isInTimeWindow;

    // Calculate time until check-in window opens
    const minutesUntilWindow = Math.round((timeWindowStart.getTime() - now.getTime()) / (1000 * 60));
    const minutesUntilAppointment = Math.round((appointmentTime.getTime() - now.getTime()) / (1000 * 60));

    return {
      success: true,
      data: {
        appointment,
        timeWindow: {
          start: timeWindowStart,
          end: timeWindowEnd,
          isInTimeWindow,
          canCheckIn,
          minutesUntilWindow: minutesUntilWindow > 0 ? minutesUntilWindow : 0,
          minutesUntilAppointment: minutesUntilAppointment > 0 ? minutesUntilAppointment : 0,
          config: TIME_WINDOW_CONFIG
        }
      }
    };

  } catch (error) {
    console.error('Get today appointment with time window error:', error);
    return { success: false, error: 'Failed to get appointment information' };
  }
}
