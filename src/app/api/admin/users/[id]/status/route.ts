import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const statusUpdateSchema = z.object({
  isActive: z.boolean(),
});

// Update user status (activate/deactivate)
export async function PATCH(
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;

    // Prevent self-deactivation
    if (resolvedParams.id === session.user.id) {
      return NextResponse.json(
        { message: "Cannot change your own account status" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { isActive } = statusUpdateSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const user = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
        resource: "USER",
        resourceId: user.id,
        oldData: {
          isActive: existingUser.isActive,
        },
        newData: {
          isActive: user.isActive,
          changedBy: session.user.name,
        },
      },
    });

    return NextResponse.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user,
    });
  } catch (error) {
    console.error("Update user status error:", error);

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