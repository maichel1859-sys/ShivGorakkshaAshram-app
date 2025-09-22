'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/prisma';
import { AppointmentStatus } from '@prisma/client';
import { z } from 'zod';
import { 
  appointmentBookingSchema,
  getValidationErrors
} from '@/lib/validation/unified-schemas';
import {
  emitAppointmentEvent,
  SocketEventTypes
} from '@/lib/socket/socket-emitter';

// Use unified schemas for consistency
const appointmentSchema = appointmentBookingSchema;

// Schema for creating appointments for other users
const createAppointmentSchema = z.object({
  devoteeName: z.string().min(1, 'Devotee name is required'),
  devoteePhone: z.string().min(10, 'Valid phone number is required'),
  devoteeEmail: z.string().email().optional().or(z.literal('')),
  gurujiId: z.string().min(1, 'Guruji selection is required'),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  reason: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  notes: z.string().optional(),
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
    // Accept either a serialized `timeSlot` or flat `date`/`time` fields and build the schema payload
    let timeSlot: { date: string; startTime: string; duration?: number } | undefined;
    const rawTimeSlot = formData.get('timeSlot') as string | null;
    if (rawTimeSlot) {
      try {
        timeSlot = JSON.parse(rawTimeSlot);
      } catch {
        // Fallback to flat fields if JSON parse fails
        timeSlot = undefined;
      }
    }

    if (!timeSlot) {
      const date = formData.get('date');
      const time = formData.get('time');
      // If either is missing, let the schema validation surface a clear error below
      if (date && time) {
        timeSlot = {
          date: String(date),
          startTime: String(time),
          duration: 30,
        };
      }
    }

    // Prefer `recurrencePattern` (schema name); support legacy `recurringPattern` if provided
    const recurrencePattern = ((): unknown => {
      const rp = formData.get('recurrencePattern');
      if (rp) return JSON.parse(rp as string);
      const legacy = formData.get('recurringPattern');
      if (legacy) return JSON.parse(legacy as string);
      return undefined;
    })();

    const data = appointmentSchema.parse({
      gurujiId: (formData.get('gurujiId') || undefined) as string | undefined,
      timeSlot,
      reason: (formData.get('reason') || undefined) as string | undefined,
      priority: ((formData.get('priority') as string) || 'NORMAL') as unknown,
      isRecurring: formData.get('isRecurring') === 'true',
      recurrencePattern,
      // Optional: allow admin/coordinator to book on behalf of a user (if schema allows userId)
      userId: (formData.get('userId') || undefined) as string | undefined,
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
    const appointmentDateTime = new Date(`${data.timeSlot.date}T${data.timeSlot.startTime}:00`);
    
    // For development: Allow any date/time (no restrictions)
    // In production, you would add time restrictions here

    const endDateTime = new Date(appointmentDateTime.getTime() + 5 * 60000); // 5 minutes default

    // Check for conflicts
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        gurujiId,
        date: {
          gte: new Date(appointmentDateTime.getTime() - 2 * 60000), // 2 min buffer before
          lte: new Date(appointmentDateTime.getTime() + 2 * 60000), // 2 min buffer after
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
        recurringPattern: data.recurrencePattern ? JSON.stringify(data.recurrencePattern) : undefined,
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

    // Emit appointment created event to all stakeholders
    await emitAppointmentEvent(
      SocketEventTypes.APPOINTMENT_CREATED,
      appointment.id,
      {
        id: appointment.id,
        userId: appointment.userId,
        gurujiId: appointment.gurujiId || '',
        date: appointment.date.toISOString(),
        time: appointment.startTime.toISOString(),
        status: appointment.status,
        priority: appointment.priority,
        reason: appointment.reason || undefined
      }
    );

    revalidatePath('/user/appointments');
    revalidatePath('/admin/appointments');
    revalidatePath('/guruji/appointments');
    revalidatePath('/coordinator/appointments');

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
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
      throw new Error('Appointment not found');
    }

    // Check if user owns the appointment or is admin
    if (appointment.userId !== session.user.id && session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${appointment.notes || ''}\nCancelled: ${reason}` : appointment.notes,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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

    // Emit appointment cancelled event to all stakeholders
    await emitAppointmentEvent(
      SocketEventTypes.APPOINTMENT_CANCELLED,
      updatedAppointment.id,
      {
        id: updatedAppointment.id,
        userId: updatedAppointment.userId,
        gurujiId: updatedAppointment.gurujiId || '',
        date: updatedAppointment.date.toISOString(),
        time: updatedAppointment.startTime.toISOString(),
        status: updatedAppointment.status,
        priority: updatedAppointment.priority,
        reason: reason || undefined
      }
    );

    revalidatePath('/user/appointments');
    revalidatePath('/admin/appointments');
    revalidatePath('/guruji/appointments');
    revalidatePath('/coordinator/appointments');

    return { success: true };
  } catch (error) {
    console.error('Cancel appointment error:', error);
    throw new Error('Failed to cancel appointment');
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

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        date: newDateTime,
        startTime: newDateTime,
        endTime: newEndTime,
        status: 'BOOKED', // Reset to booked if it was confirmed
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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

    // Emit appointment rescheduled event to all stakeholders
    await emitAppointmentEvent(
      SocketEventTypes.APPOINTMENT_RESCHEDULED,
      updatedAppointment.id,
      {
        id: updatedAppointment.id,
        userId: updatedAppointment.userId,
        gurujiId: updatedAppointment.gurujiId || '',
        date: updatedAppointment.date.toISOString(),
        time: updatedAppointment.startTime.toISOString(),
        status: updatedAppointment.status,
        priority: updatedAppointment.priority,
        reason: updatedAppointment.reason || undefined
      }
    );

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

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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

    // Emit appointment updated event to all stakeholders
    await emitAppointmentEvent(
      SocketEventTypes.APPOINTMENT_UPDATED,
      updatedAppointment.id,
      {
        id: updatedAppointment.id,
        userId: updatedAppointment.userId,
        gurujiId: updatedAppointment.gurujiId || '',
        date: updatedAppointment.date.toISOString(),
        time: updatedAppointment.startTime.toISOString(),
        status: updatedAppointment.status,
        priority: updatedAppointment.priority,
        reason: updatedAppointment.reason || undefined
      }
    );

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
      for (let minute = 0; minute < 60; minute += 5) {
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

// Create appointment for another user (Coordinator/Admin only)
export async function createAppointmentForUser(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only Coordinators and Admins can book for others
  if (!['COORDINATOR', 'ADMIN'].includes(session.user.role)) {
    return { success: false, error: 'Access denied' };
  }

  try {
    const data = createAppointmentSchema.parse({
      devoteeName: formData.get('devoteeName') as string,
      devoteePhone: formData.get('devoteePhone') as string,
      devoteeEmail: formData.get('devoteeEmail') as string || undefined,
      gurujiId: formData.get('gurujiId') as string,
      date: formData.get('date') as string,
      startTime: formData.get('startTime') as string,
      reason: formData.get('reason') as string || undefined,
      priority: (formData.get('priority') as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT') || 'NORMAL',
      notes: formData.get('notes') as string || undefined,
    });

    // Check if devotee exists, if not create them
    let devotee = await prisma.user.findUnique({
      where: { phone: data.devoteePhone },
    });

    if (!devotee) {
      // Create new devotee user
      devotee = await prisma.user.create({
        data: {
          name: data.devoteeName,
          phone: data.devoteePhone,
          email: data.devoteeEmail,
          role: 'USER',
          emailVerified: null,
        },
      });
    } else if (devotee.name !== data.devoteeName) {
      // Update devotee name if different
      devotee = await prisma.user.update({
        where: { id: devotee.id },
        data: { name: data.devoteeName },
      });
    }

    // Check guruji availability
    const appointmentDate = new Date(data.date);
    const startTime = new Date(`${data.date}T${data.startTime}`);
    const endTime = new Date(startTime.getTime() + 5 * 60000); // 5 minutes duration

    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        gurujiId: data.gurujiId,
        date: appointmentDate,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          }
        ],
        status: { notIn: ['CANCELLED'] }
      }
    });

    if (conflictingAppointment) {
      return { success: false, error: 'Time slot not available' };
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        userId: devotee.id,
        gurujiId: data.gurujiId,
        date: appointmentDate,
        startTime,
        endTime,
        reason: data.reason,
        priority: data.priority,
        notes: data.notes,
        status: 'BOOKED',
        // Note: Add bookedById field to schema if tracking who booked is needed
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_APPOINTMENT_FOR_USER',
        resource: 'APPOINTMENT',
        resourceId: appointment.id,
        newData: {
          devoteeName: data.devoteeName,
          devoteePhone: data.devoteePhone,
          gurujiId: data.gurujiId,
          date: data.date,
          startTime: data.startTime,
          bookedBy: session.user.role,
        },
      },
    });

    // Broadcast appointment creation for user to all stakeholders
    try {
      const socketResponse = await fetch(`${process.env.SOCKET_SERVER_URL || 'https://ashram-queue-socket-server.onrender.com'}/emit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'appointment.created',
          appointmentId: appointment.id,
          userId: appointment.userId,
          gurujiId: appointment.gurujiId,
          data: {
            appointmentId: appointment.id,
            status: 'BOOKED',
            appointment: appointment,
            action: 'created_for_user',
            timestamp: new Date().toISOString(),
            user: {
              id: appointment.userId,
              name: appointment.user.name,
              email: appointment.user.email,
              phone: appointment.user.phone
            },
            guruji: {
              id: appointment.gurujiId,
              name: appointment.guruji?.name || 'Unknown',
              email: appointment.guruji?.email
            },
            appointmentDate: appointment.date,
            appointmentTime: appointment.startTime,
            reason: appointment.reason,
            priority: appointment.priority,
            createdBy: {
              id: session.user.id,
              role: session.user.role,
              name: session.user.name
            },
          },
        }),
      });

      if (socketResponse.ok) {
        console.log(`🔌 Broadcasted appointment creation for user to all stakeholders`);
      } else {
        console.warn(`🔌 Failed to broadcast appointment creation for user:`, await socketResponse.text());
      }
    } catch (socketError) {
      console.error('🔌 Socket broadcast error:', socketError);
      // Continue even if socket fails
    }

    revalidatePath('/coordinator/appointments');
    revalidatePath('/admin/appointments');
    
    return { 
      success: true, 
      appointment: {
        ...appointment,
        date: appointment.date.toISOString(),
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
      }
    };
  } catch (error) {
    console.error('Create appointment for user error:', error);
    if (error instanceof z.ZodError) {
      const validationErrors = getValidationErrors(error);
      return { success: false, error: Object.values(validationErrors)[0] || 'Validation failed' };
    }
    return { success: false, error: 'Failed to create appointment' };
  }
}

 
