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
    // Allow searching appointments from the past 7 days and next 7 days
    // This gives coordinators flexibility to handle late arrivals or early check-ins
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    weekFromNow.setHours(23, 59, 59, 999);

    // Search for appointments in the extended time window
    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: weekAgo,
          lte: weekFromNow
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
      return { success: false, error: 'No appointments found matching your search (searched past 7 days to next 7 days)' };
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

    // Coordinators can check in patients at any time (no time window restrictions)
    // This allows flexibility for late arrivals or early check-ins
    const now = new Date();

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

/**
 * Get all checked-in patients for today
 * Shows patients who are currently in queue or have been checked in
 */
export async function getCheckedInPatients() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !['COORDINATOR', 'ADMIN'].includes(session.user.role)) {
    return { success: false, error: 'Coordinator or Admin access required' };
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all queue entries for today (WAITING, IN_PROGRESS, or recently COMPLETED)
    const queueEntries = await prisma.queueEntry.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        },
        status: {
          in: ['WAITING', 'IN_PROGRESS'] // Only show active queue entries
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
      },
      orderBy: [
        { status: 'asc' }, // IN_PROGRESS first
        { position: 'asc' }, // Then by position
        { createdAt: 'asc' } // Then by check-in time
      ]
    });

    // Also get checked-in appointments that might not have queue entries yet
    const checkedInAppointments = await prisma.appointment.findMany({
      where: {
        status: 'CHECKED_IN',
        date: {
          gte: today,
          lt: tomorrow
        },
        queueEntry: null // Only appointments without queue entries
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
        checkedInAt: 'asc'
      }
    });

    // Combine queue entries and checked-in appointments
    const allPatients = [
      ...queueEntries.map(qe => ({
        id: qe.id,
        type: 'queue_entry' as const,
        status: qe.status,
        checkedInAt: qe.checkedInAt,
        estimatedWait: qe.estimatedWait,
        position: qe.position,
        priority: qe.priority,
        user: qe.user,
        guruji: qe.guruji,
        appointment: qe.appointment
      })),
      ...checkedInAppointments.map(apt => ({
        id: apt.id,
        type: 'appointment' as const,
        status: 'CHECKED_IN' as const,
        checkedInAt: apt.checkedInAt || new Date(),
        estimatedWait: undefined,
        position: undefined,
        priority: apt.priority,
        user: apt.user,
        guruji: apt.guruji,
        appointment: {
          id: apt.id,
          date: apt.date,
          startTime: apt.startTime,
          endTime: apt.endTime,
          reason: apt.reason
        }
      }))
    ];

    // Sort by check-in time and priority
    allPatients.sort((a, b) => {
      // First by status priority (IN_PROGRESS > WAITING > CHECKED_IN)
      const statusOrder: Record<string, number> = {
        'IN_PROGRESS': 0,
        'WAITING': 1,
        'CHECKED_IN': 2,
        'COMPLETED': 3,
        'CANCELLED': 4,
        'NO_SHOW': 5
      };
      const statusDiff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      if (statusDiff !== 0) return statusDiff;

      // Then by priority (URGENT > HIGH > NORMAL > LOW)
      const priorityOrder = { 'URGENT': 0, 'HIGH': 1, 'NORMAL': 2, 'LOW': 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Finally by check-in time
      return a.checkedInAt.getTime() - b.checkedInAt.getTime();
    });

    return { success: true, patients: allPatients };

  } catch (error) {
    console.error('Get checked-in patients error:', error);
    return { success: false, error: 'Failed to fetch checked-in patients' };
  }
}