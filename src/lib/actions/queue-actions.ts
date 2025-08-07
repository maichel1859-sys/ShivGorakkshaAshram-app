'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';
import { z } from 'zod';

// Schemas
const queueStatusSchema = z.object({
  status: z.enum(['WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  estimatedWaitTime: z.number().optional(),
  notes: z.string().optional(),
});

// Get queue status
export async function getQueueStatus() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const [waitingCount, inProgressCount, completedToday, totalToday] = await Promise.all([
      prisma.queueEntry.count({
        where: { status: 'WAITING' },
      }),
      prisma.queueEntry.count({
        where: { status: 'IN_PROGRESS' },
      }),
      prisma.queueEntry.count({
        where: {
          status: 'COMPLETED',
          updatedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.queueEntry.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    const currentQueue = await prisma.queueEntry.findMany({
      where: {
        status: {
          in: ['WAITING', 'IN_PROGRESS'],
        },
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
      orderBy: [
        { status: 'asc' }, // IN_PROGRESS first
        { createdAt: 'asc' }, // Then by creation time
      ],
      take: 10,
    });

    const estimatedWaitTime = waitingCount * 15; // 15 minutes per person

    return {
      success: true,
      queueStatus: {
        waiting: waitingCount,
        inProgress: inProgressCount,
        completedToday,
        totalToday,
        estimatedWaitTime,
        currentQueue,
      },
    };
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

    // Create queue entry
    const queueEntry = await prisma.queueEntry.create({
      data: {
        userId: session.user.id,
        gurujiId,
        appointmentId: crypto.randomUUID(), // Temporary appointment ID
        position: 1, // Will be calculated properly
        status: 'WAITING',
        estimatedWait: 15, // Default 15 minutes
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
      estimatedWaitTime: formData.get('estimatedWaitTime') ? 
        parseInt(formData.get('estimatedWaitTime') as string) : undefined,
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

    // Update queue entry
    const updatedEntry = await prisma.queueEntry.update({
      where: { id: queueEntryId },
      data: {
        status: data.status,
        estimatedWait: data.estimatedWaitTime,
        notes: data.notes,
        ...(data.status === 'COMPLETED' && { completedAt: new Date() }),
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

    revalidatePath('/user/queue');
    revalidatePath('/guruji/queue');
    
    return { success: true, queueEntry: updatedEntry };
  } catch (error) {
    console.error('Update queue status error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
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

    revalidatePath('/user/queue');
    revalidatePath('/guruji/queue');
    
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
    const queueEntries = await prisma.queueEntry.findMany({
      where: {
        userId: session.user.id,
        status: {
          in: ['WAITING', 'IN_PROGRESS'],
        },
      },
      include: {
        guruji: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

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
    const queueEntries = await prisma.queueEntry.findMany({
      where: {
        gurujiId: session.user.id,
        status: {
          in: ['WAITING', 'IN_PROGRESS'],
        },
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
      orderBy: [
        { status: 'asc' }, // IN_PROGRESS first
        { createdAt: 'asc' }, // Then by creation time
      ],
    });

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

    revalidatePath('/guruji/queue');
    revalidatePath('/user/queue');
    
    return { 
      success: true, 
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

    revalidatePath('/guruji/queue');
    revalidatePath('/user/queue');
    
    return { success: true };
  } catch (error) {
    console.error('Complete consultation error:', error);
    return { success: false, error: 'Failed to complete consultation' };
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