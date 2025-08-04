import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { AppointmentStatus, QueueStatus } from "@prisma/client";

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

    const body = await req.json();
    const validatedData = manualCheckInSchema.parse(body);

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
      return NextResponse.json(
        { message: "Invalid appointment code or appointment not found" },
        { status: 400 }
      );
    }

    // Check if appointment is for today (within reasonable time range)
    const appointmentDate = new Date(appointment.date);
    const now = new Date();
    const timeDiff = Math.abs(appointmentDate.getTime() - now.getTime());
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return NextResponse.json(
        { message: "Check-in is only available on the day of appointment" },
        { status: 400 }
      );
    }

    // Check if already checked in
    if (appointment.status === ("CHECKED_IN" as AppointmentStatus)) {
      return NextResponse.json(
        { message: "Already checked in for this appointment" },
        { status: 400 }
      );
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

    return NextResponse.json({
      message: "Manual check-in successful",
      appointment: updatedAppointment,
      queueEntry: {
        position: queueEntry.position,
        estimatedWait: queueEntry.estimatedWait,
        status: queueEntry.status,
      },
    });
  } catch (error) {
    console.error("Manual check-in error:", error);

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