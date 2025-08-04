import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);


    // Check for cancelled appointments
    const cancelledAppointments = await prisma.appointment.count({
      where: {
        status: "CANCELLED",
        createdAt: { gte: oneDayAgo }
      }
    });

    // Check for no-show appointments
    const noShowAppointments = await prisma.appointment.count({
      where: {
        status: "NO_SHOW",
        createdAt: { gte: oneDayAgo }
      }
    });

    // Check for long queue wait times
    const longWaitQueueEntries = await prisma.queueEntry.count({
      where: {
        status: "WAITING",
        checkedInAt: { lte: new Date(now.getTime() - 2 * 60 * 60 * 1000) } // 2+ hours
      }
    });

    // Check for system issues (example: high error rate)
    const recentErrors = await prisma.auditLog.count({
      where: {
        action: "ERROR",
        createdAt: { gte: oneDayAgo }
      }
    });

    const alerts = [];

    if (cancelledAppointments > 5) {
      alerts.push({
        id: "high_cancellations",
        type: "warning",
        title: "High Cancellation Rate",
        message: `${cancelledAppointments} appointments cancelled in the last 24 hours`,
        severity: "medium",
        timestamp: new Date().toISOString()
      });
    }

    if (noShowAppointments > 3) {
      alerts.push({
        id: "no_shows",
        type: "warning",
        title: "Multiple No-Shows",
        message: `${noShowAppointments} patients didn't show up for appointments`,
        severity: "medium",
        timestamp: new Date().toISOString()
      });
    }

    if (longWaitQueueEntries > 0) {
      alerts.push({
        id: "long_waits",
        type: "error",
        title: "Long Queue Wait Times",
        message: `${longWaitQueueEntries} patients waiting for more than 2 hours`,
        severity: "high",
        timestamp: new Date().toISOString()
      });
    }

    if (recentErrors > 10) {
      alerts.push({
        id: "system_errors",
        type: "error",
        title: "System Errors Detected",
        message: `${recentErrors} system errors logged in the last 24 hours`,
        severity: "critical",
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}