import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * @swagger
 * /api/appointments/availability:
 *   get:
 *     summary: Get available appointment slots for a specific date
 *     description: Returns available and booked time slots for the specified date
 *     tags: [Appointments]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check availability (YYYY-MM-DD)
 *       - in: query
 *         name: gurujiId
 *         schema:
 *           type: string
 *         description: Guruji ID (optional, defaults to primary Guruji)
 *     responses:
 *       200:
 *         description: Availability information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date:
 *                   type: string
 *                   format: date
 *                 bookedSlots:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Array of booked time slots (HH:MM format)
 *                 availableSlots:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Array of available time slots (HH:MM format)
 *                 businessHours:
 *                   type: object
 *                   properties:
 *                     start:
 *                       type: string
 *                     end:
 *                       type: string
 *       400:
 *         description: Bad request - invalid date
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const gurujiId = searchParams.get("gurujiId");

    if (!dateParam) {
      return NextResponse.json(
        { message: "Date parameter is required" },
        { status: 400 }
      );
    }

    // Validate date format
    const selectedDate = new Date(dateParam);
    if (isNaN(selectedDate.getTime())) {
      return NextResponse.json(
        { message: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return NextResponse.json(
        { message: "Cannot book appointments for past dates" },
        { status: 400 }
      );
    }

    // Set date range for the selected day
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get booked appointments for the date
    const whereClause: any = {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        in: ['BOOKED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'],
      },
    };

    // Add gurujiId filter if specified, otherwise get appointments for all Gurujis
    if (gurujiId) {
      whereClause.gurujiId = gurujiId;
    }

    const bookedAppointments = await prisma.appointment.findMany({
      where: whereClause,
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // Extract booked time slots (format as HH:MM)
    const bookedSlots = bookedAppointments.map(appointment => {
      const startTime = new Date(appointment.startTime);
      return startTime.toTimeString().slice(0, 5); // Get HH:MM format
    });

    // Define business hours and available slots
    const businessHours = {
      start: "09:00",
      end: "18:00",
    };

    // Generate all possible time slots (30-minute intervals)
    const allTimeSlots = [];
    const startHour = 9; // 9 AM
    const endHour = 18; // 6 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      allTimeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      allTimeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }

    // Filter out booked slots
    const availableSlots = allTimeSlots.filter(slot => !bookedSlots.includes(slot));

    return NextResponse.json({
      date: dateParam,
      bookedSlots,
      availableSlots,
      businessHours,
      totalSlots: allTimeSlots.length,
      availableCount: availableSlots.length,
      bookedCount: bookedSlots.length,
    });

  } catch (error) {
    console.error("Get availability error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}