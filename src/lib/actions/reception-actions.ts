'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/prisma';
import { z } from 'zod';
import {
  quickRegistrationSchema,
  phoneBookingSchema,
  emergencyQueueSchema,
  userLookupSchema,
  getValidationErrors,
  normalizePhoneNumber,
} from '@/lib/validation/unified-schemas';
import { hash } from 'bcryptjs';
import crypto from 'crypto';
import {
  emitUserEvent,
  emitNotificationEvent,
  emitSystemEvent,
  emitAppointmentEvent,
  emitQueueEvent,
  SocketEventTypes
} from '@/lib/socket/socket-emitter';

// Quick registration for walk-in devotees
export async function createQuickRegistration(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only coordinators can create quick registrations
  if (!['COORDINATOR', 'ADMIN'].includes(session.user.role)) {
    return { success: false, error: 'Access denied. Only coordinators can register walk-in devotees.' };
  }

  try {
    // Parse and validate form data
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string || undefined,
      email: formData.get('email') as string || undefined,
      age: formData.get('age') ? parseInt(formData.get('age') as string) : undefined,
      gender: formData.get('gender') as string || undefined,
      address: formData.get('address') as string || undefined,
      emergencyContact: formData.get('emergencyContact') as string || undefined,
      emergencyContactName: formData.get('emergencyContactName') as string || undefined,
      userCategory: formData.get('userCategory') as string || 'WALK_IN',
      registrationMethod: formData.get('registrationMethod') as string || 'COORDINATOR_ASSISTED',
      techAccessibility: formData.get('techAccessibility') as string || 'NO_ACCESS',
      notes: formData.get('notes') as string || undefined,
      guardianName: formData.get('guardianName') as string || undefined,
      guardianPhone: formData.get('guardianPhone') as string || undefined,
      guardianEmail: formData.get('guardianEmail') as string || undefined,
    };

    const validatedData = quickRegistrationSchema.parse(data);

    // Check if user already exists by phone or email
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(validatedData.phone ? [{ phone: normalizePhoneNumber(validatedData.phone) }] : []),
          ...(validatedData.email ? [{ email: validatedData.email }] : []),
        ],
      },
    });

    if (existingUser) {
      return { 
        success: false, 
        error: 'A user with this phone number or email already exists. Please use the lookup function to find existing devotees.' 
      };
    }

    // Generate a temporary password for the user
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await hash(tempPassword, 12);

    // Create user record
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone ? normalizePhoneNumber(validatedData.phone) : null,
        password: hashedPassword,
        role: 'USER',
        isActive: true,
        
        // Extended fields for walk-in devotees
        dateOfBirth: validatedData.age ? 
          new Date(new Date().getFullYear() - validatedData.age, 0, 1) : null,
        address: validatedData.address,
        emergencyContact: validatedData.emergencyContact ? 
          normalizePhoneNumber(validatedData.emergencyContact) : null,
        
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        resource: 'USER',
        resourceId: user.id,
        newData: {
          name: user.name,
          userCategory: validatedData.userCategory,
          registrationMethod: validatedData.registrationMethod,
        },
      },
    });

    // Create welcome notification for the user (if they have contact info)
    if (user.phone || user.email) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Welcome to ShivGoraksha Ashram',
          message: `Welcome ${user.name}! You have been registered by our reception team. Your temporary password is: ${tempPassword}`,
          type: 'system',
          data: {
            registrationType: 'walk_in',
            coordinatorId: session.user.id,
            tempPassword: tempPassword,
          },
        },
      });
    }

    // Send notification to coordinator
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: 'Walk-in Devotee Registered',
        message: `Successfully registered walk-in devotee: ${user.name}`,
        type: 'system',
        data: {
          devoteeId: user.id,
          devoteeName: user.name,
          registrationType: 'quick_registration',
        },
      },
    });

    // Emit user registration event
    await emitUserEvent(
      SocketEventTypes.USER_UPDATED,
      {
        id: user.id,
        name: user.name || 'Walk-in Devotee',
        email: user.email || '',
        role: 'USER',
        status: 'registered'
      }
    );

    // Emit system event for reception activity
    await emitSystemEvent(
      SocketEventTypes.SYSTEM_UPDATE,
      {
        severity: 'INFO',
        message: `New walk-in devotee registered: ${user.name}`,
        component: 'Reception',
        status: 'registered'
      }
    );

    revalidatePath('/coordinator');
    revalidatePath('/coordinator/reception');

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        userCategory: validatedData.userCategory,
        tempPassword: tempPassword,
      }
    };
  } catch (error) {
    console.error('Quick registration error:', error);
    
    if (error instanceof z.ZodError) {
      const validationErrors = getValidationErrors(error);
      return { success: false, error: Object.values(validationErrors)[0] || 'Validation failed' };
    }
    
    return { success: false, error: 'Failed to register devotee' };
  }
}

// Phone-based booking
export async function createPhoneBooking(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  if (!['COORDINATOR', 'ADMIN'].includes(session.user.role)) {
    return { success: false, error: 'Access denied' };
  }

  try {
    const data = {
      devoteeName: formData.get('devoteeName') as string,
      devoteePhone: formData.get('devoteePhone') as string,
      devoteeEmail: formData.get('devoteeEmail') as string || undefined,
      callerName: formData.get('callerName') as string || undefined,
      callerPhone: formData.get('callerPhone') as string || undefined,
      callerRelation: formData.get('callerRelation') as string || undefined,
      gurujiId: formData.get('gurujiId') as string,
      preferredDate: formData.get('preferredDate') as string,
      preferredTime: formData.get('preferredTime') as string,
      reason: formData.get('reason') as string,
      priority: (formData.get('priority') as string) || 'NORMAL',
      notes: formData.get('notes') as string || undefined,
      isCallerDevotee: formData.get('isCallerDevotee') === 'true',
    };

    const validatedData = phoneBookingSchema.parse(data);

    // Check if devotee exists
    let devotee = await prisma.user.findFirst({
      where: {
        phone: normalizePhoneNumber(validatedData.devoteePhone),
      },
    });

    // If devotee doesn't exist, create them
    if (!devotee) {
      const tempPassword = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await hash(tempPassword, 12);

      devotee = await prisma.user.create({
        data: {
          name: validatedData.devoteeName,
          phone: normalizePhoneNumber(validatedData.devoteePhone),
          email: validatedData.devoteeEmail,
          password: hashedPassword,
          role: 'USER',
          isActive: true,
        },
      });
    }

    // Create appointment
    const appointmentDate = new Date(validatedData.preferredDate);
    const [hours, minutes] = validatedData.preferredTime.split(':').map(Number);
    appointmentDate.setHours(hours, minutes, 0, 0);

    const appointment = await prisma.appointment.create({
      data: {
        userId: devotee.id,
        gurujiId: validatedData.gurujiId,
        date: appointmentDate,
        startTime: appointmentDate,
        endTime: new Date(appointmentDate.getTime() + 5 * 60000), // 5 minutes
        reason: validatedData.reason,
        status: 'BOOKED',
        priority: validatedData.priority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
        notes: validatedData.notes,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
        guruji: {
          select: { id: true, name: true },
        },
      },
    });

    // Create notifications
    await prisma.notification.create({
      data: {
        userId: devotee.id,
        title: 'Appointment Booked via Phone',
        message: `Your appointment with ${appointment.guruji?.name || 'the Guruji'} has been scheduled for ${appointmentDate.toLocaleString()}`,
        type: 'appointment',
        data: {
          appointmentId: appointment.id,
          bookingMethod: 'phone',
          coordinatorId: session.user.id,
        },
      },
    });

    // Emit appointment booking events
    await emitAppointmentEvent(
      SocketEventTypes.APPOINTMENT_CREATED,
      appointment.id,
      {
        id: appointment.id,
        userId: devotee.id,
        gurujiId: validatedData.gurujiId,
        date: appointmentDate.toISOString().split('T')[0],
        time: formatAppointmentTime(appointmentDate),
        status: appointment.status,
        reason: appointment.reason || '',
        priority: appointment.priority
      }
    );

    await emitNotificationEvent(
      SocketEventTypes.NOTIFICATION_SENT,
      appointment.id,
      {
        id: appointment.id,
        title: 'Phone Appointment Booked',
        message: `Appointment scheduled for ${appointmentDate.toLocaleString()}`,
        type: 'appointment',
        read: false,
        userId: devotee.id
      }
    );

    revalidatePath('/coordinator');
    revalidatePath('/coordinator/appointments');
    revalidatePath('/guruji/appointments');

    return {
      success: true,
      appointment: {
        id: appointment.id,
        devoteeName: devotee.name,
        gurujiName: appointment.guruji?.name || null,
        date: appointmentDate.toISOString(),
        status: appointment.status,
      }
    };
  } catch (error) {
    console.error('Phone booking error:', error);
    
    if (error instanceof z.ZodError) {
      const validationErrors = getValidationErrors(error);
      return { success: false, error: Object.values(validationErrors)[0] || 'Validation failed' };
    }
    
    return { success: false, error: 'Failed to create phone booking' };
  }
}

// Emergency queue entry
export async function createEmergencyQueueEntry(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  if (!['COORDINATOR', 'ADMIN'].includes(session.user.role)) {
    return { success: false, error: 'Access denied' };
  }

  try {
    const data = {
      devoteeName: formData.get('devoteeName') as string,
      devoteePhone: formData.get('devoteePhone') as string || undefined,
      emergencyContact: formData.get('emergencyContact') as string,
      emergencyContactName: formData.get('emergencyContactName') as string,
      emergencyNature: formData.get('emergencyNature') as string,
      gurujiId: formData.get('gurujiId') as string || undefined,
      priority: (formData.get('priority') as string) || 'URGENT',
      notes: formData.get('notes') as string || undefined,
      skipNormalQueue: formData.get('skipNormalQueue') !== 'false',
    };

    const validatedData = emergencyQueueSchema.parse(data);

    // Check if devotee exists or create new one
    let devotee = null;
    if (validatedData.devoteePhone) {
      devotee = await prisma.user.findFirst({
        where: { phone: normalizePhoneNumber(validatedData.devoteePhone) },
      });
    }

    if (!devotee) {
      const tempPassword = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await hash(tempPassword, 12);

      devotee = await prisma.user.create({
        data: {
          name: validatedData.devoteeName,
          phone: validatedData.devoteePhone ? 
            normalizePhoneNumber(validatedData.devoteePhone) : null,
          password: hashedPassword,
          role: 'USER',
          isActive: true,
          emergencyContact: normalizePhoneNumber(validatedData.emergencyContact),
        },
      });
    }

    // Create emergency appointment if guruji is specified
    let appointment = null;
    if (validatedData.gurujiId) {
      appointment = await prisma.appointment.create({
        data: {
          userId: devotee.id,
          gurujiId: validatedData.gurujiId,
          date: new Date(),
          startTime: new Date(),
          endTime: new Date(Date.now() + 60 * 60000), // 1 hour
          reason: `EMERGENCY: ${validatedData.emergencyNature}`,
          status: 'BOOKED',
          priority: validatedData.priority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
          notes: validatedData.notes,
        },
      });
    }

    // Create emergency queue entry with priority position
    const queueEntry = await prisma.queueEntry.create({
      data: {
        userId: devotee.id,
        gurujiId: validatedData.gurujiId,
        appointmentId: appointment?.id || '',
        position: 0, // Emergency gets position 0 (highest priority)
        status: 'WAITING',
        priority: validatedData.priority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
        estimatedWait: 0, // Emergency should be seen immediately
        checkedInAt: new Date(),
        notes: `EMERGENCY: ${validatedData.emergencyNature}`,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
        guruji: {
          select: { id: true, name: true },
        },
      },
    });

    // Move all other queue entries down by 1 position
    if (validatedData.gurujiId) {
      await prisma.queueEntry.updateMany({
        where: {
          gurujiId: validatedData.gurujiId,
          id: { not: queueEntry.id },
          status: { in: ['WAITING', 'IN_PROGRESS'] },
        },
        data: {
          position: { increment: 1 },
          estimatedWait: { increment: 15 },
        },
      });
    }

    // Create urgent notifications
    if (validatedData.gurujiId) {
      await prisma.notification.create({
        data: {
          userId: validatedData.gurujiId,
          title: '🚨 EMERGENCY PATIENT',
          message: `Emergency devotee ${validatedData.devoteeName} added to your queue. Nature: ${validatedData.emergencyNature}`,
          type: 'queue',
          data: {
            isEmergency: true,
            queueEntryId: queueEntry.id,
            devoteeId: devotee.id,
            devoteeName: validatedData.devoteeName,
            emergencyNature: validatedData.emergencyNature,
          },
        },
      });
    }

    // Notify all active gurujis if no specific guruji assigned
    if (!validatedData.gurujiId) {
      const activeGurujis = await prisma.user.findMany({
        where: {
          role: 'GURUJI',
          isActive: true,
        },
        select: { id: true },
      });

      for (const guruji of activeGurujis) {
        await prisma.notification.create({
          data: {
            userId: guruji.id,
            title: '🚨 EMERGENCY PATIENT - UNASSIGNED',
            message: `Emergency devotee ${validatedData.devoteeName} needs immediate attention. Nature: ${validatedData.emergencyNature}`,
            type: 'queue',
            data: {
              isEmergency: true,
              queueEntryId: queueEntry.id,
              devoteeId: devotee.id,
              devoteeName: validatedData.devoteeName,
              emergencyNature: validatedData.emergencyNature,
              needsAssignment: true,
            },
          },
        });
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        resource: 'EMERGENCY_QUEUE_ENTRY',
        resourceId: queueEntry.id,
        newData: {
          devoteeName: validatedData.devoteeName,
          emergencyNature: validatedData.emergencyNature,
          priority: validatedData.priority,
          gurujiId: validatedData.gurujiId,
        },
      },
    });

    // Emit emergency queue events
    await emitSystemEvent(
      SocketEventTypes.SYSTEM_UPDATE,
      {
        severity: 'ERROR',
        message: `🚨 EMERGENCY: ${validatedData.devoteeName} - ${validatedData.emergencyNature}`,
        component: 'Emergency Queue',
        status: 'emergency_added'
      }
    );

    if (validatedData.gurujiId) {
      await emitQueueEvent(
        SocketEventTypes.QUEUE_ENTRY_ADDED,
        queueEntry.id,
        {
          id: queueEntry.id,
          position: queueEntry.position,
          status: queueEntry.status,
          estimatedWait: queueEntry.estimatedWait || 0,
          priority: queueEntry.priority,
          appointmentId: appointment?.id
        }
      );
    }

    revalidatePath('/coordinator');
    revalidatePath('/coordinator/queue');
    revalidatePath('/guruji/queue');

    return {
      success: true,
      queueEntry: {
        id: queueEntry.id,
        devoteeName: devotee.name,
        position: queueEntry.position,
        status: queueEntry.status,
        priority: queueEntry.priority,
        isEmergency: true,
      }
    };
  } catch (error) {
    console.error('Emergency queue entry error:', error);
    
    if (error instanceof z.ZodError) {
      const validationErrors = getValidationErrors(error);
      return { success: false, error: Object.values(validationErrors)[0] || 'Validation failed' };
    }
    
    return { success: false, error: 'Failed to create emergency queue entry' };
  }
}

// User lookup function
export async function searchUsers(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  if (!['COORDINATOR', 'ADMIN'].includes(session.user.role)) {
    return { success: false, error: 'Access denied' };
  }

  try {
    const data = {
      searchTerm: formData.get('searchTerm') as string,
      searchType: (formData.get('searchType') as string) || 'PHONE',
      includeInactive: formData.get('includeInactive') === 'true',
    };

    const validatedData = userLookupSchema.parse(data);

    // Build search conditions based on search type
    const whereConditions: Record<string, unknown> = {};

    switch (validatedData.searchType) {
      case 'PHONE':
        whereConditions.phone = {
          contains: normalizePhoneNumber(validatedData.searchTerm),
        };
        break;
      case 'EMAIL':
        whereConditions.email = {
          contains: validatedData.searchTerm,
          mode: 'insensitive',
        };
        break;
      case 'NAME':
        whereConditions.name = {
          contains: validatedData.searchTerm,
          mode: 'insensitive',
        };
        break;
      case 'ID':
        whereConditions.id = validatedData.searchTerm;
        break;
    }

    if (!validatedData.includeInactive) {
      whereConditions.isActive = true;
    }

    // Search users
    const users = await prisma.user.findMany({
      where: whereConditions,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 10,
      orderBy: [
        { updatedAt: 'desc' },
        { name: 'asc' },
      ],
    });

    // Transform results
    const searchResults = users.map(user => ({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      lastVisit: user.updatedAt.toISOString(),
      totalVisits: 0, // Will need to implement separately
      upcomingAppointments: 0, // Will need to implement separately  
      userCategory: 'UNKNOWN', // Metadata not available
    }));

    return { 
      success: true, 
      users: searchResults,
      count: searchResults.length,
    };
  } catch (error) {
    console.error('User search error:', error);
    
    if (error instanceof z.ZodError) {
      const validationErrors = getValidationErrors(error);
      return { success: false, error: Object.values(validationErrors)[0] || 'Validation failed' };
    }
    
    return { success: false, error: 'Failed to search users' };
  }
}
import { formatAppointmentTime } from "@/lib/utils/time-formatting";
