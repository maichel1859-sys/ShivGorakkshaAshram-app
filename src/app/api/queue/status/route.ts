import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { QueueStatus, AppointmentStatus } from "@prisma/client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's current queue entry
    const queueEntry = await prisma.queueEntry.findFirst({
      where: {
        userId: session.user.id,
        status: {
          in: ["WAITING", "IN_PROGRESS"]
        }
      },
      include: {
        appointment: {
          include: {
            guruji: {
              select: {
                id: true,
                name: true,
              }
            },
            user: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      },
      orderBy: {
        checkedInAt: "desc"
      }
    });

    let stats = null;

    if (queueEntry) {
      // Get queue statistics for the same Guruji
      const totalWaiting = await prisma.queueEntry.count({
        where: {
          gurujiId: queueEntry.gurujiId,
          status: "WAITING"
        }
      });

      // Get average wait time (simplified calculation)
      const completedToday = await prisma.queueEntry.findMany({
        where: {
          gurujiId: queueEntry.gurujiId,
          status: "COMPLETED",
          completedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        },
        select: {
          checkedInAt: true,
          startedAt: true,
        }
      });

      let averageWaitTime = 15; // Default 15 minutes
      if (completedToday.length > 0) {
        const totalWaitMinutes = completedToday.reduce((total, entry) => {
          if (entry.checkedInAt && entry.startedAt) {
            const waitTime = (entry.startedAt.getTime() - entry.checkedInAt.getTime()) / (1000 * 60);
            return total + waitTime;
          }
          return total;
        }, 0);
        averageWaitTime = Math.round(totalWaitMinutes / completedToday.length);
      }

      // Get currently being served patient (if any)
      const currentlyServing = await prisma.queueEntry.findFirst({
        where: {
          gurujiId: queueEntry.gurujiId,
          status: "IN_PROGRESS"
        },
        include: {
          appointment: {
            include: {
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      // Update estimated wait time based on current position
      const peopleAhead = await prisma.queueEntry.count({
        where: {
          gurujiId: queueEntry.gurujiId,
          status: "WAITING",
          position: {
            lt: queueEntry.position
          }
        }
      });

      const updatedEstimatedWait = peopleAhead * averageWaitTime;

      // Update the queue entry with new estimated wait time
      if (Math.abs((queueEntry.estimatedWait || 0) - updatedEstimatedWait) > 5) {
        await prisma.queueEntry.update({
          where: { id: queueEntry.id },
          data: { estimatedWait: updatedEstimatedWait }
        });
        queueEntry.estimatedWait = updatedEstimatedWait;
      }

      stats = {
        totalWaiting,
        averageWaitTime,
        currentlyServing: currentlyServing?.appointment.user.name || null
      };
    }

    return NextResponse.json({
      queueEntry,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Queue status error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update queue position and status
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only coordinators and admins can update queue status
    if (!["COORDINATOR", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { queueEntryId, status, position } = body;

    const updatedEntry = await prisma.queueEntry.update({
      where: { id: queueEntryId },
      data: {
        status: status as QueueStatus,
        position: position || undefined,
        startedAt: status === "IN_PROGRESS" ? new Date() : undefined,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
      },
      include: {
        appointment: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            guruji: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    });

    // Create notification for status change
    let notificationMessage = "";
    switch (status) {
      case "IN_PROGRESS":
        notificationMessage = `It's your turn! Please proceed to consultation room for your appointment with ${updatedEntry.appointment.guruji?.name}`;
        break;
      case "COMPLETED":
        notificationMessage = `Your consultation with ${updatedEntry.appointment.guruji?.name} is complete. Thank you for visiting!`;
        break;
      default:
        notificationMessage = `Your queue status has been updated to ${status}`;
    }

    await prisma.notification.create({
      data: {
        userId: updatedEntry.appointment.user.id,
        title: "Queue Status Update",
        message: notificationMessage,
        type: "queue",
        data: {
          queueEntryId: updatedEntry.id,
          appointmentId: updatedEntry.appointmentId,
          status: status,
          position: updatedEntry.position,
        },
      },
    });

    // Update appointment status accordingly
    if (status === "IN_PROGRESS") {
      await prisma.appointment.update({
        where: { id: updatedEntry.appointmentId },
        data: { status: "IN_PROGRESS" as AppointmentStatus }
      });
    } else if (status === "COMPLETED") {
      await prisma.appointment.update({
        where: { id: updatedEntry.appointmentId },
        data: { status: "COMPLETED" as AppointmentStatus }
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_QUEUE_STATUS",
        resource: "QUEUE_ENTRY",
        resourceId: updatedEntry.id,
        oldData: { status: queueEntryId },
        newData: { status, position },
      },
    });

    return NextResponse.json({
      message: "Queue status updated successfully",
      queueEntry: updatedEntry
    });
  } catch (error) {
    console.error("Queue update error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}