'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';
import { revalidatePath } from 'next/cache';

interface TimeWindowConfig {
  beforeAppointment: number; // minutes before appointment
  afterAppointment: number;  // minutes after appointment
}

const TIME_WINDOW_CONFIG: TimeWindowConfig = {
  beforeAppointment: 20,
  afterAppointment: 15
};

/**
 * Search appointments for manual check-in
 * Coordinators can search by name, phone, or email
 */
export async function searchAppointments(searchTerm: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'COORDINATOR') {
    return { success: false, error: 'Coordinator access required' };
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Search for appointments today that match the search term
    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow
        },
        status: {
          in: ['BOOKED', 'CONFIRMED'] // Only show appointments that haven't been checked in
        },
        OR: [
          {
            user: {
              name: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            }
          },
          {
            user: {
              phone: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            }
          },
          {
            user: {
              email: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        guruji: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    if (appointments.length === 0) {
      return { success: false, error: 'No appointments found for today matching your search' };
    }

    return { success: true, data: appointments };

  } catch (error) {
    console.error('Search appointments error:', error);
    return { success: false, error: 'Failed to search appointments' };
  }
}

/**
 * Manual check-in by coordinator
 * This replicates the QR scan functionality but allows coordinators to check in users manually
 */
export async function manualCheckIn(appointmentId: string, locationId: string = 'RECEPTION_001') {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'COORDINATOR') {
    return { success: false, error: 'Coordinator access required' };
  }

  try {
    // Get the appointment details
    const appointment = await prisma.appointment.findUnique({
      where: {
        id: appointmentId
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
        }
      }
    });

    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    // Check if appointment is valid for check-in
    if (!['BOOKED', 'CONFIRMED'].includes(appointment.status)) {
      return { 
        success: false, 
        error: `Cannot check in appointment with status: ${appointment.status}` 
      };
    }

    // Validate time window (same as QR scan)
    const now = new Date();
    const appointmentTime = new Date(appointment.startTime);
    const timeWindowStart = new Date(appointmentTime.getTime() - (TIME_WINDOW_CONFIG.beforeAppointment * 60 * 1000));
    const timeWindowEnd = new Date(appointmentTime.getTime() + (TIME_WINDOW_CONFIG.afterAppointment * 60 * 1000));

    if (now < timeWindowStart) {
      return { 
        success: false, 
        error: `Too early to check in. Check-in opens ${TIME_WINDOW_CONFIG.beforeAppointment} minutes before appointment time.` 
      };
    }

    if (now > timeWindowEnd) {
      return { 
        success: false, 
        error: `Too late to check in. Check-in closes ${TIME_WINDOW_CONFIG.afterAppointment} minutes after appointment time.` 
      };
    }

    // Check if user is already in today's queue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingQueueEntry = await prisma.queueEntry.findFirst({
      where: {
        userId: appointment.userId,
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
        error: 'User is already in today\'s queue. Please check the queue status.' 
      };
    }

    // Get current queue position
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
    const estimatedWaitMinutes = queuePosition * 5; // 5 minutes per person

    // Create queue entry
    const queueEntry = await prisma.queueEntry.create({
      data: {
        appointmentId: appointment.id,
        userId: appointment.userId,
        gurujiId: appointment.gurujiId,
        position: queuePosition,
        status: 'WAITING',
        priority: appointment.priority || 'NORMAL',
        estimatedWait: estimatedWaitMinutes,
        checkedInAt: now,
        notes: `Manually checked in by coordinator at ${getLocationName(locationId)}`
      }
    });

    // Update appointment status
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: now
      }
    });

    console.log(`✅ Manual check-in successful - User: ${appointment.userId}, Coordinator: ${session.user.id}, Queue Position: ${queuePosition}`);

    // Revalidate relevant pages
    revalidatePath('/coordinator/reception');
    revalidatePath('/user/queue');
    revalidatePath('/guruji/queue');
    revalidatePath('/user/appointments');
    revalidatePath('/coordinator/queue');

    return {
      success: true,
      data: {
        queueEntry,
        queuePosition,
        estimatedWaitMinutes,
        locationName: getLocationName(locationId),
        message: `Successfully checked in ${appointment.user.name || 'user'} manually! Queue position: ${queuePosition}, estimated wait: ${estimatedWaitMinutes} minutes.`
      }
    };

  } catch (error) {
    console.error('Manual check-in error:', error);
    return { success: false, error: 'Failed to process manual check-in. Please try again.' };
  }
}

/**
 * Get today's appointments for coordinator dashboard
 */
export async function getTodayAppointments() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'COORDINATOR') {
    return { success: false, error: 'Coordinator access required' };
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        guruji: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    return { success: true, data: appointments };

  } catch (error) {
    console.error('Get today appointments error:', error);
    return { success: false, error: 'Failed to fetch appointments' };
  }
}

/**
 * Get location name from location ID
 */
function getLocationName(locationId: string): string {
  const locationMap: Record<string, string> = {
    'RECEPTION_001': 'Main Reception',
    'GURUJI_LOC_001': 'Consultation Room 1',
    'GURUJI_LOC_002': 'Consultation Room 2', 
    'WAITING_AREA_001': 'Waiting Area',
    'MAIN_HALL_001': 'Main Hall'
  };
  
  return locationMap[locationId] || 'Unknown Location';
}

/**
 * Get appointment details for coordinator
 */
export async function getAppointmentDetails(appointmentId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'COORDINATOR') {
    return { success: false, error: 'Coordinator access required' };
  }

  try {
    const appointment = await prisma.appointment.findUnique({
      where: {
        id: appointmentId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        guruji: {
          select: {
            id: true,
            name: true
          }
        },
      }
    });

    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    return { success: true, data: appointment };

  } catch (error) {
    console.error('Get appointment details error:', error);
    return { success: false, error: 'Failed to fetch appointment details' };
  }
}