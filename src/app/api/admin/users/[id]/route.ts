import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
  role: z.enum(["USER", "COORDINATOR", "GURUJI", "ADMIN"]).optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  dateOfBirth: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Get a specific user
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        dateOfBirth: true,
        _count: {
          select: {
            patientAppointments: true,
            consultationSessions: true,
            remedyDocuments: true,
            notifications: true,
          },
        },
        patientAppointments: {
          select: {
            id: true,
            date: true,
            status: true,
            priority: true,
          },
          orderBy: { date: "desc" },
          take: 5,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update a user
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = updateUserSchema.parse(body);
    const resolvedParams = await params;

    const existingUser = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Check for email conflicts if email is being updated
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (emailExists) {
        return NextResponse.json(
          { message: "Email is already in use by another user" },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.email) updateData.email = validatedData.email;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.role) updateData.role = validatedData.role;
    if (validatedData.dateOfBirth) {
      updateData.dateOfBirth = new Date(validatedData.dateOfBirth);
    }
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;

    // Hash password if provided
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 12);
    }

    const user = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        dateOfBirth: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_USER",
        resource: "USER",
        resourceId: user.id,
        oldData: {
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          isActive: existingUser.isActive,
        },
        newData: {
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          updatedBy: session.user.name,
        },
      },
    });

    return NextResponse.json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update user error:", error);

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

// Delete a user
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    
    // Prevent self-deletion
    if (resolvedParams.id === session.user.id) {
      return NextResponse.json(
        { message: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      include: {
        _count: {
          select: {
            patientAppointments: true,
            consultationSessions: true,
            remedyDocuments: true,
          },
        },
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has dependencies (appointments, consultations, etc.)
    const hasAppointments = existingUser._count.patientAppointments > 0;
    const hasConsultations = existingUser._count.consultationSessions > 0;
    const hasRemedies = existingUser._count.remedyDocuments > 0;

    if (hasAppointments || hasConsultations || hasRemedies) {
      // Soft delete by deactivating instead of hard delete
      await prisma.user.update({
        where: { id: resolvedParams.id },
        data: { isActive: false },
      });

      return NextResponse.json({
        message: "User deactivated (cannot delete - has associated data)",
        action: "deactivated",
      });
    }

    // Hard delete if no dependencies
    await prisma.user.delete({
      where: { id: resolvedParams.id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_USER",
        resource: "USER",
        resourceId: resolvedParams.id,
        oldData: {
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          deletedBy: session.user.name,
        },
      },
    });

    return NextResponse.json({
      message: "User deleted successfully",
      action: "deleted",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}