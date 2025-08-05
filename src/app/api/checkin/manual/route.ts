import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { AppointmentStatus, QueueStatus } from "@prisma/client";
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handler";
import { cacheInvalidation } from "@/lib/cache";

const manualCheckInSchema = z.object({
  appointmentCode: z.string().min(1, "Appointment code is required"),
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

    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error("JSON parsing error:", error);
      return NextResponse.json(
        { message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { message: "Request body must be a valid JSON object" },
        { status: 400 }
      );
    }

    const validatedData = manualCheckInSchema.parse(body);

    // Rate limiting - prevent multiple check-in attempts
    const recentAttempt = await prisma.auditLog.findFirst({
      where: {
        userId: session.user.id,
        action: "MANUAL_CHECK_IN",
        createdAt: {
          gte: new Date(Date.now() - 30000), // 30 seconds
        },
      },
    });

    if (recentAttempt) {
      return createErrorResponse("Please wait before attempting another check-in", 429);
    }

    // Find appointment by reference code (for demo, using appointment ID)
    // In real implementation, you'd have a separate reference code field
    const appointment = await prisma.appointment.findFirst({
      where: {
        OR: [
          { id: validatedData.appointmentCode },
          // You could also search by a custom reference code field
          // { referenceCode: validatedData.appointmentCode }
        ],
        userId: session.user.id,
        status: {
          in: ["BOOKED" as AppointmentStatus, "CONFIRMED" as AppointmentStatus]
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        guruji: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!appointment) {
      return createErrorResponse("Invalid appointment code or appointment not found", 404);
    }

    // Check if appointment is for today (within reasonable time range)
    const appointmentDate = new Date(appointment.date);
    const now = new Date();
    const timeDiff = Math.abs(appointmentDate.getTime() - now.getTime());
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return createErrorResponse("Check-in is only available on the day of appointment", 400);
    }

    // Check if already checked in
    if (appointment.status === ("CHECKED_IN" as AppointmentStatus)) {
      return createErrorResponse("Already checked in for this appointment", 400);
    }

    // Update appointment status
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CHECKED_IN" as AppointmentStatus,
        checkedInAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        guruji: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create or update queue entry
    const existingQueueEntry = await prisma.queueEntry.findUnique({
      where: { appointmentId: appointment.id },
    });

    let queueEntry;
    if (existingQueueEntry) {
      queueEntry = await prisma.queueEntry.update({
        where: { appointmentId: appointment.id },
        data: {
          status: "WAITING" as QueueStatus,
          checkedInAt: new Date(),
        },
      });
    } else {
      // Get current queue position
      const currentQueueCount = await prisma.queueEntry.count({
        where: {
          gurujiId: appointment.gurujiId,
          status: "WAITING" as QueueStatus,
        },
      });

      queueEntry = await prisma.queueEntry.create({
        data: {
          appointmentId: appointment.id,
          userId: session.user.id,
          gurujiId: appointment.gurujiId,
          position: currentQueueCount + 1,
          status: "WAITING" as QueueStatus,
          priority: appointment.priority,
          estimatedWait: (currentQueueCount + 1) * 15, // 15 minutes per person estimate
          checkedInAt: new Date(),
        },
      });
    }

    // Create notification
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: "Manual Check-in Successful",
        message: `You have been checked in for your appointment with ${appointment.guruji?.name}. Queue position: #${queueEntry.position}`,
        type: "checkin",
        data: {
          appointmentId: appointment.id,
          queuePosition: queueEntry.position,
          estimatedWait: queueEntry.estimatedWait,
          checkInMethod: "manual",
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "MANUAL_CHECK_IN",
        resource: "APPOINTMENT",
        resourceId: appointment.id,
        newData: {
          appointmentId: appointment.id,
          appointmentCode: validatedData.appointmentCode,
          queuePosition: queueEntry.position,
          checkedInAt: new Date().toISOString(),
        },
      },
    });

    // Invalidate caches
    cacheInvalidation.invalidateAppointments();
    cacheInvalidation.invalidateQueue();
    cacheInvalidation.invalidateUser(session.user.id);

    return createSuccessResponse({
      appointment: updatedAppointment,
      queueEntry: {
        position: queueEntry.position,
        estimatedWait: queueEntry.estimatedWait,
        status: queueEntry.status,
      },
    }, "Manual check-in successful", 200);
  } catch (error) {
    console.error("Manual check-in error:", error);

    if (error instanceof z.ZodError) {
      return createErrorResponse("Validation error", 400);
    }

    return createErrorResponse("Internal server error", 500);
  }
}