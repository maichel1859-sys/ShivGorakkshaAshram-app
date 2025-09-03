'use server';

import { revalidatePath } from 'next/cache';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';
import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';


const appointmentSchema = z.object({
  gurujiId: z.string().min(1).optional(),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  reason: z.string().max(500, "Reason must be less than 500 characters").optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.object({
    frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
    interval: z.number().min(1).max(12).optional(),
    endDate: z.string().optional(),
  }).optional(),
}).refine((data) => {
  if (data.isRecurring && !data.recurringPattern) {
    return false;
  }
  return true;
}, {
  message: "Recurring pattern is required for recurring appointments",
  path: ["recurringPattern"],
});

// Get appointments for current user or all appointments (for admin)
export async function getAppointments(options?: {
  status?: AppointmentStatus;
  limit?: number;
  offset?: number;
  userId?: string; // For admin to get specific user's appointments
  search?: string;
  date?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const { status, limit = 20, offset = 0, userId, search, date, fromDate, toDate } = options || {};

    // Determine whose appointments to get
    const whereClause: Record<string, unknown> = {};
    
    if (session.user.role === 'ADMIN') {
      // Admin can see all appointments or specific user's appointments
      if (userId) {
        whereClause.userId = userId;
      }
      // If no userId specified for admin, show all appointments
    } else if (session.user.role === 'GURUJI') {
      // Gurujis see appointments assigned to them
      whereClause.gurujiId = session.user.id;
    } else {
      // Regular users see only their appointments
      whereClause.userId = session.user.id;
    }

    if (status) {
      whereClause.status = status;
    }

    // Date filtering
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      whereClause.date = {
        gte: startOfDay,
        lte: endOfDay,
      } as Record<string, Date>;
    } else if (fromDate || toDate) {
      whereClause.date = {} as Record<string, Date>;
      if (fromDate) {
        (whereClause.date as Record<string, Date>).gte = new Date(fromDate);
      }
      if (toDate) {
        (whereClause.date as Record<string, Date>).lte = new Date(toDate);
      }
    }

    // Search filtering
    if (search) {
      whereClause.OR = [
        {
          user: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          user: {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          reason: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          guruji: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          queueEntry: {
            select: {
              position: true,
              status: true,
              estimatedWait: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.appointment.count({
        where: whereClause,
      }),
    ]);

    return {
      success: true,
      appointments,
      total,
      hasMore: offset + limit < total,
    };
  } catch (error) {
    console.error('Get appointments error:', error);
    return { success: false, error: 'Failed to fetch appointments' };
  }
}

// Create appointment (alias for bookAppointment for consistency)
export async function createAppointment(formData: FormData) {
  return bookAppointment(formData);
}

// Book appointment Server Action
export async function bookAppointment(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  try {
    const data = appointmentSchema.parse({
      gurujiId: formData.get('gurujiId') || undefined,
      date: formData.get('date'),
      time: formData.get('time'),
      reason: formData.get('reason') || undefined,
      priority: formData.get('priority') || 'NORMAL',
      isRecurring: formData.get('isRecurring') === 'true',
      recurringPattern: formData.get('recurringPattern') 
        ? JSON.parse(formData.get('recurringPattern') as string)
        : undefined,
    });

    // Get the default Guruji if not specified
    let gurujiId = data.gurujiId;
    if (!gurujiId) {
      // Find the first available Guruji (you might want to implement better logic)
      const guruji = await prisma.user.findFirst({
        where: { role: 'GURUJI', isActive: true },
      });
      if (!guruji) {
        throw new Error('No Guruji available. Please contact support.');
      }
      gurujiId = guruji.id;
    }

    // Validate date and time
    const appointmentDateTime = new Date(`${data.date}T${data.time}:00`);
    
    // For development: Allow any date/time (no restrictions)
    // In production, you would add time restrictions here

    const endDateTime = new Date(appointmentDateTime.getTime() + 30 * 60000); // 30 minutes default

    // Check for conflicts
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        gurujiId,
        date: {
          gte: new Date(appointmentDateTime.getTime() - 15 * 60000), // 15 min buffer before
          lte: new Date(appointmentDateTime.getTime() + 15 * 60000), // 15 min buffer after
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
    });

    if (existingAppointment) {
      throw new Error('This time slot is not available. Please choose a different time.');
    }

    // Generate unique appointment ID (no individual QR code needed)
    const appointmentId = crypto.randomUUID();

    // Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        id: appointmentId,
        userId: session.user.id,
        gurujiId,
        date: appointmentDateTime,
        startTime: appointmentDateTime,
        endTime: endDateTime,
        reason: data.reason,
        priority: data.priority,
        isRecurring: data.isRecurring,
        recurringPattern: data.recurringPattern ? JSON.stringify(data.recurringPattern) : undefined,
        // No individual QR code - users will scan location QR code
        status: 'BOOKED',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        guruji: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    revalidatePath('/user/appointments');
    revalidatePath('/admin/appointments');
    revalidatePath('/guruji/appointments');
    
    return { success: true, appointment };
  } catch (error) {
    console.error('Book appointment error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to book appointment');
  }
}

// Cancel appointment Server Action
export async function cancelAppointment(appointmentId: string, reason?: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { user: true },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Check if user owns the appointment or is admin
    if (appointment.userId !== session.user.id && session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${appointment.notes || ''}\nCancelled: ${reason}` : appointment.notes,
      },
    });

    revalidatePath('/user/appointments');
    revalidatePath('/admin/appointments');
    
    return { success: true };
  } catch (error) {
    console.error('Cancel appointment error:', error);
    throw new Error('Failed to cancel appointment');
  }
}

// Check-in appointment Server Action
export async function checkInAppointment(appointmentId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { 
        user: true,
        guruji: true,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.userId !== session.user.id && session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    // Check if appointment is already checked in
    if (appointment.status === 'CHECKED_IN') {
      throw new Error('Appointment is already checked in');
    }

    // Get the next position in the queue for this guruji
    const lastQueueEntry = await prisma.queueEntry.findFirst({
      where: {
        gurujiId: appointment.gurujiId,
        status: { in: ['WAITING', 'IN_PROGRESS'] },
      },
      orderBy: { position: 'desc' },
    });

    const nextPosition = (lastQueueEntry?.position || 0) + 1;

    // Update appointment status and create queue entry in a transaction
    const [updatedAppointment, queueEntry] = await prisma.$transaction([
      prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'CHECKED_IN',
          checkedInAt: new Date(),
        },
      }),
      prisma.queueEntry.create({
        data: {
          appointmentId: appointmentId,
          userId: appointment.userId,
          gurujiId: appointment.gurujiId!,
          position: nextPosition,
          status: 'WAITING',
          priority: appointment.priority,
          checkedInAt: new Date(),
          estimatedWait: 0, // No wait time for development
        },
      }),
    ]);

    // Create notification for the guruji
    await prisma.notification.create({
      data: {
        userId: appointment.gurujiId!,
        title: 'New Patient Checked In',
        message: `${appointment.user.name} has checked in and is ready for consultation`,
        type: 'queue',
        data: {
          appointmentId: appointmentId,
          patientName: appointment.user.name,
          position: nextPosition,
          estimatedWait: 0,
        },
      },
    });

    revalidatePath('/user/appointments');
    revalidatePath('/admin/appointments');
    revalidatePath('/guruji/queue');
    revalidatePath('/user/queue');
    
    return { success: true, queueEntry };
  } catch (error) {
    console.error('Check-in appointment error:', error);
    throw new Error('Failed to check in');
  }
}

// Reschedule appointment Server Action
export async function rescheduleAppointment(appointmentId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  try {
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;

    if (!date || !time) {
      throw new Error('Date and time are required');
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.userId !== session.user.id && session.user.role !== 'ADMIN') {
      throw new Error('Permission denied');
    }

    // Validate new date and time
    const newDateTime = new Date(`${date}T${time}:00`);
    
    // For development: Allow any date/time (no restrictions)
    // In production, you would add time restrictions here

    // Check for conflicts (excluding current appointment)
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        gurujiId: appointment.gurujiId,
        id: { not: appointmentId },
        date: {
          gte: new Date(newDateTime.getTime() - 15 * 60000),
          lte: new Date(newDateTime.getTime() + 15 * 60000),
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
    });

    if (existingAppointment) {
      throw new Error('This time slot is not available. Please choose a different time.');
    }

    const newEndTime = new Date(newDateTime.getTime() + 30 * 60000);

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        date: newDateTime,
        startTime: newDateTime,
        endTime: newEndTime,
        status: 'BOOKED', // Reset to booked if it was confirmed
      },
    });

    revalidatePath('/user/appointments');
    revalidatePath('/admin/appointments');
    
    return { success: true };
  } catch (error) {
    console.error('Reschedule appointment error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to reschedule appointment');
  }
}

// Update appointment Server Action
export async function updateAppointment(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // id is now passed as parameter, not from formData
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    const status = formData.get('status') as AppointmentStatus;
    const notes = formData.get('notes') as string;

    if (!id) {
      return { success: false, error: 'Appointment ID is required' };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    // Check permissions
    if (appointment.userId !== session.user.id && !['ADMIN', 'STAFF'].includes(session.user.role)) {
      return { success: false, error: 'Permission denied' };
    }

    const updateData: Record<string, unknown> = {};

    if (date && time) {
      const newDateTime = new Date(`${date}T${time}:00`);
      updateData.date = newDateTime;
      updateData.startTime = newDateTime;
      updateData.endTime = new Date(newDateTime.getTime() + 30 * 60000);
    }

    if (status) {
      updateData.status = status;
    }

    if (notes !== null) {
      updateData.notes = notes;
    }

    await prisma.appointment.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/user/appointments');
    revalidatePath('/admin/appointments');
    
    return { success: true };
  } catch (error) {
    console.error('Update appointment error:', error);
    return { success: false, error: 'Failed to update appointment' };
  }
}

// Delete appointment Server Action
export async function deleteAppointment(id: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    if (!id) {
      return { success: false, error: 'Appointment ID is required' };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    // Check permissions
    if (appointment.userId !== session.user.id && !['ADMIN', 'STAFF'].includes(session.user.role)) {
      return { success: false, error: 'Permission denied' };
    }

    await prisma.appointment.delete({
      where: { id },
    });

    revalidatePath('/user/appointments');
    revalidatePath('/admin/appointments');
    
    return { success: true };
  } catch (error) {
    console.error('Delete appointment error:', error);
    return { success: false, error: 'Failed to delete appointment' };
  }
}

// Update appointment status Server Action
export async function updateAppointmentStatus(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const id = formData.get('id') as string;
    const status = formData.get('status') as AppointmentStatus;

    if (!id || !status) {
      return { success: false, error: 'Appointment ID and status are required' };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    // Check permissions - only admin/staff can change status
    if (!['ADMIN', 'STAFF'].includes(session.user.role)) {
      return { success: false, error: 'Permission denied' };
    }

    await prisma.appointment.update({
      where: { id },
      data: { status },
    });

    revalidatePath('/user/appointments');
    revalidatePath('/admin/appointments');
    
    return { success: true };
  } catch (error) {
    console.error('Update appointment status error:', error);
    return { success: false, error: 'Failed to update appointment status' };
  }
}

// Get appointment availability Server Action
export async function getAppointmentAvailability(options?: {
  date?: string;
  gurujiId?: string;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const { date, gurujiId } = options || {};
    
    if (!date) {
      return { success: false, error: 'Date is required' };
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // For development: Allow all days
    // In production, you would check for Sundays here

    // Get existing appointments for the day
    const whereClause: Record<string, unknown> = {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        notIn: ['CANCELLED', 'NO_SHOW'],
      },
    };

    if (gurujiId) {
      whereClause.gurujiId = gurujiId;
    }

    const existingAppointments = await prisma.appointment.findMany({
      where: whereClause,
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // Generate time slots (24 hours for development)
    const timeSlots = [];
    const businessStart = 0; // 12 AM
    const businessEnd = 24; // 12 AM next day

    for (let hour = businessStart; hour < businessEnd; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = new Date(targetDate);
        slotTime.setHours(hour, minute, 0, 0);
        
        // Check if this slot conflicts with existing appointments
        const isAvailable = !existingAppointments.some(apt => {
          const aptStart = new Date(apt.startTime);
          const aptEnd = new Date(apt.endTime);
          return slotTime >= aptStart && slotTime < aptEnd;
        });

        // For development: Allow all time slots (no future restriction)
        const isInFuture = true;

        timeSlots.push({
          time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          available: isAvailable && isInFuture,
        });
      }
    }

    return { success: true, availability: timeSlots };
  } catch (error) {
    console.error('Get appointment availability error:', error);
    return { success: false, error: 'Failed to get availability' };
  }
}

// Get coordinator appointments
export async function getCoordinatorAppointments() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only Coordinators and Admins can access this
  if (!['COORDINATOR', 'ADMIN'].includes(session.user.role)) {
    return { success: false, error: 'Access denied' };
  }

  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        guruji: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return {
      success: true,
      appointments: appointments.map(appointment => ({
        ...appointment,
        date: appointment.date.toISOString(),
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
      })),
    };
  } catch (error) {
    console.error('Get coordinator appointments error:', error);
    return { success: false, error: 'Failed to fetch appointments' };
  }
} 

export async function getAppointment(id: string) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        guruji: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!appointment) {
      return {
        success: false,
        error: 'Appointment not found'
      };
    }

    return {
      success: true,
      appointment
    };
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return {
      success: false,
      error: 'Failed to fetch appointment'
    };
  }
}

// Development helper server action for check-in
export async function devCheckInAppointment(formData: FormData) {
  const appointmentId = formData.get("appointmentId") as string;
  if (appointmentId) {
    return await checkInAppointment(appointmentId);
  }
  return { success: false, error: 'Appointment ID is required' };
} 