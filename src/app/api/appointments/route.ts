import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { AppointmentStatus } from "@prisma/client";
import QRCode from "qrcode";
import { cachedFunctions, cacheInvalidation } from "@/lib/cache";
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handler";

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Get user appointments
 *     description: Retrieve appointments for the authenticated user with optional filtering
 *     tags: [Appointments]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [BOOKED, CONFIRMED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW]
 *         description: Filter by appointment status
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of appointments to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of appointments to skip
 *     responses:
 *       200:
 *         description: List of appointments retrieved successfully
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
 *                     appointments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Appointment'
 *                     total:
 *                       type: integer
 *                       description: Total number of appointments
 *                     hasMore:
 *                       type: boolean
 *                       description: Whether there are more appointments
 *                 message:
 *                   type: string
 *                   example: "Appointments retrieved successfully"
 *       401:
 *         description: Authentication required
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
 *   post:
 *     summary: Book a new appointment
 *     description: Create a new appointment booking with conflict detection and business hours validation
 *     tags: [Appointments]
 *     security:
 *       - SessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, time]
 *             properties:
 *               gurujiId:
 *                 type: string
 *                 description: Guruji ID (optional, defaults to primary Guruji)
 *                 example: "clx123abc456"
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Appointment date (YYYY-MM-DD)
 *                 example: "2024-12-25"
 *               time:
 *                 type: string
 *                 pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                 description: Appointment time (HH:MM in 24-hour format)
 *                 example: "14:30"
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason for the appointment
 *                 example: "Spiritual consultation for family matters"
 *               priority:
 *                 type: string
 *                 enum: [LOW, NORMAL, HIGH, URGENT]
 *                 default: NORMAL
 *                 description: Appointment priority level
 *               isRecurring:
 *                 type: boolean
 *                 default: false
 *                 description: Whether this is a recurring appointment
 *               recurringPattern:
 *                 type: object
 *                 description: Required if isRecurring is true
 *                 properties:
 *                   frequency:
 *                     type: string
 *                     enum: [daily, weekly, monthly]
 *                     description: Recurrence frequency
 *                   interval:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 12
 *                     description: Interval between recurrences
 *                   endDate:
 *                     type: string
 *                     format: date
 *                     description: End date for recurrence
 *     responses:
 *       201:
 *         description: Appointment booked successfully
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
 *                       $ref: '#/components/schemas/Appointment'
 *                     qrCode:
 *                       type: string
 *                       description: Base64 encoded QR code for check-in
 *                 message:
 *                   type: string
 *                   example: "Appointment booked successfully"
 *       400:
 *         description: Bad request - validation error or scheduling conflict
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
 *       409:
 *         description: Appointment time conflict
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

const appointmentSchema = z.object({
  gurujiId: z.string().min(1, "Guruji ID is required").optional(), // Optional since we'll get the default Guruji
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  reason: z.string().max(500, "Reason must be less than 500 characters").optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.object({
    frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
    interval: z.number().min(1).max(12).optional(),
    endDate: z.string().optional(),
  }).optional(),
}).refine((data) => {
  if (data.isRecurring && !data.recurringPattern) {
    return false;
  }
  return true;
}, {
  message: "Recurring pattern is required for recurring appointments",
  path: ["recurringPattern"],
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return createErrorResponse("Authentication required", 401);
    }

    const body = await req.json();
    const validatedData = appointmentSchema.parse(body);

    // Get the default Guruji if not specified
    let gurujiId = validatedData.gurujiId;
    if (!gurujiId) {
      const guruji = await cachedFunctions.getGuruji();
      if (!guruji) {
        return createErrorResponse("No Guruji available. Please contact support.", 400);
      }
      gurujiId = guruji.id;
    }

    // Validate date and time
    const appointmentDateTime = new Date(`${validatedData.date}T${validatedData.time}:00`);
    
    // Check if the date is in the future
    if (appointmentDateTime <= new Date()) {
      return createErrorResponse("Appointment date must be in the future", 400);
    }

    // Check business hours (9 AM - 6 PM, not Sunday)
    const day = appointmentDateTime.getDay();
    const hours = appointmentDateTime.getHours();
    
    if (day === 0) {
      return createErrorResponse("Appointments cannot be scheduled on Sundays", 400);
    }
    
    if (hours < 9 || hours >= 18) {
      return createErrorResponse("Appointments can only be scheduled between 9:00 AM and 6:00 PM", 400);
    }

    const endDateTime = new Date(appointmentDateTime.getTime() + 30 * 60000); // 30 minutes default

    // Check for conflicts
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        gurujiId,
        date: {
          gte: new Date(appointmentDateTime.getTime() - 15 * 60000), // 15 min buffer before
          lte: new Date(appointmentDateTime.getTime() + 15 * 60000), // 15 min buffer after
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
    });

    if (existingAppointment) {
      return createErrorResponse("This time slot is not available. Please choose a different time.", 409);
    }

    // Generate unique appointment ID and QR code
    const appointmentId = crypto.randomUUID();
    const qrData = {
      appointmentId,
      userId: session.user.id,
      type: 'checkin',
      timestamp: Date.now(),
    };
    const qrCodeString = await QRCode.toDataURL(JSON.stringify(qrData));

    // Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        id: appointmentId,
        userId: session.user.id,
        gurujiId,
        date: appointmentDateTime,
        startTime: appointmentDateTime,
        endTime: endDateTime,
        reason: validatedData.reason,
        priority: validatedData.priority,
        isRecurring: validatedData.isRecurring,
        recurringPattern: validatedData.recurringPattern ? JSON.stringify(validatedData.recurringPattern) : null,
        qrCode: qrCodeString,
        status: 'BOOKED',
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
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_APPOINTMENT",
        resource: "APPOINTMENT",
        resourceId: appointment.id,
        newData: {
          appointmentId: appointment.id,
          gurujiId: gurujiId,
          date: validatedData.date,
          time: validatedData.time,
          priority: validatedData.priority,
          reason: validatedData.reason,
        },
      },
    });

    // Invalidate related caches
    cacheInvalidation.invalidateAppointments();
    cacheInvalidation.invalidateUser(session.user.id);

    // TODO: Send confirmation email/SMS
    // TODO: Handle recurring appointments creation

    return createSuccessResponse({
      message: "Appointment booked successfully",
      appointment: {
        id: appointment.id,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        priority: appointment.priority,
        reason: appointment.reason,
        qrCode: appointment.qrCode,
        guruji: appointment.guruji,
        user: appointment.user,
      },
    }, "Appointment booked successfully", 201);
  } catch (error) {
    console.error("Appointment booking error:", error);

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
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    const whereClause: {
      userId: string;
      status?: AppointmentStatus;
    } = {
      userId: session.user.id,
    };

    if (status) {
      whereClause.status = status as AppointmentStatus;
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        guruji: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        queueEntry: {
          select: {
            position: true,
            status: true,
            estimatedWait: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.appointment.count({
      where: whereClause,
    });

    return NextResponse.json({
      appointments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Get appointments error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}