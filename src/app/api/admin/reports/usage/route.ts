import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "summary";
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    // Default to last 30 days if no dates provided
    const endDate = toDate ? new Date(toDate) : new Date();
    const startDate = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Previous period for comparison (same duration before start date)
    const periodDuration = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodDuration);
    const prevEndDate = new Date(startDate.getTime());

    // Get current period stats
    const [
      totalUsers,
      activeUsers,
      newUsers,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      totalRemedies
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          consultationSessions: {
            some: {
              startTime: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      prisma.appointment.count({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      prisma.appointment.count({
        where: {
          status: "COMPLETED",
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      prisma.appointment.count({
        where: {
          status: "CANCELLED",
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      prisma.remedyDocument.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
    ]);

    // Get previous period stats for growth calculation
    const [
      prevNewUsers,
      prevTotalAppointments,
      prevTotalRemedies
    ] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: {
            gte: prevStartDate,
            lte: prevEndDate,
          },
        },
      }),
      prisma.appointment.count({
        where: {
          date: {
            gte: prevStartDate,
            lte: prevEndDate,
          },
        },
      }),
      prisma.remedyDocument.count({
        where: {
          createdAt: {
            gte: prevStartDate,
            lte: prevEndDate,
          },
        },
      }),
    ]);

    // Calculate growth percentages
    const userGrowth = prevNewUsers > 0 ? ((newUsers - prevNewUsers) / prevNewUsers) * 100 : 0;
    const appointmentGrowth = prevTotalAppointments > 0 ? ((totalAppointments - prevTotalAppointments) / prevTotalAppointments) * 100 : 0;
    const remedyGrowth = prevTotalRemedies > 0 ? ((totalRemedies - prevTotalRemedies) / prevTotalRemedies) * 100 : 0;

    // Calculate average wait time
    const queueEntries = await prisma.queueEntry.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: "COMPLETED",
      },
      select: {
        checkedInAt: true,
        createdAt: true,
      },
    });

    const averageWaitTime = queueEntries.length > 0 
      ? queueEntries.reduce((acc, entry) => {
          const waitTime = (entry.checkedInAt?.getTime() || 0) - entry.createdAt.getTime();
          return acc + (waitTime / (1000 * 60)); // Convert to minutes
        }, 0) / queueEntries.length
      : 0;

    const stats = {
      totalUsers,
      activeUsers,
      newUsers,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      totalRemedies,
      averageWaitTime: Math.round(averageWaitTime),
      systemUptime: 99.8, // Mock value - in real implementation, get from monitoring
      userGrowth: Math.round(userGrowth * 100) / 100,
      appointmentGrowth: Math.round(appointmentGrowth * 100) / 100,
      remedyGrowth: Math.round(remedyGrowth * 100) / 100,
    };

    // Get user type statistics
    const userTypeStats = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        _all: true,
      },
    });

    const formattedUserTypeStats = userTypeStats.map(stat => ({
      type: stat.role,
      count: stat._count._all,
      percentage: Math.round((stat._count._all / totalUsers) * 100),
      growth: Math.random() * 20 - 10, // Mock growth data
    }));

    // Get Guruji performance data
    const gurujiPerformance = await prisma.user.findMany({
      where: {
        role: "GURUJI",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        consultationSessions: {
          where: {
            startTime: {
              gte: startDate,
              lte: endDate,
            },
            endTime: {
              not: null,
            },
          },
          select: {
            startTime: true,
            endTime: true,
          },
        },
        remedyDocuments: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    });

    const formattedGurujiPerformance = gurujiPerformance.map(guruji => {
      const totalConsultations = guruji.consultationSessions.length;
      const averageSessionTime = totalConsultations > 0
        ? guruji.consultationSessions.reduce((acc, session) => {
            const duration = session.endTime 
              ? (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60)
              : 0;
            return acc + duration;
          }, 0) / totalConsultations
        : 0;

      return {
        id: guruji.id,
        name: guruji.name,
        totalConsultations,
        averageRating: 4.5 + Math.random() * 0.5, // Mock rating data
        averageSessionTime: Math.round(averageSessionTime),
        totalRemediesPrescribed: guruji.remedyDocuments.length,
      };
    });

    // Get daily usage data for charts
    const dailyUsage = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);

      const [dayUsers, dayAppointments, dayRemedies] = await Promise.all([
        prisma.user.count({
          where: {
            createdAt: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
        }),
        prisma.appointment.count({
          where: {
            date: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
        }),
        prisma.remedyDocument.count({
          where: {
            createdAt: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
        }),
      ]);

      dailyUsage.push({
        date: currentDate.toISOString().split('T')[0],
        users: dayUsers,
        appointments: dayAppointments,
        remedies: dayRemedies,
        avgWaitTime: Math.round(Math.random() * 60 + 15), // Mock data
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({
      stats,
      userTypeStats: formattedUserTypeStats,
      gurujiPerformance: formattedGurujiPerformance,
      dailyUsage,
      period: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
        type,
      },
    });
  } catch (error) {
    console.error("Get usage analytics error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}