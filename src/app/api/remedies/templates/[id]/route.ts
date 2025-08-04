import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const remedyTemplateUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  type: z.enum(["HOMEOPATHIC", "AYURVEDIC", "SPIRITUAL", "LIFESTYLE", "DIETARY"]).optional(),
  category: z.string().min(1, "Category is required").optional(),
  description: z.string().optional(),
  instructions: z.string().min(1, "Instructions are required").optional(),
  dosage: z.string().optional(),
  duration: z.string().optional(),
  language: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// Get a specific remedy template
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;

    const template = await prisma.remedyTemplate.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!template) {
      return NextResponse.json(
        { message: "Remedy template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Get remedy template error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update a remedy template
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const body = await req.json();
    const validatedData = remedyTemplateUpdateSchema.parse(body);

    const existingTemplate = await prisma.remedyTemplate.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { message: "Remedy template not found" },
        { status: 404 }
      );
    }

    const template = await prisma.remedyTemplate.update({
      where: { id: resolvedParams.id },
      data: validatedData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_REMEDY_TEMPLATE",
        resource: "REMEDY_TEMPLATE",
        resourceId: template.id,
        oldData: existingTemplate,
        newData: template,
      },
    });

    return NextResponse.json({
      message: "Remedy template updated successfully",
      template,
    });
  } catch (error) {
    console.error("Update remedy template error:", error);

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

// Delete a remedy template
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;

    const existingTemplate = await prisma.remedyTemplate.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { message: "Remedy template not found" },
        { status: 404 }
      );
    }

    // Check if template is being used in prescriptions
    const activePrescriptions = await prisma.remedyDocument.count({
      where: { templateId: resolvedParams.id },
    });

    if (activePrescriptions > 0) {
      return NextResponse.json(
        { message: "Cannot delete template that has active prescriptions" },
        { status: 400 }
      );
    }

    await prisma.remedyTemplate.delete({
      where: { id: resolvedParams.id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_REMEDY_TEMPLATE",
        resource: "REMEDY_TEMPLATE",
        resourceId: existingTemplate.id,
        oldData: existingTemplate,
      },
    });

    return NextResponse.json({
      message: "Remedy template deleted successfully",
    });
  } catch (error) {
    console.error("Delete remedy template error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}