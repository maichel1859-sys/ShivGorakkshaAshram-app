'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';
import { z } from 'zod';
import {
  remedyPrescriptionSchema,
  getValidationErrors
} from '@/lib/validation/unified-schemas';

// Use unified schemas for consistency
const updateRemedySchema = remedyPrescriptionSchema.partial();

const sendRemedySchema = z.object({
  customMessage: z.string().optional(),
});

// Get user remedies
export async function getUserRemedies() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const remedies = await prisma.remedyDocument.findMany({
      where: {
        consultationSession: {
          patientId: session.user.id
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        template: true,
        consultationSession: {
          include: {
            appointment: {
              include: {
                guruji: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const formattedRemedies = remedies.map(remedy => ({
      id: remedy.id,
      templateName: remedy.template.name,
      gurujiName: remedy.consultationSession.appointment.guruji?.name || 'Unknown',
      consultationDate: remedy.consultationSession.createdAt.toISOString().split('T')[0],
      status: 'ACTIVE' as const, // Default status since RemedyDocument doesn't have status
      customInstructions: remedy.customInstructions || '',
      customDosage: remedy.customDosage || '',
      customDuration: remedy.customDuration || '',
      pdfUrl: remedy.pdfUrl || '',
      emailSent: remedy.emailSent,
      deliveredAt: remedy.deliveredAt?.toISOString() || '',
      createdAt: remedy.createdAt.toISOString().split('T')[0],
    }));

    return { success: true, remedies: formattedRemedies };
  } catch (error) {
    console.error('Error fetching user remedies:', error);
    return { success: false, error: 'Failed to fetch remedies' };
  }
}

// Update remedy details
export async function updateRemedy(remedyId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const data = updateRemedySchema.parse({
      customInstructions: formData.get('customInstructions') as string || undefined,
      customDosage: formData.get('customDosage') as string || undefined,
      customDuration: formData.get('customDuration') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    });

    // Verify remedy exists and guruji has permission
    const remedy = await prisma.remedyDocument.findUnique({
      where: { id: remedyId },
      include: {
        consultationSession: {
          include: {
            appointment: {
              select: { gurujiId: true },
            },
          },
        },
      },
    });

    if (!remedy) {
      return { success: false, error: 'Remedy not found' };
    }

    if (remedy.consultationSession.appointment.gurujiId !== session.user.id) {
      return { success: false, error: 'Permission denied' };
    }

    // Update remedy
    const updatedRemedy = await prisma.remedyDocument.update({
      where: { id: remedyId },
      data: {
        customInstructions: data.customInstructions,
        customDosage: data.customDosage,
        customDuration: data.customDuration,
        updatedAt: new Date(),
      },
      include: {
        template: true,
        consultationSession: {
          include: {
            patient: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_REMEDY',
        resource: 'REMEDY',
        resourceId: remedyId,
        oldData: JSON.parse(JSON.stringify({
          customInstructions: remedy.customInstructions,
          customDosage: remedy.customDosage,
          customDuration: remedy.customDuration,
        })),
        newData: JSON.parse(JSON.stringify(data)),
      },
    });

    revalidateTag('remedies');
    revalidatePath('/guruji/consultations');
    revalidatePath('/guruji/remedies');
    
    return { success: true, remedy: updatedRemedy };
  } catch (error) {
    console.error('Update remedy error:', error);
    if (error instanceof z.ZodError) {
      const validationErrors = getValidationErrors(error);
      return { success: false, error: Object.values(validationErrors)[0] || 'Validation failed' };
    }
    return { success: false, error: 'Failed to update remedy' };
  }
}

// Send remedy to patient
export async function sendRemedy(remedyId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const data = sendRemedySchema.parse({
      customMessage: formData.get('customMessage') as string || undefined,
    });

    // Verify remedy exists and guruji has permission
    const remedy = await prisma.remedyDocument.findUnique({
      where: { id: remedyId },
      include: {
        consultationSession: {
          include: {
            patient: true,
            appointment: {
              select: { gurujiId: true },
            },
          },
        },
        template: true,
      },
    });

    if (!remedy) {
      return { success: false, error: 'Remedy not found' };
    }

    if (remedy.consultationSession.appointment.gurujiId !== session.user.id) {
      return { success: false, error: 'Permission denied' };
    }

    // Note: External messaging (Email/SMS) is disabled as per requirements
    // The system now uses only in-app notifications
    console.log('Remedy sent - notification will be handled by in-app system');

    // Update remedy delivery status
    const updatedRemedy = await prisma.remedyDocument.update({
      where: { id: remedyId },
      data: {
        emailSent: false,
        smsSent: false,
        deliveredAt: new Date(), // Mark as delivered via in-app notification
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SEND_REMEDY',
        resource: 'REMEDY',
        resourceId: remedyId,
        newData: JSON.parse(JSON.stringify({
          customMessage: data.customMessage,
        })),
      },
    });

    revalidateTag('remedies');
    revalidatePath('/guruji/consultations');
    revalidatePath('/guruji/remedies');
    
    return { 
      success: true, 
      remedy: updatedRemedy,
     
    };
  } catch (error) {
    console.error('Send remedy error:', error);
    if (error instanceof z.ZodError) {
      const validationErrors = getValidationErrors(error);
      return { success: false, error: Object.values(validationErrors)[0] || 'Validation failed' };
    }
    return { success: false, error: 'Failed to send remedy' };
  }
}

// Get remedy details
export async function getRemedyDetails(remedyId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const remedy = await prisma.remedyDocument.findUnique({
      where: { id: remedyId },
      include: {
        template: true,
        consultationSession: {
          include: {
            patient: {
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
                gurujiId: true,
              },
            },
          },
        },
      },
    });

    if (!remedy) {
      return { success: false, error: 'Remedy not found' };
    }

    // Check permissions
    const canAccess = 
      session.user.role === 'ADMIN' ||
      (session.user.role === 'GURUJI' && remedy.consultationSession.appointment.gurujiId === session.user.id) ||
      (session.user.role === 'USER' && remedy.consultationSession.patientId === session.user.id);

    if (!canAccess) {
      return { success: false, error: 'Permission denied' };
    }

    return { success: true, remedy };
  } catch (error) {
    console.error('Get remedy details error:', error);
    return { success: false, error: 'Failed to fetch remedy details' };
  }
}

// Delete remedy (admin only)
export async function deleteRemedy(remedyId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Admin access required' };
  }

  try {
    const remedy = await prisma.remedyDocument.findUnique({
      where: { id: remedyId },
      include: {
        template: true,
        consultationSession: {
          include: {
            patient: true,
          },
        },
      },
    });

    if (!remedy) {
      return { success: false, error: 'Remedy not found' };
    }

    // Create audit log before deletion
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_REMEDY',
        resource: 'REMEDY',
        resourceId: remedyId,
        oldData: JSON.parse(JSON.stringify({
          templateName: remedy.template.name,
          patientName: remedy.consultationSession.patient.name,
        })),
      },
    });

    // Delete remedy
    await prisma.remedyDocument.delete({
      where: { id: remedyId },
    });

    revalidateTag('remedies');
    revalidatePath('/guruji/consultations');
    revalidatePath('/guruji/remedies');
    revalidatePath('/admin/remedies');
    
    return { success: true };
  } catch (error) {
    console.error('Delete remedy error:', error);
    return { success: false, error: 'Failed to delete remedy' };
  }
}

// Get remedy statistics
export async function getRemedyStats(options?: {
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
      whereClause.consultationSession = {
        appointment: { gurujiId: session.user.id },
      };
    } else if (session.user.role === 'ADMIN' && gurujiId) {
      whereClause.consultationSession = {
        appointment: { gurujiId },
      };
    }

    // Date filtering
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      whereClause.createdAt = dateFilter;
    }

    const [
      totalRemedies,
      emailSentCount,
      smsSentCount,
      deliveredCount,
    ] = await Promise.all([
      prisma.remedyDocument.count({ where: whereClause }),
      prisma.remedyDocument.count({ 
        where: { ...whereClause, emailSent: true } 
      }),
      prisma.remedyDocument.count({ 
        where: { ...whereClause, smsSent: true } 
      }),
      prisma.remedyDocument.count({ 
        where: { ...whereClause, deliveredAt: { not: null } } 
      }),
    ]);

    return {
      success: true,
      stats: {
        total: totalRemedies,
        emailSent: emailSentCount,
        smsSent: smsSentCount,
        delivered: deliveredCount,
        pendingDelivery: totalRemedies - deliveredCount,
      },
    };
  } catch (error) {
    console.error('Get remedy stats error:', error);
    return { success: false, error: 'Failed to fetch remedy statistics' };
  }
}

// Resend remedy delivery
export async function resendRemedy(remedyId: string, method: 'email' | 'sms') {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // Verify remedy exists and guruji has permission
    const remedy = await prisma.remedyDocument.findUnique({
      where: { id: remedyId },
      include: {
        consultationSession: {
          include: {
            patient: true,
            appointment: {
              select: { gurujiId: true },
            },
          },
        },
        template: true,
      },
    });

    if (!remedy) {
      return { success: false, error: 'Remedy not found' };
    }

    if (remedy.consultationSession.appointment.gurujiId !== session.user.id) {
      return { success: false, error: 'Permission denied' };
    }

    // Note: External messaging (Email/SMS) is disabled as per requirements
    // The system now uses only in-app notifications
    const success = true; // Always succeed since we're using in-app notifications
    console.log('Remedy resent - handled by in-app notification system');

    if (success) {
      // Update remedy delivery status
      await prisma.remedyDocument.update({
        where: { id: remedyId },
        data: {
          [`${method}Sent`]: true,
          deliveredAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'RESEND_REMEDY',
          resource: 'REMEDY',
          resourceId: remedyId,
          newData: JSON.parse(JSON.stringify({ method, success: true })),
        },
      });

      revalidateTag('remedies');
      revalidatePath('/guruji/consultations');
      revalidatePath('/guruji/remedies');
    }

    return { 
      success: true, 
      remedyResent: success,
      method,
    };
  } catch (error) {
    console.error('Resend remedy error:', error);
    return { success: false, error: 'Failed to resend remedy' };
  }
}
