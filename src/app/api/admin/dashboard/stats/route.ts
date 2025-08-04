import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
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

    // Get total counts
    const [
      totalUsers,
      totalAppointments,
      totalRemedies,
      activeQueues,
      recentActivity
    ] = await Promise.all([
      prisma.user.count(),
      prisma.appointment.count(),
      prisma.remedyTemplate.count({ where: { isActive: true } }),
      prisma.queueEntry.count({
        where: {
          status: {
            in: ["WAITING", "IN_PROGRESS"]
          }
        }
      }),
      // Get recent audit logs for activity
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" }
      })
    ]);

    // Calculate system health based on various factors
    let systemHealth: 'good' | 'warning' | 'critical' = 'good';
    
    // Check for critical issues
    const failedAppointments = await prisma.appointment.count({
      where: {
        status: "CANCELLED",
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    if (failedAppointments > 10) {
      systemHealth = 'critical';
    } else if (failedAppointments > 5 || activeQueues > 20) {
      systemHealth = 'warning';
    }

    // Format recent activity
    const formattedActivity = recentActivity.map(log => ({
      id: log.id,
      action: `${log.action.replace(/_/g, ' ')} - ${log.resource}`,
      user: log.userId ? `User ${log.userId}` : 'System',
      timestamp: log.createdAt.toLocaleString(),
      type: getActivityType(log.action)
    }));

    const stats = {
      totalUsers,
      totalAppointments,
      totalRemedies,
      activeQueues,
      systemHealth,
      recentActivity: formattedActivity
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Get admin dashboard stats error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

function getActivityType(action: string): 'user' | 'appointment' | 'remedy' | 'system' {
  if (action.includes('USER') || action.includes('LOGIN')) {
    return 'user';
  } else if (action.includes('APPOINTMENT') || action.includes('CHECKIN')) {
    return 'appointment';  
  } else if (action.includes('REMEDY')) {
    return 'remedy';
  }
  return 'system';
}