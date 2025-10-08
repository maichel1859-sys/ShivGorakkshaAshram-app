'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/prisma';
import { z } from 'zod';
import { 
  remedyTemplateSchema,
  remedyPrescriptionSchema,
  getValidationErrors
} from '@/lib/validation/unified-schemas';
import { 
  emitRemedyEvent,
  emitNotificationEvent,
  SocketEventTypes 
} from '@/lib/socket/socket-emitter';

// Use unified schemas for consistency
const prescribeRemedySchema = remedyPrescriptionSchema;
const updateRemedyStatusSchema = remedyPrescriptionSchema.partial();

// Get remedy templates
export async function getRemedyTemplates(options?: {
  type?: string;
  category?: string;
  language?: string;
  active?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const { type, category, language, active, search, limit = 50, offset = 0 } = options || {};

    const whereClause: Record<string, unknown> = {};

    if (type) whereClause.type = type;
    if (category) whereClause.category = category;
    if (language) whereClause.language = language;
    if (active !== undefined) whereClause.isActive = active;

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.remedyTemplate.findMany({
        where: whereClause,
        orderBy: [
          { updatedAt: 'desc' },
          { name: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.remedyTemplate.count({ where: whereClause }),
    ]);

    return {
      success: true,
      templates,
      total,
      hasMore: offset + limit < total,
    };
  } catch (error) {
    console.error('Get remedy templates error:', error);
    return { success: false, error: 'Failed to fetch remedy templates' };
  }
}

// Get single remedy template
export async function getRemedyTemplate(templateId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const template = await prisma.remedyTemplate.findUnique({
      where: { id: templateId },
      include: {
        _count: {
          select: {
            remedyDocuments: true,
          },
        },
      },
    });

    if (!template) {
      return { success: false, error: 'Remedy template not found' };
    }

    return { success: true, template };
  } catch (error) {
    console.error('Get remedy template error:', error);
    return { success: false, error: 'Failed to fetch remedy template' };
  }
}

// Create remedy template
export async function createRemedyTemplate(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only Gurujis and Admins can create remedy templates
  if (!['GURUJI', 'ADMIN'].includes(session.user.role)) {
    return { success: false, error: 'Only gurujis and admins can create remedy templates' };
  }

  try {
    const data = remedyTemplateSchema.parse({
      name: formData.get('name') as string,
      type: formData.get('type') as 'HOMEOPATHIC' | 'AYURVEDIC' | 'SPIRITUAL' | 'LIFESTYLE' | 'DIETARY',
      category: formData.get('category') as string,
      description: formData.get('description') as string || undefined,
      instructions: formData.get('instructions') as string,
      dosage: formData.get('dosage') as string || undefined,
      duration: formData.get('duration') as string || undefined,
      language: formData.get('language') as string || 'en',
      tags: formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [],
      isActive: formData.get('isActive') !== 'false',
    });

    const template = await prisma.remedyTemplate.create({
      data: data,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_REMEDY_TEMPLATE',
        resource: 'REMEDY_TEMPLATE',
        resourceId: template.id,
        newData: {
          name: template.name,
          type: template.type,
          category: template.category,
        },
      },
    });

    revalidatePath('/guruji/remedies');
    revalidatePath('/admin/remedies');
    
    return { success: true, template };
  } catch (error) {
    console.error('Create remedy template error:', error);
    if (error instanceof z.ZodError) {
      const validationErrors = getValidationErrors(error);
      return { success: false, error: Object.values(validationErrors)[0] || 'Validation failed' };
    }
    return { success: false, error: 'Failed to create remedy template' };
  }
}

// Update remedy template
export async function updateRemedyTemplate(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only Gurujis and Admins can update remedy templates
  if (!['GURUJI', 'ADMIN'].includes(session.user.role)) {
    return { success: false, error: 'Only gurujis and admins can update remedy templates' };
  }

  try {
    const templateId = formData.get('templateId') as string;
    
    if (!templateId) {
      return { success: false, error: 'Template ID is required' };
    }

    const data = remedyTemplateSchema.parse({
      name: formData.get('name') as string,
      type: formData.get('type') as 'HOMEOPATHIC' | 'AYURVEDIC' | 'SPIRITUAL' | 'LIFESTYLE' | 'DIETARY',
      category: formData.get('category') as string,
      description: formData.get('description') as string || undefined,
      instructions: formData.get('instructions') as string,
      dosage: formData.get('dosage') as string || undefined,
      duration: formData.get('duration') as string || undefined,
      language: formData.get('language') as string || 'en',
      tags: formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [],
      isActive: formData.get('isActive') !== 'false',
    });

    const template = await prisma.remedyTemplate.update({
      where: { id: templateId },
      data: data,
    });

    revalidatePath('/guruji/remedies');
    revalidatePath('/admin/remedies');
    
    return { success: true, template };
  } catch (error) {
    console.error('Update remedy template error:', error);
    if (error instanceof z.ZodError) {
      const validationErrors = getValidationErrors(error);
      return { success: false, error: Object.values(validationErrors)[0] || 'Validation failed' };
    }
    return { success: false, error: 'Failed to update remedy template' };
  }
}

// Delete remedy template
export async function deleteRemedyTemplate(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only Admins can delete remedy templates
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only admins can delete remedy templates' };
  }

  try {
    const templateId = formData.get('templateId') as string;
    
    if (!templateId) {
      return { success: false, error: 'Template ID is required' };
    }

    // Check if template is being used
    const prescriptionCount = await prisma.remedyDocument.count({
      where: {
        templateId: templateId,
      },
    });

    if (prescriptionCount > 0) {
      return { success: false, error: 'Cannot delete template that is being used in prescriptions' };
    }

    await prisma.remedyTemplate.delete({
      where: { id: templateId },
    });

    revalidatePath('/guruji/remedies');
    revalidatePath('/admin/remedies');
    
    return { success: true };
  } catch (error) {
    console.error('Delete remedy template error:', error);
    return { success: false, error: 'Failed to delete remedy template' };
  }
}

// Prescribe remedy to devotee (enhanced version with PDF generation)
export async function prescribeRemedy(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only Gurujis and Admins can prescribe remedies
  if (!['GURUJI', 'ADMIN'].includes(session.user.role)) {
    return { success: false, error: 'Only gurujis can prescribe remedies' };
  }

  try {
    const templateId = formData.get('templateId') as string;
    const devoteeId = formData.get('devoteeId') as string;
    const customInstructions = formData.get('customInstructions') as string;
    const customDosage = formData.get('customDosage') as string;
    const customDuration = formData.get('customDuration') as string;

    // Validate input using the schema
    const validationResult = prescribeRemedySchema.safeParse({
      consultationId: devoteeId, // Using devoteeId as consultation reference
      templateId,
      customInstructions: customInstructions || undefined,
      customDosage: customDosage || undefined,
      customDuration: customDuration || undefined,
    });

    if (!validationResult.success) {
      return { 
        success: false, 
        error: 'Invalid data provided', 
        fieldErrors: validationResult.error.flatten().fieldErrors 
      };
    }

    const validatedData = validationResult.data;

    if (!templateId || !devoteeId) {
      return { success: false, error: 'Template ID and Devotee ID are required' };
    }

    // Verify template exists
    const template = await prisma.remedyTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return { success: false, error: 'Remedy template not found' };
    }

    // Verify devotee exists
    const devotee = await prisma.user.findUnique({
      where: { id: devoteeId },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (!devotee) {
      return { success: false, error: 'Devotee not found' };
    }

    // Create a minimal appointment for tracking
    const appointment = await prisma.appointment.create({
      data: {
        userId: devoteeId,
        gurujiId: session.user.id,
        date: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        status: 'COMPLETED',
        notes: 'Direct remedy prescription without consultation',
      },
    });

    // Create a minimal consultation session for tracking
    const consultationSession = await prisma.consultationSession.create({
      data: {
        appointmentId: appointment.id,
        devoteeId: devoteeId,
        gurujiId: session.user.id,
        startTime: new Date(),
        endTime: new Date(), // Mark as completed immediately
        notes: 'Direct remedy prescription',
      },
    });

    // Create the remedy document
    const remedy = await prisma.remedyDocument.create({
      data: {
        consultationSessionId: consultationSession.id,
        templateId: validatedData.templateId,
        userId: devoteeId,
        customInstructions: validatedData.customInstructions,
        customDosage: validatedData.customDosage,
        customDuration: validatedData.customDuration,
      },
      include: {
        template: true,
        consultationSession: {
          include: {
            appointment: {
              include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                guruji: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });

    // Create notification for devotee
    const notification = await prisma.notification.create({
      data: {
        userId: devoteeId,
        title: "New Remedy Prescribed",
        message: `${session.user.name || 'Guruji'} has prescribed a new remedy: ${template.name}`,
        type: "remedy",
        data: {
          remedyId: remedy.id,
          templateName: template.name,
          gurujiName: session.user.name || 'Guruji',
        },
      },
    });

    // Emit remedy prescribed event
    await emitRemedyEvent(
      SocketEventTypes.REMEDY_PRESCRIBED,
      remedy.id,
      {
        id: remedy.id,
        templateId: remedy.templateId,
        status: 'PRESCRIBED',
        instructions: remedy.customInstructions || remedy.template.instructions,
        dosage: remedy.customDosage || remedy.template.dosage || undefined,
        duration: remedy.customDuration || remedy.template.duration || undefined,
        appointmentId: appointment.id
      },
      devoteeId,
      session.user.id
    );

    // Emit notification sent event
    await emitNotificationEvent(
      SocketEventTypes.NOTIFICATION_SENT,
      notification.id,
      {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: notification.read,
        userId: devoteeId
      }
    );

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PRESCRIBE_REMEDY',
        resource: 'REMEDY',
        resourceId: remedy.id,
        newData: {
          templateName: template.name,
          devoteeName: devotee.name,
          directPrescription: true,
        },
      },
    });

    revalidatePath('/guruji/remedies');
    revalidatePath('/user/remedies');
    
    return { success: true, remedy };
  } catch (error) {
    console.error('Prescribe remedy error:', error);
    if (error instanceof z.ZodError) {
      const validationErrors = getValidationErrors(error);
      return { success: false, error: Object.values(validationErrors)[0] || 'Validation failed' };
    }
    return { success: false, error: 'Failed to prescribe remedy' };
  }
}

// Generate PDF for remedy prescription
export async function generateRemedyPDF(remedyId: string) {
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
            appointment: {
              include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                guruji: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!remedy) {
      return { success: false, error: 'Remedy not found' };
    }

    // Users can only generate PDFs for their own remedies
    if (session.user.role === 'USER' && remedy.consultationSession.appointment.userId !== session.user.id) {
      return { success: false, error: 'Permission denied' };
    }

    // Generate PDF (this would require jsPDF or similar library)
    // For now, return the remedy data for PDF generation on client side
    return { 
      success: true, 
      remedy,
      pdfData: {
        template: remedy.template,
        devotee: remedy.consultationSession.appointment.user,
        guruji: remedy.consultationSession.appointment.guruji,
        customInstructions: remedy.customInstructions,
        customDosage: remedy.customDosage,
        customDuration: remedy.customDuration,
        prescribedAt: remedy.createdAt,
      }
    };
  } catch (error) {
    console.error('Generate remedy PDF error:', error);
    return { success: false, error: 'Failed to generate PDF' };
  }
}

// Get guruji devotees
export async function getGurujiDevotees() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only Gurujis and Admins can access devotee list
  if (!['GURUJI', 'ADMIN'].includes(session.user.role)) {
    return { success: false, error: 'Access denied' };
  }

  try {
    const devotees = await prisma.user.findMany({
      where: {
        role: 'USER',
        gurujiAppointments: {
          some: {
            gurujiId: session.user.role === 'GURUJI' ? session.user.id : undefined,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
      orderBy: { name: 'asc' },
    });

    return { success: true, devotees };
  } catch (error) {
    console.error('Get guruji devotees error:', error);
    return { success: false, error: 'Failed to fetch devotees' };
  }
}

// Generate remedy preview
export async function generateRemedyPreview(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only Gurujis and Admins can generate previews
  if (!['GURUJI', 'ADMIN'].includes(session.user.role)) {
    return { success: false, error: 'Access denied' };
  }

  try {
    const templateId = formData.get('templateId') as string;
    const devoteeId = formData.get('devoteeId') as string;
    const customInstructions = formData.get('customInstructions') as string;
    const customDosage = formData.get('customDosage') as string;
    const customDuration = formData.get('customDuration') as string;

    if (!templateId || !devoteeId) {
      return { success: false, error: 'Template ID and Devotee ID are required' };
    }

    // Get template and devotee data
    const [template, devotee] = await Promise.all([
      prisma.remedyTemplate.findUnique({
        where: { id: templateId },
      }),
      prisma.user.findUnique({
        where: { id: devoteeId },
        select: { id: true, name: true, email: true, phone: true },
      }),
    ]);

    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    if (!devotee) {
      return { success: false, error: 'Devotee not found' };
    }

    // Generate preview data
    const preview = {
      template,
      devotee,
      customInstructions: customInstructions || template.instructions,
      customDosage: customDosage || template.dosage,
      customDuration: customDuration || template.duration,
      prescribedAt: new Date(),
      prescribedBy: session.user.name || 'Guruji',
    };

    return { success: true, preview };
  } catch (error) {
    console.error('Generate remedy preview error:', error);
    return { success: false, error: 'Failed to generate preview' };
  }
}

// Get prescribed remedies for user
export async function getUserRemedies(options?: {
  limit?: number;
  offset?: number;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const { limit = 20, offset = 0 } = options || {};

    const whereClause: {
      consultationSession: {
        appointment: {
          userId: string;
        };
      };
    } = {
      consultationSession: {
        appointment: {
          userId: session.user.id,
        },
      },
    };

    const [remedies, total] = await Promise.all([
      prisma.remedyDocument.findMany({
        where: whereClause,
        include: {
          template: true,
          consultationSession: {
            include: {
              appointment: {
                include: {
                  user: { select: { id: true, name: true } },
                  guruji: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.remedyDocument.count({ where: whereClause }),
    ]);

    return {
      success: true,
      remedies,
      total,
      hasMore: offset + limit < total,
    };
  } catch (error) {
    console.error('Get user remedies error:', error);
    return { success: false, error: 'Failed to fetch remedies' };
  }
}

// Update remedy status (for devotees to mark as taken/completed)
export async function updateRemedyStatus(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const remedyId = formData.get('remedyId') as string;
    
    if (!remedyId) {
      return { success: false, error: 'Remedy ID is required' };
    }

    const data = updateRemedyStatusSchema.parse({
      customInstructions: (formData.get('customInstructions') as string) || undefined,
      customDosage: (formData.get('customDosage') as string) || undefined,
      customDuration: (formData.get('customDuration') as string) || undefined,
    });

    const remedy = await prisma.remedyDocument.findUnique({
      where: { id: remedyId },
      include: {
        consultationSession: {
          include: {
            appointment: true,
          },
        },
      },
    });

    if (!remedy) {
      return { success: false, error: 'Remedy not found' };
    }

    // Users can only update their own remedies
    if (session.user.role === 'USER' && remedy.consultationSession.appointment.userId !== session.user.id) {
      return { success: false, error: 'Permission denied' };
    }

    const updatedRemedy = await prisma.remedyDocument.update({
      where: { id: remedyId },
      data: { 
        customInstructions: data.customInstructions,
        customDosage: data.customDosage,
        customDuration: data.customDuration,
      },
      include: {
        template: true,
        consultationSession: {
          include: {
            appointment: {
              include: {
                user: { select: { id: true, name: true } },
                guruji: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    revalidatePath('/user/remedies');
    
    return { success: true, remedy: updatedRemedy };
  } catch (error) {
    console.error('Update remedy status error:', error);
    if (error instanceof z.ZodError) {
      const validationErrors = getValidationErrors(error);
      return { success: false, error: Object.values(validationErrors)[0] || 'Validation failed' };
    }
    return { success: false, error: 'Failed to update remedy status' };
  }
}

// Prescribe remedy during active consultation
export async function prescribeRemedyDuringConsultation(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only Gurujis can prescribe remedies
  if (session.user.role !== 'GURUJI') {
    return { success: false, error: 'Only Gurujis can prescribe remedies' };
  }

  try {
    const consultationId = formData.get('consultationId') as string;
    const templateId = formData.get('templateId') as string;
    const customInstructions = formData.get('customInstructions') as string;
    const customDosage = formData.get('customDosage') as string;
    const customDuration = formData.get('customDuration') as string;

    if (!consultationId || !templateId) {
      return { success: false, error: 'Consultation ID and Template ID are required' };
    }

    // Verify the consultation exists and belongs to this guruji
    const consultation = await prisma.consultationSession.findUnique({
      where: { id: consultationId },
      include: {
        appointment: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!consultation) {
      return { success: false, error: 'Consultation not found' };
    }

    if (consultation.gurujiId !== session.user.id) {
      return { success: false, error: 'You can only prescribe remedies for your own consultations' };
    }

    // Check if consultation is still active (not completed)
    if (consultation.endTime) {
      return { success: false, error: 'Cannot prescribe remedies for completed consultations' };
    }

    // Verify the remedy template exists
    const template = await prisma.remedyTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return { success: false, error: 'Remedy template not found' };
    }

    // Create the remedy document
    const remedyDocument = await prisma.remedyDocument.create({
      data: {
        consultationSessionId: consultationId,
        templateId: templateId,
        userId: consultation.appointment.userId,
        customInstructions: customInstructions || undefined,
        customDosage: customDosage || undefined,
        customDuration: customDuration || undefined,
      },
      include: {
        template: true,
        consultationSession: {
          include: {
            appointment: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    // Create notification for the devotee
    const notification = await prisma.notification.create({
      data: {
        userId: consultation.appointment.userId,
        title: 'New Remedy Prescribed',
        message: `Dr. ${session.user.name} has prescribed ${template.name} for your consultation`,
        type: 'remedy',
        data: {
          consultationId: consultationId,
          remedyId: remedyDocument.id,
          remedyName: template.name,
          gurujiName: session.user.name,
        },
      },
    });

    // Emit remedy prescribed event
    await emitRemedyEvent(
      SocketEventTypes.REMEDY_PRESCRIBED,
      remedyDocument.id,
      {
        id: remedyDocument.id,
        templateId: remedyDocument.templateId,
        status: 'PRESCRIBED',
        instructions: remedyDocument.customInstructions || remedyDocument.template.instructions,
        dosage: remedyDocument.customDosage || remedyDocument.template.dosage || undefined,
        duration: remedyDocument.customDuration || remedyDocument.template.duration || undefined,
        appointmentId: consultation.appointment.id
      },
      consultation.appointment.userId,
      session.user.id
    );

    // Emit notification sent event
    await emitNotificationEvent(
      SocketEventTypes.NOTIFICATION_SENT,
      notification.id,
      {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        userId: consultation.appointment.userId
      }
    );

    revalidatePath('/guruji/consultations');
    revalidatePath('/user/remedies');
    revalidatePath('/guruji/remedies');

    return { 
      success: true, 
      remedyDocument,
      message: `Remedy "${template.name}" prescribed successfully`
    };
  } catch (error) {
    console.error('Prescribe remedy during consultation error:', error);
    return { success: false, error: 'Failed to prescribe remedy' };
  }
}

// Generate PDF for remedy document
export async function generateRemedyDocumentPDF(remedyDocumentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    const remedyDocument = await prisma.remedyDocument.findUnique({
      where: { id: remedyDocumentId },
      include: {
        template: true,
        user: true,
        consultationSession: {
          include: {
            guruji: true,
            devotee: true,
          },
        },
      },
    });

    if (!remedyDocument) {
      return { success: false, error: 'Remedy document not found' };
    }

    // Verify access permission
    if (
      remedyDocument.userId !== session.user.id &&
      remedyDocument.consultationSession.gurujiId !== session.user.id &&
      session.user.role !== 'ADMIN'
    ) {
      return { success: false, error: 'Access denied' };
    }

    // TODO: Implement PDF generation
    // This would typically use a library like puppeteer or jsPDF
    const pdfUrl = `/api/remedies/${remedyDocumentId}/pdf`;

    // Update remedy document with PDF URL
    await prisma.remedyDocument.update({
      where: { id: remedyDocumentId },
      data: { pdfUrl },
    });

    return { success: true, pdfUrl };

  } catch (error) {
    console.error('Generate remedy PDF error:', error);
    return { success: false, error: 'Failed to generate PDF' };
  }
}

// Mark remedy as delivered
export async function markRemedyDelivered(remedyDocumentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    const remedyDocument = await prisma.remedyDocument.findUnique({
      where: { id: remedyDocumentId },
      include: {
        consultationSession: {
          include: {
            guruji: true,
          },
        },
      },
    });

    if (!remedyDocument) {
      return { success: false, error: 'Remedy document not found' };
    }

    // Verify permission (only guruji or admin can mark as delivered)
    if (
      remedyDocument.consultationSession.gurujiId !== session.user.id &&
      session.user.role !== 'ADMIN'
    ) {
      return { success: false, error: 'Access denied' };
    }

    // Update delivery status
    const updatedRemedy = await prisma.remedyDocument.update({
      where: { id: remedyDocumentId },
      data: { deliveredAt: new Date() },
      include: {
        template: true,
        user: true,
      },
    });

    // Emit socket event for real-time update
    try {
      await emitRemedyEvent(
        SocketEventTypes.REMEDY_COMPLETED,
        remedyDocumentId,
        {
          id: updatedRemedy.id,
          templateId: updatedRemedy.templateId,
          status: 'DELIVERED',
          instructions: updatedRemedy.customInstructions || updatedRemedy.template.instructions,
          dosage: updatedRemedy.customDosage || updatedRemedy.template.dosage || undefined,
          duration: updatedRemedy.customDuration || updatedRemedy.template.duration || undefined,
        },
        updatedRemedy.userId
      );
    } catch (socketError) {
      console.warn('Socket emission failed:', socketError);
    }

    return { success: true, remedy: updatedRemedy };

  } catch (error) {
    console.error('Mark remedy delivered error:', error);
    return { success: false, error: 'Failed to mark remedy as delivered' };
  }
}


// Get remedy document by ID
export async function getRemedyDocument(remedyDocumentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    const remedy = await prisma.remedyDocument.findUnique({
      where: { id: remedyDocumentId },
      include: {
        template: true,
        consultationSession: {
          include: {
            appointment: {
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
                    name: true,
                    email: true
                  }
                },
              },
            },
          },
        },
      },
    });

    if (!remedy) {
      return { success: false, error: 'Remedy document not found' };
    }

    // Verify access permission
    const hasAccess =
      remedy.consultationSession.appointment.userId === session.user.id ||
      remedy.consultationSession.gurujiId === session.user.id ||
      session.user.role === 'ADMIN' ||
      session.user.role === 'COORDINATOR';

    if (!hasAccess) {
      return { success: false, error: 'Access denied' };
    }

    return { success: true, remedy };
  } catch (error) {
    console.error('Get remedy document error:', error);
    return { success: false, error: 'Failed to fetch remedy document' };
  }
}

// Get remedy history for a specific user (for gurujis to see previous remedies)
export async function getUserRemedyHistory(userId: string, options?: {
  limit?: number;
  offset?: number;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only gurujis, admins, and coordinators can view other users' remedy history
  if (!['GURUJI', 'ADMIN', 'COORDINATOR'].includes(session.user.role)) {
    return { success: false, error: 'Permission denied' };
  }

  try {
    const { limit = 10, offset = 0 } = options || {};


    const remedies = await prisma.remedyDocument.findMany({
      where: {
        userId: userId,
      },
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
        consultationSession: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            appointment: {
              select: {
                id: true,
                date: true,
                guruji: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const total = await prisma.remedyDocument.count({
      where: {
        userId: userId,
      },
    });


    return {
      success: true,
      remedies,
      total,
      hasMore: (offset + limit) < total
    };
  } catch (error) {
    console.error('Get user remedy history error:', error);
    return { success: false, error: 'Failed to fetch user remedy history' };
  }
}