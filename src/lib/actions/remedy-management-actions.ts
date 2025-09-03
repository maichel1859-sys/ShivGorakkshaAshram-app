'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';
import { z } from 'zod';

// Schemas
const updateRemedySchema = z.object({
  customInstructions: z.string().optional(),
  customDosage: z.string().optional(),
  customDuration: z.string().optional(),
  notes: z.string().optional(),
});

const sendRemedySchema = z.object({
  sendEmail: z.boolean().default(true),
  sendSms: z.boolean().default(false),
  customMessage: z.string().optional(),
});

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
        notes: data.notes,
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
        oldData: {
          customInstructions: remedy.customInstructions,
          customDosage: remedy.customDosage,
          customDuration: remedy.customDuration,
          notes: remedy.notes,
        },
        newData: data,
      },
    });

    revalidateTag('remedies');
    revalidatePath('/guruji/consultations');
    revalidatePath('/guruji/remedies');
    
    return { success: true, remedy: updatedRemedy };
  } catch (error) {
    console.error('Update remedy error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
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
      sendEmail: formData.get('sendEmail') === 'true',
      sendSms: formData.get('sendSms') === 'true',
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

    const patient = remedy.consultationSession.patient;
    let emailSent = false;
    let smsSent = false;

    // Send email if requested and patient has email
    if (data.sendEmail && patient.email) {
      try {
        // TODO: Implement actual email sending
        // await sendRemedyEmail(patient.email, remedy, data.customMessage);
        emailSent = true;
      } catch (error) {
        console.error('Email sending failed:', error);
      }
    }

    // Send SMS if requested and patient has phone
    if (data.sendSms && patient.phone) {
      try {
        // TODO: Implement actual SMS sending
        // await sendRemedySMS(patient.phone, remedy, data.customMessage);
        smsSent = true;
      } catch (error) {
        console.error('SMS sending failed:', error);
      }
    }

    // Update remedy delivery status
    const updatedRemedy = await prisma.remedyDocument.update({
      where: { id: remedyId },
      data: {
        emailSent,
        smsSent,
        deliveredAt: emailSent || smsSent ? new Date() : null,
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
        newData: {
          emailSent,
          smsSent,
          customMessage: data.customMessage,
        },
      },
    });

    revalidateTag('remedies');
    revalidatePath('/guruji/consultations');
    revalidatePath('/guruji/remedies');
    
    return { 
      success: true, 
      remedy: updatedRemedy,
      emailSent,
      smsSent,
    };
  } catch (error) {
    console.error('Send remedy error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
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
        oldData: {
          templateName: remedy.template.name,
          patientName: remedy.consultationSession.patient.name,
        },
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

    const patient = remedy.consultationSession.patient;
    let success = false;

    if (method === 'email' && patient.email) {
      try {
        // TODO: Implement actual email sending
        // await sendRemedyEmail(patient.email, remedy);
        success = true;
      } catch (error) {
        console.error('Email resend failed:', error);
      }
    } else if (method === 'sms' && patient.phone) {
      try {
        // TODO: Implement actual SMS sending
        // await sendRemedySMS(patient.phone, remedy);
        success = true;
      } catch (error) {
        console.error('SMS resend failed:', error);
      }
    }

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
          newData: { method, success: true },
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
