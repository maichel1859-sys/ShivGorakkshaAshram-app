import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const remedyTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["HOMEOPATHIC", "AYURVEDIC", "SPIRITUAL", "LIFESTYLE", "DIETARY"]),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  instructions: z.string().min(1, "Instructions are required"),
  dosage: z.string().optional(),
  duration: z.string().optional(),
  language: z.string().default("en"),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

// Get all remedy templates
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const language = searchParams.get("language");
    const active = searchParams.get("active");
    const search = searchParams.get("search");

    const whereClause: Record<string, unknown> = {};

    if (type) whereClause.type = type;
    if (category) whereClause.category = category;
    if (language) whereClause.language = language;
    if (active !== null) whereClause.isActive = active === "true";

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    const templates = await prisma.remedyTemplate.findMany({
      where: whereClause,
      orderBy: [
        { updatedAt: "desc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({
      templates,
      total: templates.length,
    });
  } catch (error) {
    console.error("Get remedy templates error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create a new remedy template
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only Gurujis and Admins can create remedy templates
    if (!["GURUJI", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = remedyTemplateSchema.parse(body);

    const template = await prisma.remedyTemplate.create({
      data: validatedData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_REMEDY_TEMPLATE",
        resource: "REMEDY_TEMPLATE",
        resourceId: template.id,
        newData: {
          name: template.name,
          type: template.type,
          category: template.category,
        },
      },
    });

    return NextResponse.json(
      {
        message: "Remedy template created successfully",
        template,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create remedy template error:", error);

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