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
         endTime: new Date(new Date().getTime() + 5 * 60000), // 5 minutes later
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
          devoteeName: session.user.name,
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
          devoteeId: queueEntry.userId,
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

    // Create notification for devotee
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
      
      // If completing a consultation, also end the consultation session and update appointment
      if (data.status === 'COMPLETED') {
        const consultationSession = await prisma.consultationSession.findFirst({
          where: {
            appointmentId: queueEntry.appointmentId,
            devoteeId: queueEntry.userId,
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

        // Update appointment status to COMPLETED
        if (queueEntry.appointmentId) {
          const updatedAppointment = await prisma.appointment.update({
            where: { id: queueEntry.appointmentId },
            data: {
              status: 'COMPLETED',
              updatedAt: new Date(),
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
          console.log(`✅ Updated appointment ${queueEntry.appointmentId} status to COMPLETED`);

          // Broadcast appointment update via socket
          try {
            const socketResponse = await fetch(`${process.env.SOCKET_SERVER_URL || 'https://ashram-queue-socket-server.onrender.com'}/api/broadcast`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                event: 'appointment_update',
                data: {
                  appointmentId: updatedAppointment.id,
                  status: 'COMPLETED',
                  appointment: updatedAppointment,
                  action: 'completed',
                  timestamp: new Date().toISOString(),
                  gurujiId: queueEntry.gurujiId,
                  userId: queueEntry.userId,
                },
                rooms: [
                  `guruji:${queueEntry.gurujiId}`,
                  `user:${queueEntry.userId}`,
                  'appointments',
                  'admin',
                  'coordinator',
                  'global',
                ],
              }),
            });

            if (socketResponse.ok) {
              console.log(`🔌 Broadcasted appointment completion via socket`);
            } else {
              console.warn(`🔌 Failed to broadcast appointment completion:`, await socketResponse.text());
            }
          } catch (socketError) {
            console.error('🔌 Socket broadcast error:', socketError);
            // Continue even if socket fails
          }
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
            devoteeName: session.user.name,
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

    let queueEntry;

    // Check if this is a virtual queue entry (checked-in appointment)
    if (queueEntryId.startsWith('virtual-')) {
      // const isVirtual = true; // Virtual queue entry indicator
      const appointmentId = queueEntryId.replace('virtual-', '');

      // Find the checked-in appointment
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
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

      if (!appointment) {
        return { success: false, error: 'Appointment not found' };
      }

      if (appointment.status !== 'CHECKED_IN') {
        return { success: false, error: 'Appointment is not checked in' };
      }

      if (appointment.gurujiId !== session.user.id) {
        return { success: false, error: 'This appointment is not assigned to you' };
      }

      // Create a real queue entry for this checked-in appointment
      queueEntry = await prisma.queueEntry.create({
        data: {
          appointmentId: appointment.id,
          userId: appointment.userId,
          gurujiId: appointment.gurujiId,
          status: 'IN_PROGRESS',
          position: 1, // Since we're starting immediately
          estimatedWait: 0,
          checkedInAt: appointment.checkedInAt || new Date(),
          startedAt: new Date(),
          notes: `Started from checked-in appointment`,
          priority: appointment.priority || 'NORMAL'
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
    } else {
      // Find the real queue entry
      queueEntry = await prisma.queueEntry.findUnique({
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

      // Check if this guruji can start the consultation
      // Allow if: (1) unassigned devotee, or (2) already assigned to this guruji
      if (queueEntry.gurujiId !== null && queueEntry.gurujiId !== session.user.id) {
        return { success: false, error: 'This devotee is already assigned to another guruji' };
      }

      // Check if queue entry is in waiting status
      if (queueEntry.status !== 'WAITING') {
        return { success: false, error: 'Queue entry is not in waiting status' };
      }

      // Update queue entry status and assign to this guruji if not already assigned
      queueEntry = await prisma.queueEntry.update({
        where: { id: queueEntryId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          gurujiId: session.user.id, // Assign devotee to this guruji
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
    }

    // Create consultation session record
    const consultationSession = await prisma.consultationSession.create({
      data: {
        appointmentId: queueEntry.appointmentId,
        devoteeId: queueEntry.userId,
        gurujiId: session.user.id,
        startTime: new Date(),
      },
    });

    // Update appointment status to IN_PROGRESS
    if (queueEntry.appointmentId) {
      const updatedAppointment = await prisma.appointment.update({
        where: { id: queueEntry.appointmentId },
        data: {
          status: 'IN_PROGRESS',
          updatedAt: new Date(),
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
      console.log(`✅ Updated appointment ${queueEntry.appointmentId} status to IN_PROGRESS`);

      // Broadcast appointment update via socket
      try {
        const socketResponse = await fetch(`${process.env.SOCKET_SERVER_URL || 'https://ashram-queue-socket-server.onrender.com'}/api/broadcast`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event: 'appointment_update',
            data: {
              appointmentId: updatedAppointment.id,
              status: 'IN_PROGRESS',
              appointment: updatedAppointment,
              action: 'started',
              timestamp: new Date().toISOString(),
              gurujiId: session.user.id,
              userId: queueEntry.userId,
            },
            rooms: [
              `guruji:${session.user.id}`,
              `user:${queueEntry.userId}`,
              'appointments',
              'admin',
              'coordinator',
              'global',
            ],
          }),
        });

        if (socketResponse.ok) {
          console.log(`🔌 Broadcasted appointment start via socket`);
        } else {
          console.warn(`🔌 Failed to broadcast appointment start:`, await socketResponse.text());
        }
      } catch (socketError) {
        console.error('🔌 Socket broadcast error:', socketError);
        // Continue even if socket fails
      }
    }

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
      currentDevotee: queueEntry,
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
        devoteeId: queueEntry.userId,
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
        devoteeId: queueEntry.userId,
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
            dateOfBirth: true,
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
            dateOfBirth: true,
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