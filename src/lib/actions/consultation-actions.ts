'use server';
import { logger } from '@/lib/utils/logger';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/prisma';
import { z } from 'zod';
import {
  consultationSessionSchema,
  getValidationErrors
} from '@/lib/validation/unified-schemas';
import {
  emitConsultationEvent,
  SocketEventTypes
} from '@/lib/socket/socket-emitter';

// Use unified schemas for consistency
const createConsultationSchema = consultationSessionSchema;
// updateConsultationSchema available for future use
// const updateConsultationSchema = consultationSessionSchema.partial();

// Get consultations with filtering
export async function getConsultations(options?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
  gurujiId?: string;
  userId?: string;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const { status, search, limit = 20, offset = 0, gurujiId, userId } = options || {};

    const whereClause: Record<string, unknown> = {};

    // Role-based access control
    if (session.user.role === 'USER') {
      whereClause.appointment = {
        userId: session.user.id,
      };
    } else if (session.user.role === 'GURUJI') {
      whereClause.appointment = {
        gurujiId: session.user.id,
      };
    } else if (session.user.role === 'ADMIN') {
      // Admins can see all, apply optional filters
      if (gurujiId) {
        whereClause.appointment = { gurujiId };
      }
      if (userId) {
        whereClause.appointment = { 
          ...(whereClause.appointment as Record<string, unknown>), 
          userId 
        };
      }
    } else {
      return { success: false, error: 'Insufficient permissions' };
    }

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { symptoms: { contains: search, mode: 'insensitive' } },
        { diagnosis: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [consultations, totalCount] = await Promise.all([
      prisma.consultationSession.findMany({
        where: whereClause,
        include: {
          appointment: {
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
          },
          remedies: {
            include: {
              template: true,
            },
          },
        },
        orderBy: { startTime: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.consultationSession.count({ where: whereClause }),
    ]);

    return {
      success: true,
      consultations,
      total: totalCount,
      hasMore: offset + limit < totalCount,
    };
  } catch (error) {
    logger.error('Get consultations error:', error);
    return { success: false, error: 'Failed to fetch consultations' };
  }
}

// Get single consultation
export async function getConsultation(consultationId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const consultation = await prisma.consultationSession.findUnique({
      where: { id: consultationId },
      include: {
        appointment: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                dateOfBirth: true,
                address: true,
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
        },
        remedies: {
          include: {
            template: true,
          },
        },
      },
    });

    if (!consultation) {
      return { success: false, error: 'Consultation not found' };
    }

    // Check permissions
    const canAccess = 
      session.user.role === 'ADMIN' ||
      (session.user.role === 'GURUJI' && consultation.appointment.gurujiId === session.user.id) ||
      (session.user.role === 'USER' && consultation.appointment.userId === session.user.id);

    if (!canAccess) {
      return { success: false, error: 'Permission denied' };
    }

    return { success: true, consultation };
  } catch (error) {
    logger.error('Get consultation error:', error);
    return { success: false, error: 'Failed to fetch consultation' };
  }
}

// Create consultation
export async function createConsultation(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only gurujis and admins can create consultations
  if (!['GURUJI', 'ADMIN'].includes(session.user.role)) {
    return { success: false, error: 'Only gurujis can create consultations' };
  }

  try {
    const data = createConsultationSchema.parse({
      appointmentId: formData.get('appointmentId') as string,
      symptoms: formData.get('symptoms') as string,
      diagnosis: formData.get('diagnosis') as string || undefined,
      treatment: formData.get('treatment') as string || undefined,
      notes: formData.get('notes') as string || undefined,
      followUpDate: formData.get('followUpDate') as string || undefined,
      medicines: formData.get('medicines') ? JSON.parse(formData.get('medicines') as string) : undefined,
    });

    // Verify appointment exists and guruji has permission
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
      include: {
        user: { select: { id: true, name: true } },
        guruji: { select: { id: true, name: true } },
      },
    });

    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    if (session.user.role === 'GURUJI' && appointment.gurujiId !== session.user.id) {
      return { success: false, error: 'Permission denied' };
    }

    // Check if consultation already exists
    const existingConsultation = await prisma.consultationSession.findUnique({
      where: { appointmentId: data.appointmentId },
    });

    if (existingConsultation) {
      return { success: false, error: 'Consultation already exists for this appointment' };
    }

    // Create consultation
    const consultation = await prisma.consultationSession.create({
      data: {
        gurujiId: session.user.id,
        devoteeId: appointment.userId,
        appointmentId: data.appointmentId,
        startTime: new Date(),
        endTime: null,
        notes: data.notes,
        symptoms: data.symptoms,
        diagnosis: data.diagnosis,
        duration: 0,
      },
      include: {
        guruji: true,
        devotee: true,
        appointment: true,
      },
    });

    // Update appointment status
    await prisma.appointment.update({
      where: { id: data.appointmentId },
      data: { status: 'IN_PROGRESS' },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_CONSULTATION',
        resource: 'CONSULTATION',
        resourceId: consultation.id,
        newData: {
          appointmentId: data.appointmentId,
          devoteeName: appointment.user.name,
          symptoms: data.symptoms,
          diagnosis: data.diagnosis,
        },
      },
    });

    // Emit socket event for real-time updates
    try {
      await emitConsultationEvent(
        SocketEventTypes.CONSULTATION_STARTED,
        consultation.id,
        {
          id: consultation.id,
          startTime: consultation.startTime.toISOString(),
          status: 'IN_PROGRESS',
          notes: consultation.notes || '',
          appointmentId: consultation.appointmentId,
        },
        consultation.devoteeId,
        consultation.gurujiId
      );
    } catch (socketError) {
      logger.warn('🔌 Socket emission failed, using polling fallback:', socketError);
      // Socket failed - clients will use polling fallback automatically
      // No action needed here, React Query will handle stale data refresh
    }

    revalidatePath('/guruji/consultations');
    revalidatePath('/admin/consultations');

    return { success: true, consultation };
  } catch (error) {
    logger.error('Create consultation error:', error);
    if (error instanceof z.ZodError) {
      const validationErrors = getValidationErrors(error);
      return { success: false, error: Object.values(validationErrors)[0] || 'Validation failed' };
    }
    return { success: false, error: 'Failed to create consultation' };
  }
}

// Update consultation
export async function updateConsultation(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const consultationId = formData.get('consultationId') as string;
    
    if (!consultationId) {
      return { success: false, error: 'Consultation ID is required' };
    }

    // Extract form data directly (schema validation may not include all fields)
    const symptoms = formData.get('symptoms') as string || undefined;
    const diagnosis = formData.get('diagnosis') as string || undefined;
    const treatment = formData.get('treatment') as string || undefined;
    const notes = formData.get('notes') as string || undefined;
    const followUpDate = formData.get('followUpDate') as string || undefined;
    const status = (formData.get('status') as string) || undefined;
    const medicines = formData.get('medicines') ? JSON.parse(formData.get('medicines') as string) : undefined;
    
    // Create data object
    const data = {
      symptoms,
      diagnosis,
      treatment,
      notes,
      followUpDate,
      status,
      medicines
    };

    const consultation = await prisma.consultationSession.findUnique({
      where: { id: consultationId },
      include: {
        appointment: true,
      },
    });

    if (!consultation) {
      return { success: false, error: 'Consultation not found' };
    }

    // Check permissions
    const canUpdate = 
      session.user.role === 'ADMIN' ||
      (session.user.role === 'GURUJI' && consultation.appointment.gurujiId === session.user.id);

    if (!canUpdate) {
      return { success: false, error: 'Permission denied' };
    }

    const updateData: Record<string, unknown> = {};
    if (data.symptoms) updateData.symptoms = data.symptoms;
    if (data.diagnosis) updateData.diagnosis = data.diagnosis;
    if (data.notes) updateData.notes = data.notes;
    if (data.treatment) updateData.treatment = data.treatment;
    if (data.followUpDate) updateData.followUpDate = new Date(data.followUpDate);
    if (data.medicines) updateData.medicines = JSON.stringify(data.medicines);
    
    if (data.status === 'COMPLETED') {
      updateData.endTime = new Date();
      updateData.duration = Math.floor((new Date().getTime() - consultation.startTime.getTime()) / 60000); // in minutes
    }

    const updatedConsultation = await prisma.consultationSession.update({
      where: { id: consultationId },
      data: updateData,
    });

    // Update appointment status if consultation is completed
    if (data.status === 'COMPLETED') {
      await prisma.appointment.update({
        where: { id: consultation.appointmentId },
        data: { status: 'COMPLETED' },
      });
    }

    // Emit socket event for real-time updates with fallback mechanism
    try {
      const eventType = data.status === 'COMPLETED'
        ? SocketEventTypes.CONSULTATION_ENDED
        : SocketEventTypes.CONSULTATION_UPDATED;

      await emitConsultationEvent(
        eventType,
        consultation.id,
        {
          id: consultation.id,
          startTime: consultation.startTime.toISOString(),
          endTime: updatedConsultation.endTime?.toISOString(),
          status: data.status || 'IN_PROGRESS',
          notes: data.notes || consultation.notes || '',
          appointmentId: consultation.appointmentId,
        },
        consultation.devoteeId,
        consultation.gurujiId
      );
    } catch (socketError) {
      logger.warn('🔌 Socket emission failed, using polling fallback:', socketError);
      // Socket failed - clients will use polling fallback automatically
      // No action needed here, React Query will handle stale data refresh
    }

    revalidatePath('/guruji/consultations');
    revalidatePath('/admin/consultations');

    return { success: true, consultation: updatedConsultation };
  } catch (error) {
    logger.error('Update consultation error:', error);
    if (error instanceof z.ZodError) {
      const validationErrors = getValidationErrors(error);
      return { success: false, error: Object.values(validationErrors)[0] || 'Validation failed' };
    }
    return { success: false, error: 'Failed to update consultation' };
  }
}

// Delete consultation
export async function deleteConsultation(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only admins can delete consultations
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only admins can delete consultations' };
  }

  try {
    const consultationId = formData.get('consultationId') as string;
    
    if (!consultationId) {
      return { success: false, error: 'Consultation ID is required' };
    }

    const consultation = await prisma.consultationSession.findUnique({
      where: { id: consultationId },
      include: { appointment: true },
    });

    if (!consultation) {
      return { success: false, error: 'Consultation not found' };
    }

    await prisma.consultationSession.delete({
      where: { id: consultationId },
    });

    // Revert appointment status
    await prisma.appointment.update({
      where: { id: consultation.appointmentId },
      data: { status: 'CONFIRMED' },
    });

    revalidatePath('/guruji/consultations');
    revalidatePath('/admin/consultations');
    
    return { success: true };
  } catch (error) {
    logger.error('Delete consultation error:', error);
    return { success: false, error: 'Failed to delete consultation' };
  }
}

// Get consultation statistics
export async function getConsultationStats(options?: {
  gurujiId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const { gurujiId, dateFrom, dateTo } = options || {};

    const whereClause: Record<string, unknown> = {};

    // Role-based filtering
    if (session.user.role === 'GURUJI') {
      whereClause.appointment = { gurujiId: session.user.id };
    } else if (session.user.role === 'ADMIN' && gurujiId) {
      whereClause.appointment = { gurujiId };
    }

    // Date filtering
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      whereClause.startTime = dateFilter;
    }

    const [
      totalConsultations,
      completedConsultations,
      inProgressConsultations,
      cancelledConsultations,
      avgDuration,
    ] = await Promise.all([
      prisma.consultationSession.count({ where: whereClause }),
      prisma.consultationSession.count({ 
        where: { ...whereClause } 
      }),
      prisma.consultationSession.count({ 
        where: { ...whereClause } 
      }),
      prisma.consultationSession.count({ 
        where: { ...whereClause } 
      }),
      prisma.consultationSession.aggregate({
        where: { ...whereClause },
        _avg: {
          duration: true,
        },
      }),
    ]);

    return {
      success: true,
      stats: {
        total: totalConsultations,
        completed: completedConsultations,
        inProgress: inProgressConsultations,
        cancelled: cancelledConsultations,
        averageDuration: Math.round(avgDuration._avg?.duration || 0),
      },
    };
  } catch (error) {
    logger.error('Get consultation stats error:', error);
    return { success: false, error: 'Failed to fetch consultation statistics' };
  }
}

// Get admin consultations
export async function getAdminConsultations() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Admin access required' };
  }

  try {
    const consultations = await prisma.consultationSession.findMany({
      include: {
        devotee: {
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
          },
        },
        appointment: {
          select: {
            id: true,
            date: true,
            startTime: true,
            reason: true,
          },
        },
      },
      orderBy: [
        { startTime: 'desc' },
      ],
    });

    return {
      success: true,
      consultations: consultations.map(consultation => ({
        ...consultation,
        startTime: consultation.startTime.toISOString(),
        endTime: consultation.endTime?.toISOString(),
        appointment: {
          ...consultation.appointment,
          date: consultation.appointment.date.toISOString(),
        },
      })),
    };
  } catch (error) {
    logger.error('Get admin consultations error:', error);
    return { success: false, error: 'Failed to fetch consultations' };
  }
}

// Get guruji consultations
export async function getGurujiConsultations() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  if (session.user.role !== 'GURUJI') {
    return { success: false, error: 'Guruji access required' };
  }

  try {
    const consultations = await prisma.consultationSession.findMany({
      where: {
        gurujiId: session.user.id,
      },
      include: {
        devotee: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        appointment: {
          select: {
            id: true,
            date: true,
            startTime: true,
            reason: true,
          },
        },
        remedies: {
          include: {
            template: {
              select: {
                id: true,
                name: true,
                type: true,
                category: true,
                instructions: true,
                dosage: true,
                duration: true,
              },
            },
          },
        },
      },
      orderBy: [
        { startTime: 'desc' },
      ],
    });

    return {
      success: true,
      consultations: consultations.map(consultation => ({
        ...consultation,
        startTime: consultation.startTime.toISOString(),
        endTime: consultation.endTime?.toISOString(),
        appointment: {
          ...consultation.appointment,
          date: consultation.appointment.date.toISOString(),
          startTime: consultation.appointment.startTime.toISOString(),
        },
      })),
    };
  } catch (error) {
    logger.error('Get guruji consultations error:', error);
    return { success: false, error: 'Failed to fetch consultations' };
  }
}
