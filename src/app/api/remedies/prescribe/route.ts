import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import jsPDF from "jspdf";

const prescribeSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
  patientId: z.string().min(1, "Patient ID is required"),
  customInstructions: z.string().optional(),
  customDosage: z.string().optional(),
  customDuration: z.string().optional(),
  sendEmail: z.boolean().default(true),
  sendSms: z.boolean().default(false),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!["GURUJI", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = prescribeSchema.parse(body);

    // Get template details
    const template = await prisma.remedyTemplate.findUnique({
      where: { id: validatedData.templateId },
    });

    if (!template) {
      return NextResponse.json(
        { message: "Remedy template not found" },
        { status: 404 }
      );
    }

    // Get patient details
    const patient = await prisma.user.findUnique({
      where: { id: validatedData.patientId },
    });

    if (!patient) {
      return NextResponse.json(
        { message: "Patient not found" },
        { status: 404 }
      );
    }

    // Get Guruji details
    const guruji = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    // Find active consultation session for this patient and guruji
    const consultationSession = await prisma.consultationSession.findFirst({
      where: {
        patientId: validatedData.patientId,
        gurujiId: session.user.id,
        endTime: null, // Active session
      },
      orderBy: {
        startTime: "desc",
      },
    });

    let sessionId = consultationSession?.id;

    // If no active session, create one
    if (!sessionId) {
      const newSession = await prisma.consultationSession.create({
        data: {
          appointmentId: crypto.randomUUID(), // Temporary - should be linked to actual appointment
          patientId: validatedData.patientId,
          gurujiId: session.user.id,
          startTime: new Date(),
        },
      });
      sessionId = newSession.id;
    }

    // Generate PDF
    const pdfBuffer = await generateRemedyPDF({
      template,
      patient,
      guruji: guruji!,
      customInstructions: validatedData.customInstructions,
      customDosage: validatedData.customDosage,
      customDuration: validatedData.customDuration,
    });

    // Save PDF to file system or cloud storage
    // For demo, we'll create a data URL
    const pdfBase64 = pdfBuffer.toString('base64');
    const pdfUrl = `data:application/pdf;base64,${pdfBase64}`;

    // Create remedy document record
    const remedyDocument = await prisma.remedyDocument.create({
      data: {
        consultationSessionId: sessionId,
        templateId: validatedData.templateId,
        userId: validatedData.patientId,
        customInstructions: validatedData.customInstructions,
        customDosage: validatedData.customDosage,
        customDuration: validatedData.customDuration,
        pdfUrl: pdfUrl,
        emailSent: false,
        smsSent: false,
      },
    });

    // Send notifications
    const notifications = [];

    if (validatedData.sendEmail && patient.email) {
      // TODO: Send email with PDF attachment
      await prisma.remedyDocument.update({
        where: { id: remedyDocument.id },
        data: { emailSent: true },
      });
      notifications.push("email");
    }

    if (validatedData.sendSms && patient.phone) {
      // TODO: Send SMS with download link
      await prisma.remedyDocument.update({
        where: { id: remedyDocument.id },
        data: { smsSent: true },
      });
      notifications.push("sms");
    }

    // Create notification for patient
    await prisma.notification.create({
      data: {
        userId: validatedData.patientId,
        title: "New Remedy Prescribed",
        message: `${guruji?.name} has prescribed a new remedy: ${template.name}`,
        type: "remedy",
        data: {
          remedyDocumentId: remedyDocument.id,
          templateName: template.name,
          gurujiName: guruji?.name,
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "PRESCRIBE_REMEDY",
        resource: "REMEDY_DOCUMENT",
        resourceId: remedyDocument.id,
        newData: {
          templateId: validatedData.templateId,
          patientId: validatedData.patientId,
          templateName: template.name,
          patientName: patient.name,
          deliveryMethods: notifications,
        },
      },
    });

    return NextResponse.json({
      message: "Remedy prescribed successfully",
      remedyDocument: {
        id: remedyDocument.id,
        templateName: template.name,
        patientName: patient.name,
        pdfUrl: pdfUrl,
        deliveredVia: notifications,
      },
    });
  } catch (error) {
    console.error("Prescribe remedy error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

async function generateRemedyPDF({
  template,
  patient,
  guruji,
  customInstructions,
  customDosage,
  customDuration,
}: {
  template: Record<string, unknown>;
  patient: Record<string, unknown>;
  guruji: Record<string, unknown>;
  customInstructions?: string;
  customDosage?: string;
  customDuration?: string;
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  let yPosition = margin;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("🕉️ SPIRITUAL REMEDY PRESCRIPTION", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 15;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Ashram Management System", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 20;

  // Line separator
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;

  // Patient Information
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PATIENT INFORMATION", margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${patient.name}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Email: ${patient.email}`, margin, yPosition);
  yPosition += 6;
  if (patient.phone) {
    doc.text(`Phone: ${patient.phone}`, margin, yPosition);
    yPosition += 6;
  }
  doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += 15;

  // Guruji Information
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PRESCRIBED BY", margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Guruji: ${guruji.name}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Email: ${guruji.email}`, margin, yPosition);
  yPosition += 15;

  // Remedy Details
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("REMEDY PRESCRIPTION", margin, yPosition);
  yPosition += 15;

  // Remedy Name
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`${template.name}`, margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Type: ${template.type} | Category: ${template.category}`, margin, yPosition);
  yPosition += 12;

  // Description
  if (template.description && typeof template.description === 'string') {
    doc.setFont("helvetica", "bold");
    doc.text("Description:", margin, yPosition);
    yPosition += 6;
    doc.setFont("helvetica", "normal");
    const descriptionLines = doc.splitTextToSize(template.description, pageWidth - 2 * margin);
    doc.text(descriptionLines, margin, yPosition);
    yPosition += descriptionLines.length * 6 + 8;
  }

  // Instructions
  doc.setFont("helvetica", "bold");
  doc.text("Instructions:", margin, yPosition);
  yPosition += 6;
  doc.setFont("helvetica", "normal");
  const instructionLines = doc.splitTextToSize(
    typeof template.instructions === 'string' ? template.instructions : '', 
    pageWidth - 2 * margin
  );
  doc.text(instructionLines, margin, yPosition);
  yPosition += instructionLines.length * 6 + 8;

  // Custom Instructions
  if (customInstructions) {
    doc.setFont("helvetica", "bold");
    doc.text("Additional Instructions:", margin, yPosition);
    yPosition += 6;
    doc.setFont("helvetica", "normal");
    const customLines = doc.splitTextToSize(customInstructions, pageWidth - 2 * margin);
    doc.text(customLines, margin, yPosition);
    yPosition += customLines.length * 6 + 8;
  }

  // Dosage
  const dosage = customDosage || template.dosage;
  if (dosage) {
    doc.setFont("helvetica", "bold");
    doc.text("Dosage:", margin, yPosition);
    yPosition += 6;
    doc.setFont("helvetica", "normal");
    doc.text(dosage, margin, yPosition);
    yPosition += 12;
  }

  // Duration
  const duration = customDuration || template.duration;
  if (duration) {
    doc.setFont("helvetica", "bold");
    doc.text("Duration:", margin, yPosition);
    yPosition += 6;
    doc.setFont("helvetica", "normal");
    doc.text(duration, margin, yPosition);
    yPosition += 12;
  }

  // Tags
  if (template.tags && Array.isArray(template.tags) && template.tags.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Related Keywords:", margin, yPosition);
    yPosition += 6;
    doc.setFont("helvetica", "normal");
    doc.text(template.tags.join(", "), margin, yPosition);
    yPosition += 15;
  }

  // Footer
  yPosition = pageHeight - 40;
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("This prescription is generated digitally by the Ashram Management System.", margin, yPosition);
  yPosition += 5;
  doc.text("For any queries, please contact the ashram directly.", margin, yPosition);
  yPosition += 5;
  doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPosition);

  return Buffer.from(doc.output('arraybuffer'));
}