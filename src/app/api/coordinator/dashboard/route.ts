import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { AppointmentStatus, QueueStatus } from "@prisma/client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "COORDINATOR") {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get today's appointment statistics
    const [
      totalAppointmentsToday,
      checkedInToday,
      completedToday,
      waitingInQueue,
      pendingApprovals
    ] = await Promise.all([
      // Total appointments for today
      prisma.appointment.count({
        where: {
          date: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),
      
      // Checked in today (have queue entries)
      prisma.queueEntry.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),
      
      // Completed consultations today
      prisma.consultationSession.count({
        where: {
          startTime: {
            gte: startOfDay,
            lt: endOfDay,
          },
          endTime: {
            not: null,
          },
        },
      }),
      
      // Currently waiting in queue
      prisma.queueEntry.count({
        where: {
          status: {
            in: ["WAITING" as QueueStatus, "IN_PROGRESS" as QueueStatus],
          },
        },
      }),
      
      // Pending appointment approvals (using BOOKED as pending status)
      prisma.appointment.count({
        where: {
          status: "BOOKED" as AppointmentStatus,
        },
      }),
    ]);

    // Get upcoming appointments for today
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
        status: {
          in: ["CONFIRMED" as AppointmentStatus, "BOOKED" as AppointmentStatus],
        },
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        guruji: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
      take: 10,
    });

    // Format upcoming appointments
    const formattedUpcomingAppointments = upcomingAppointments.map((appointment) => ({
      id: appointment.id,
      patientName: appointment.user.name,
      gurujiName: appointment.guruji?.name || "Unassigned",
      time: appointment.date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      status: appointment.status,
      priority: appointment.priority,
    }));

    // Get queue summary by Guruji
    const queueSummary = await prisma.queueEntry.groupBy({
      by: ["gurujiId"],
      where: {
        status: {
          in: ["WAITING" as QueueStatus, "IN_PROGRESS" as QueueStatus],
        },
      },
      _count: {
        _all: true,
      },
    });

    // Enhance queue summary with Guruji names and detailed counts
    const enhancedQueueSummary = await Promise.all(
      queueSummary.map(async (queue) => {
        const [guruji, waitingCount, inProgressCount] = await Promise.all([
          queue.gurujiId ? prisma.user.findUnique({
            where: { id: queue.gurujiId },
            select: { name: true },
          }) : Promise.resolve(null),
          prisma.queueEntry.count({
            where: {
              gurujiId: queue.gurujiId,
              status: "WAITING" as QueueStatus,
            },
          }),
          prisma.queueEntry.count({
            where: {
              gurujiId: queue.gurujiId,
              status: "IN_PROGRESS" as QueueStatus,
            },
          }),
        ]);

        // Calculate average wait time (simplified calculation)
        const averageWaitTime = waitingCount > 0 ? waitingCount * 30 : 0; // Rough estimate

        return {
          gurujiId: queue.gurujiId,
          gurujiName: guruji?.name || "Unknown",
          waitingCount,
          inProgressCount,
          averageWaitTime,
        };
      })
    );

    // Get today's detailed stats
    const [appointmentsToday, checkinsToday, completionsToday, cancellationsToday] = await Promise.all([
      prisma.appointment.count({
        where: {
          date: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),
      prisma.queueEntry.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),
      prisma.consultationSession.count({
        where: {
          startTime: {
            gte: startOfDay,
            lt: endOfDay,
          },
          endTime: {
            not: null,
          },
        },
      }),
      prisma.appointment.count({
        where: {
          date: {
            gte: startOfDay,
            lt: endOfDay,
          },
          status: "CANCELLED" as AppointmentStatus,
        },
      }),
    ]);

    const dashboardData = {
      totalAppointmentsToday,
      checkedInToday,
      waitingInQueue,
      completedToday,
      pendingApprovals,
      upcomingAppointments: formattedUpcomingAppointments,
      queueSummary: enhancedQueueSummary,
      todayStats: {
        appointments: appointmentsToday,
        checkins: checkinsToday,
        completions: completionsToday,
        cancellations: cancellationsToday,
      },
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Get coordinator dashboard error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}