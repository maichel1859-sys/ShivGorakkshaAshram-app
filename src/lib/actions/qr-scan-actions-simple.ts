'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';
import { revalidatePath } from 'next/cache';
import { validateLocationQRData } from '@/lib/utils/qr-validation';

interface QRScanData {
  locationId: string; // e.g., "GURUJI_LOC_001"
  locationName: string;
  timestamp: number;
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
 * Process QR code scan for appointment check-in (Simplified version)
 * This works with the current schema while we implement the full location system
 */
export async function processQRScanSimple(qrData: string) {
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

    const { locationId, locationName, timestamp } = validation.data!;
    const scanTime = new Date(timestamp);

    console.log(`QR Scan attempt - User: ${session.user.id}, Location: ${locationName} (${locationId}), Time: ${scanTime.toISOString()}`);

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
    const appointmentTime = new Date(appointment.startTime);
    const timeWindowStart = new Date(appointmentTime.getTime() - (TIME_WINDOW_CONFIG.beforeAppointment * 60 * 1000));
    const timeWindowEnd = new Date(appointmentTime.getTime() + (TIME_WINDOW_CONFIG.afterAppointment * 60 * 1000));

    if (scanTime < timeWindowStart) {
      return { 
        success: false, 
        error: `Too early to check in. Please scan QR code ${TIME_WINDOW_CONFIG.beforeAppointment} minutes before your appointment time.` 
      };
    }

    if (scanTime > timeWindowEnd) {
      return { 
        success: false, 
        error: `Too late to check in. You can only scan within ${TIME_WINDOW_CONFIG.afterAppointment} minutes after your appointment time.` 
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
export async function generateLocationQRData(locationId: string, locationName: string): Promise<string> {
  const qrData: QRScanData = {
    locationId,
    locationName,
    timestamp: Date.now()
  };
  
  return JSON.stringify(qrData);
}

/**
 * Create a test QR code for development
 */
export async function createTestQRCode(): Promise<string> {
  const qrData = {
    locationId: 'GURUJI_LOC_001',
    locationName: 'Main Consultation Room',
    timestamp: Date.now()
  };
  return JSON.stringify(qrData);
}
