import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handler";
import { cacheInvalidation, sessionCache } from "@/lib/cache";

/**
 * @swagger
 * /api/checkin:
 *   post:
 *     summary: Check in for appointment
 *     description: Check in for an existing appointment and join the queue with rate limiting protection
 *     tags: [Queue]
 *     security:
 *       - SessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckInRequest'
 *     responses:
 *       200:
 *         description: Check-in successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     appointment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         status:
 *                           type: string
 *                           enum: [CHECKED_IN]
 *                         date:
 *                           type: string
 *                           format: date
 *                         startTime:
 *                           type: string
 *                         guruji:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             email:
 *                               type: string
 *                         checkedInAt:
 *                           type: string
 *                           format: date-time
 *                     queueEntry:
 *                       type: object
 *                       properties:
 *                         position:
 *                           type: integer
 *                           description: Queue position
 *                         estimatedWait:
 *                           type: integer
 *                           description: Estimated wait time in minutes
 *                         status:
 *                           type: string
 *                           enum: [WAITING]
 *                 message:
 *                   type: string
 *                   example: "Check-in successful"
 *       400:
 *         description: Bad request - already checked in, invalid appointment ID, or appointment not eligible
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Appointment not found or not eligible for check-in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many check-in requests - rate limited
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

const checkInSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required"),
  qrData: z.string().optional(), // QR data is optional for manual check-in
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return createErrorResponse("Authentication required", 401);
    }

    // Prevent duplicate check-in requests (rate limiting)
    const checkInKey = `checkin:${session.user.id}`;
    const recentCheckIn = sessionCache.get(checkInKey);
    
    if (recentCheckIn) {
      return createErrorResponse("Please wait before attempting another check-in", 429);
    }

    // Set temporary cache to prevent duplicate requests
    sessionCache.set(checkInKey, true, 10); // 10 seconds cooldown

    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error("JSON parsing error:", error);
      return createErrorResponse("Invalid JSON in request body", 400);
    }

    if (!body || typeof body !== "object") {
      return createErrorResponse("Request body must be a valid JSON object with appointmentId field", 400);
    }

    if (!body.appointmentId) {
      return createErrorResponse("appointmentId is required in request body", 400);
    }

    const validatedData = checkInSchema.parse(body);

    // Find appointment and verify it can be checked in
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: validatedData.appointmentId,
        userId: session.user.id,
        status: { in: ["BOOKED", "CONFIRMED"] }, // Allow both BOOKED and CONFIRMED
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        guruji: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        queueEntry: true, // Check if already in queue
      },
    });

    if (!appointment) {
      return createErrorResponse("Appointment not found or not eligible for check-in", 404);
    }

    // Check if already checked in
    if (appointment.status === "CHECKED_IN" || appointment.queueEntry) {
      return createErrorResponse("You have already checked in for this appointment", 400);
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

    // Update appointment status
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CHECKED_IN",
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

    // Create queue entry (we already verified no existing entry above)
    // Get current queue position
    const currentQueueCount = await prisma.queueEntry.count({
      where: {
        gurujiId: appointment.gurujiId,
        status: { in: ["WAITING", "IN_PROGRESS"] },
      },
    });

    const queueEntry = await prisma.queueEntry.create({
      data: {
        appointmentId: appointment.id,
        userId: session.user.id,
        gurujiId: appointment.gurujiId,
        position: currentQueueCount + 1,
        status: "WAITING",
        priority: appointment.priority,
        estimatedWait: (currentQueueCount + 1) * 15, // 15 minutes per person estimate
        checkedInAt: new Date(),
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: "Check-in Successful",
        message: `You have been checked in for your appointment with ${appointment.guruji?.name}. Queue position: #${queueEntry.position}`,
        type: "checkin",
        data: {
          appointmentId: appointment.id,
          queuePosition: queueEntry.position,
          estimatedWait: queueEntry.estimatedWait,
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CHECK_IN",
        resource: "APPOINTMENT",
        resourceId: appointment.id,
        newData: {
          appointmentId: appointment.id,
          queuePosition: queueEntry.position,
          checkedInAt: new Date().toISOString(),
        },
      },
    });

    // Invalidate related caches
    cacheInvalidation.invalidateAppointments();
    cacheInvalidation.invalidateQueue();
    cacheInvalidation.invalidateUser(session.user.id);

    // Clear the check-in cooldown (successful completion)
    sessionCache.delete(checkInKey);

    return createSuccessResponse({
      message: "Check-in successful",
      appointment: {
        id: updatedAppointment.id,
        status: updatedAppointment.status,
        date: updatedAppointment.date,
        startTime: updatedAppointment.startTime,
        guruji: updatedAppointment.guruji,
        checkedInAt: updatedAppointment.checkedInAt,
      },
      queueEntry: {
        position: queueEntry.position,
        estimatedWait: queueEntry.estimatedWait,
        status: queueEntry.status,
      },
    }, "Check-in successful", 200);
  } catch (error) {
    console.error("Check-in error:", error);

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