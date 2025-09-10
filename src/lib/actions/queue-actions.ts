'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';
import { z } from 'zod';
import {
  QueueStatusEnum,
  getValidationErrors
} from '@/lib/validation/unified-schemas';
import { 
  invalidateQueueCache, 
  getCachedQueueStatus, 
  getCachedUserQueueStatus, 
  getCachedGurujiQueueEntries 
} from '@/lib/services/queue.service';

// Use unified schemas for consistency
const queueStatusSchema = z.object({
  status: QueueStatusEnum,
  estimatedWait: z.number().optional(),
  notes: z.string().optional(),
});

// Helper function to recalculate queue positions
async function recalculateQueuePositions(gurujiId: string) {
  const queueEntries = await prisma.queueEntry.findMany({
    where: {
      gurujiId,
      status: { in: ['WAITING', 'IN_PROGRESS'] },
    },
    orderBy: [
      { status: 'asc' }, // IN_PROGRESS first
      { createdAt: 'asc' }, // Then by creation time
    ],
  });

  // Update positions sequentially
  for (let i = 0; i < queueEntries.length; i++) {
    await prisma.queueEntry.update({
      where: { id: queueEntries[i].id },
      data: { 
        position: i + 1,
        estimatedWait: (i + 1) * 15, // 15 minutes per position
      },
    });
  }
}

// Get queue status
export async function getQueueStatus() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const queueStatus = await getCachedQueueStatus();
    return { success: true, queueStatus };
  } catch (error) {
    console.error('Get queue status error:', error);
    return { success: false, error: 'Failed to fetch queue status' };
  }
}

// Join queue
export async function joinQueue(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const gurujiId = formData.get('gurujiId') as string;
    const reason = formData.get('reason') as string || 'General consultation';
    
    if (!gurujiId) {
      return { success: false, error: 'Guruji ID is required' };
    }

    // Check if user is already in queue
    const existingEntry = await prisma.queueEntry.findFirst({
      where: {
        userId: session.user.id,
        status: {
          in: ['WAITING', 'IN_PROGRESS'],
        },
      },
    });

    if (existingEntry) {
      return { success: false, error: 'You are already in the queue' };
    }

    // Verify guruji exists and is active
    const guruji = await prisma.user.findFirst({
      where: {
        id: gurujiId,
        role: 'GURUJI',
        isActive: true,
      },
    });

    if (!guruji) {
      return { success: false, error: 'Guruji not found or not available' };
    }

         // Create appointment first
     const appointment = await prisma.appointment.create({
       data: {
         userId: session.user.id,
         gurujiId,
         date: new Date(),
         startTime: new Date(),
         endTime: new Date(new Date().getTime() + 30 * 60000), // 30 minutes later
         reason,
         status: 'BOOKED',
         priority: 'NORMAL',
       },
     });

    // Calculate position in queue
    const queuePosition = await prisma.queueEntry.count({
      where: {
        gurujiId,
        status: {
          in: ['WAITING', 'IN_PROGRESS'],
        },
      },
    }) + 1;

    // Create queue entry
    const queueEntry = await prisma.queueEntry.create({
      data: {
        userId: session.user.id,
        gurujiId,
        appointmentId: appointment.id,
        position: queuePosition,
        status: 'WAITING',
        estimatedWait: queuePosition * 15, // 15 minutes per position
        checkedInAt: new Date(),
        notes: reason,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        guruji: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create notification for guruji
    await prisma.notification.create({
      data: {
        userId: gurujiId,
        title: 'New Queue Entry',
        message: `${session.user.name} has joined your queue`,
        type: 'queue',
        data: {
          queueEntryId: queueEntry.id,
          patientName: session.user.name,
          reason,
        },
      },
    });

    // Recalculate positions for this guruji's queue
    await recalculateQueuePositions(gurujiId);
    
    // Invalidate cache
    invalidateQueueCache();
    revalidatePath('/user/queue');
    revalidatePath('/guruji/queue');
    
    return { success: true, queueEntry };
  } catch (error) {
    console.error('Join queue error:', error);
    return { success: false, error: 'Failed to join queue' };
  }
}

// Update queue status (for gurujis)
export async function updateQueueStatus(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only gurujis can update queue status
  if (session.user.role !== 'GURUJI') {
    return { success: false, error: 'Only gurujis can update queue status' };
  }

  try {
    const queueEntryId = formData.get('queueEntryId') as string;
    const data = queueStatusSchema.parse({
      status: formData.get('status') as 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
      estimatedWait: formData.get('estimatedWait') ? 
        parseInt(formData.get('estimatedWait') as string) : undefined,
      notes: formData.get('notes') as string || undefined,
    });

    if (!queueEntryId) {
      return { success: false, error: 'Queue entry ID is required' };
    }

    // Verify queue entry exists and belongs to this guruji
    const queueEntry = await prisma.queueEntry.findUnique({
      where: { id: queueEntryId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!queueEntry) {
      return { success: false, error: 'Queue entry not found' };
    }

    if (queueEntry.gurujiId !== session.user.id) {
      return { success: false, error: 'Permission denied' };
    }

    // If trying to complete a consultation, check if remedy has been prescribed
    if (data.status === 'COMPLETED') {
      // Find the consultation session
      const consultationSession = await prisma.consultationSession.findFirst({
        where: {
          appointmentId: queueEntry.appointmentId,
          patientId: queueEntry.userId,
          gurujiId: session.user.id,
          endTime: null, // Only active sessions
        },
      });

      if (consultationSession) {
        // Check if any remedy has been prescribed for this consultation
        const remedyCount = await prisma.remedyDocument.count({
          where: {
            consultationSessionId: consultationSession.id,
          },
        });

        if (remedyCount === 0) {
          return { 
            success: false, 
            error: 'Cannot complete consultation without prescribing a remedy. Please prescribe a remedy first.' 
          };
        }
      }
    }

    // Update queue entry
    const updatedEntry = await prisma.queueEntry.update({
      where: { id: queueEntryId },
      data: {
        status: data.status,
        estimatedWait: data.estimatedWait,
        notes: data.notes,
        ...((data.status === 'COMPLETED' || data.status === 'CANCELLED') && { completedAt: new Date() }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create notification for patient
    let notificationMessage = '';
    switch (data.status) {
      case 'IN_PROGRESS':
        notificationMessage = 'Your consultation is now in progress';
        break;
      case 'COMPLETED':
        notificationMessage = 'Your consultation has been completed';
        break;
      case 'CANCELLED':
        notificationMessage = 'Your consultation has been cancelled';
        break;
    }

    if (notificationMessage) {
      await prisma.notification.create({
        data: {
          userId: queueEntry.user.id,
          title: 'Queue Status Update',
          message: notificationMessage,
          type: 'queue',
          data: {
            queueEntryId,
            status: data.status,
            gurujiName: session.user.name,
          },
        },
      });
    }

    // Recalculate positions if status changed to COMPLETED or CANCELLED
    if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
      await recalculateQueuePositions(queueEntry.gurujiId!);
      
      // If completing a consultation, also end the consultation session
      if (data.status === 'COMPLETED') {
        const consultationSession = await prisma.consultationSession.findFirst({
          where: {
            appointmentId: queueEntry.appointmentId,
            patientId: queueEntry.userId,
            gurujiId: session.user.id,
            endTime: null, // Only find active sessions
          },
        });

        if (consultationSession) {
          await prisma.consultationSession.update({
            where: { id: consultationSession.id },
            data: {
              endTime: new Date(),
              duration: Math.floor((new Date().getTime() - consultationSession.startTime.getTime()) / 60000), // in minutes
            },
          });
        }
      }
    }
    
    // Invalidate cache
    try {
      invalidateQueueCache();
      revalidatePath('/user/queue');
      revalidatePath('/guruji/queue');
    } catch (cacheError) {
      console.error('Cache invalidation error:', cacheError);
      // Continue even if cache invalidation fails
    }
    
    return { success: true, queueEntry: updatedEntry };
  } catch (error) {
    console.error('Update queue status error:', error);
    if (error instanceof z.ZodError) {
      const validationErrors = getValidationErrors(error);
      return { success: false, error: Object.values(validationErrors)[0] || 'Validation failed' };
    }
    return { success: false, error: 'Failed to update queue status' };
  }
}

// Leave queue
export async function leaveQueue(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const queueEntryId = formData.get('queueEntryId') as string;
    
    if (!queueEntryId) {
      return { success: false, error: 'Queue entry ID is required' };
    }

    // Verify queue entry exists and belongs to this user
    const queueEntry = await prisma.queueEntry.findUnique({
      where: { id: queueEntryId },
      include: {
        guruji: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!queueEntry) {
      return { success: false, error: 'Queue entry not found' };
    }

    if (queueEntry.userId !== session.user.id) {
      return { success: false, error: 'Permission denied' };
    }

    // Update queue entry status
    await prisma.queueEntry.update({
      where: { id: queueEntryId },
      data: {
        status: 'CANCELLED',
        notes: 'Left queue voluntarily',
        completedAt: new Date(),
      },
    });

    // Create notification for guruji
    if (queueEntry.guruji) {
      await prisma.notification.create({
        data: {
          userId: queueEntry.guruji.id,
          title: 'Queue Entry Cancelled',
          message: `${session.user.name} has left your queue`,
          type: 'queue',
          data: {
            queueEntryId,
            patientName: session.user.name,
          },
        },
      });
    }

    // Recalculate positions for this guruji's queue
    if (queueEntry.gurujiId) {
      await recalculateQueuePositions(queueEntry.gurujiId);
    }
    
    // Invalidate cache
    try {
      invalidateQueueCache();
      revalidatePath('/user/queue');
      revalidatePath('/guruji/queue');
    } catch (cacheError) {
      console.error('Cache invalidation error:', cacheError);
      // Continue even if cache invalidation fails
    }
    
    return { success: true };
  } catch (error) {
    console.error('Leave queue error:', error);
    return { success: false, error: 'Failed to leave queue' };
  }
}

// Get user's queue entries
export async function getUserQueueEntries() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const queueEntry = await getCachedUserQueueStatus(session.user.id);
    const queueEntries = queueEntry ? [queueEntry] : [];
    return { success: true, queueEntries };
  } catch (error) {
    console.error('Get user queue entries error:', error);
    return { success: false, error: 'Failed to fetch queue entries' };
  }
}

// Get guruji's queue entries
export async function getGurujiQueueEntries() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only gurujis can access their queue
  if (session.user.role !== 'GURUJI') {
    return { success: false, error: 'Only gurujis can access queue entries' };
  }

  try {
    const queueEntries = await getCachedGurujiQueueEntries(session.user.id);
    return { success: true, queueEntries };
  } catch (error) {
    console.error('Get guruji queue entries error:', error);
    return { success: false, error: 'Failed to fetch queue entries' };
  }
} 

// Start consultation
export async function startConsultation(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only gurujis can start consultations
  if (session.user.role !== 'GURUJI') {
    return { success: false, error: 'Only gurujis can start consultations' };
  }

  try {
    const queueEntryId = formData.get('queueEntryId') as string;
    
    if (!queueEntryId) {
      return { success: false, error: 'Queue entry ID is required' };
    }

    // Find the queue entry
    const queueEntry = await prisma.queueEntry.findUnique({
      where: { id: queueEntryId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        guruji: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!queueEntry) {
      return { success: false, error: 'Queue entry not found' };
    }

    // Check if this guruji owns the queue entry
    if (queueEntry.gurujiId !== session.user.id) {
      return { success: false, error: 'You can only start consultations for your own queue' };
    }

    // Check if queue entry is in waiting status
    if (queueEntry.status !== 'WAITING') {
      return { success: false, error: 'Queue entry is not in waiting status' };
    }

    // Update queue entry status
    const updatedQueueEntry = await prisma.queueEntry.update({
      where: { id: queueEntryId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    // Create consultation session record
    const consultationSession = await prisma.consultationSession.create({
      data: {
        appointmentId: queueEntry.appointmentId,
        patientId: queueEntry.userId,
        gurujiId: session.user.id,
        startTime: new Date(),
      },
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: queueEntry.userId,
        title: 'Consultation Started',
        message: `${session.user.name} has started your consultation`,
        type: 'consultation',
        data: {
          consultationSessionId: consultationSession.id,
          gurujiName: session.user.name,
        },
      },
    });

    // Invalidate cache
    invalidateQueueCache();
    revalidatePath('/guruji/queue');
    revalidatePath('/user/queue');
    
    return { 
      success: true, 
      message: 'Consultation started successfully',
      consultationSessionId: consultationSession.id,
      consultationSession,
      currentPatient: updatedQueueEntry,
    };
  } catch (error) {
    console.error('Start consultation error:', error);
    return { success: false, error: 'Failed to start consultation' };
  }
}

// Complete consultation
export async function completeConsultation(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only gurujis can complete consultations
  if (session.user.role !== 'GURUJI') {
    return { success: false, error: 'Only gurujis can complete consultations' };
  }

  try {
    const queueEntryId = formData.get('queueEntryId') as string;
    
    if (!queueEntryId) {
      return { success: false, error: 'Queue entry ID is required' };
    }

    // Find the queue entry
    const queueEntry = await prisma.queueEntry.findUnique({
      where: { id: queueEntryId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!queueEntry) {
      return { success: false, error: 'Queue entry not found' };
    }

    // Check if this guruji owns the queue entry
    if (queueEntry.gurujiId !== session.user.id) {
      return { success: false, error: 'You can only complete consultations for your own queue' };
    }

    // Check if queue entry is in progress
    if (queueEntry.status !== 'IN_PROGRESS') {
      return { success: false, error: 'Queue entry is not in progress' };
    }

    // Update queue entry status
    await prisma.queueEntry.update({
      where: { id: queueEntryId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Find and update consultation session
    const consultationSession = await prisma.consultationSession.findFirst({
      where: {
        appointmentId: queueEntry.appointmentId,
        patientId: queueEntry.userId,
        gurujiId: session.user.id,
        endTime: null,
      },
    });

    if (consultationSession) {
      await prisma.consultationSession.update({
        where: { id: consultationSession.id },
        data: {
          endTime: new Date(),
          duration: Math.floor((new Date().getTime() - consultationSession.startTime.getTime()) / 60000), // in minutes
        },
      });
    }

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: queueEntry.userId,
        title: 'Consultation Completed',
        message: `${session.user.name} has completed your consultation`,
        type: 'consultation',
        data: {
          consultationSessionId: consultationSession?.id,
          gurujiName: session.user.name,
        },
      },
    });

    // Recalculate positions for this guruji's queue
    await recalculateQueuePositions(session.user.id);
    
    // Invalidate cache
    invalidateQueueCache();
    revalidatePath('/guruji/queue');
    revalidatePath('/user/queue');
    
    return { success: true };
  } catch (error) {
    console.error('Complete consultation error:', error);
    return { success: false, error: 'Failed to complete consultation' };
  }
} 

// Get consultation session ID for a queue entry
export async function getConsultationSessionId(queueEntryId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // Find the queue entry
    const queueEntry = await prisma.queueEntry.findUnique({
      where: { id: queueEntryId },
      select: {
        id: true,
        appointmentId: true,
        userId: true,
        gurujiId: true,
        status: true,
      },
    });

    if (!queueEntry) {
      return { success: false, error: 'Queue entry not found' };
    }

    // Check if this guruji owns the queue entry
    if (queueEntry.gurujiId !== session.user.id) {
      return { success: false, error: 'Permission denied' };
    }

    // Find the consultation session
    const consultationSession = await prisma.consultationSession.findFirst({
      where: {
        appointmentId: queueEntry.appointmentId,
        patientId: queueEntry.userId,
        gurujiId: session.user.id,
        endTime: null, // Only active sessions
      },
      select: {
        id: true,
      },
    });

    if (!consultationSession) {
      return { success: false, error: 'No active consultation session found' };
    }

    return { 
      success: true, 
      consultationSessionId: consultationSession.id 
    };
  } catch (error) {
    console.error('Get consultation session ID error:', error);
    return { success: false, error: 'Failed to get consultation session ID' };
  }
}

// Get admin queue entries
export async function getAdminQueueEntries() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Admin access required' };
  }

  try {
    const queueEntries = await prisma.queueEntry.findMany({
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
        { status: 'asc' }, // IN_PROGRESS first, then WAITING
        { createdAt: 'asc' },
      ],
    });

    return {
      success: true,
      queueEntries: queueEntries.map(entry => ({
        ...entry,
        checkedInAt: entry.checkedInAt.toISOString(),
        startedAt: entry.startedAt?.toISOString(),
        completedAt: entry.completedAt?.toISOString(),
        appointment: {
          ...entry.appointment,
          date: entry.appointment.date.toISOString(),
        },
      })),
    };
  } catch (error) {
    console.error('Get admin queue entries error:', error);
    return { success: false, error: 'Failed to fetch queue entries' };
  }
}

// Get coordinator queue entries - all queues across gurujis
export async function getCoordinatorQueueEntries() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only coordinators and admins can access all queue entries
  if (!['COORDINATOR', 'ADMIN'].includes(session.user.role)) {
    return { success: false, error: 'Access denied' };
  }

  try {
    const queueEntries = await prisma.queueEntry.findMany({
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
        { gurujiId: 'asc' }, // Group by guruji
        { status: 'asc' }, // IN_PROGRESS first, then WAITING
        { createdAt: 'asc' },
      ],
    });

    return {
      success: true,
      queueEntries: queueEntries.map(entry => ({
        ...entry,
        checkedInAt: entry.checkedInAt.toISOString(),
        startedAt: entry.startedAt?.toISOString(),
        completedAt: entry.completedAt?.toISOString(),
        appointment: {
          ...entry.appointment,
          date: entry.appointment.date.toISOString(),
        },
      })),
    };
  } catch (error) {
    console.error('Get coordinator queue entries error:', error);
    return { success: false, error: 'Failed to fetch queue entries' };
  }
} 