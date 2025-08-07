'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';
import { subDays, format } from 'date-fns';

// Helper function to check admin permissions
async function requireAdminAccess() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  if (session.user.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }

  return session;
}

// Get admin dashboard statistics
export async function getAdminDashboardStats() {
  const session = await requireAdminAccess();

  try {
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

    return {
      success: true,
      data: {
        totalUsers,
        totalAppointments,
        totalRemedies,
        activeQueues,
        systemHealth,
        recentActivity: formattedActivity
      }
    };
  } catch (error) {
    console.error("Get admin dashboard stats error:", error);
    return { success: false, error: 'Failed to fetch dashboard statistics' };
  }
}

// Get coordinator dashboard data
export async function getCoordinatorDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const [
      todayAppointments,
      pendingAppointments,
      activeQueue,
      recentCheckins
    ] = await Promise.all([
      // Today's appointments
      prisma.appointment.count({
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      // Pending appointments
      prisma.appointment.count({
        where: {
          status: { in: ['BOOKED', 'CONFIRMED'] },
        },
      }),
      // Active queue
      prisma.queueEntry.findMany({
        where: {
          status: { in: ['WAITING', 'IN_PROGRESS'] },
        },
        include: {
          user: {
            select: { name: true, phone: true },
          },
        },
        orderBy: { position: 'asc' },
      }),
      // Recent check-ins
      prisma.appointment.findMany({
        where: {
          status: 'CHECKED_IN',
          updatedAt: {
            gte: new Date(Date.now() - 2 * 60 * 60 * 1000), // Last 2 hours
          },
        },
        include: {
          user: {
            select: { name: true, phone: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      success: true,
      data: {
        todayAppointments,
        pendingAppointments,
        activeQueue,
        recentCheckins,
      },
    };
  } catch (error) {
    console.error("Get coordinator dashboard error:", error);
    return { success: false, error: 'Failed to fetch coordinator dashboard' };
  }
}

// Get guruji dashboard data
export async function getGurujiDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  if (session.user.role !== 'GURUJI' && session.user.role !== 'ADMIN') {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const [
      todayAppointments,
      completedToday,
      pendingConsultations,
      recentPatients
    ] = await Promise.all([
      // Today's appointments
      prisma.appointment.findMany({
        where: {
          gurujiId: session.user.id,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
        include: {
          user: {
            select: { name: true, phone: true },
          },
        },
        orderBy: { startTime: 'asc' },
      }),
      // Completed today
      prisma.appointment.count({
        where: {
          gurujiId: session.user.id,
          status: 'COMPLETED',
          updatedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      // Pending consultations
      prisma.consultationSession.count({
        where: {
          gurujiId: session.user.id,
          endTime: null, // Pending consultations are those without end time
        },
      }),
      // Recent patients
      prisma.appointment.findMany({
        where: {
          gurujiId: session.user.id,
          status: 'COMPLETED',
        },
        include: {
          user: {
            select: { name: true, phone: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        distinct: ['userId'],
      }),
    ]);

    return {
      success: true,
      data: {
        todayAppointments,
        completedToday,
        pendingConsultations,
        recentPatients,
      },
    };
  } catch (error) {
    console.error("Get guruji dashboard error:", error);
    return { success: false, error: 'Failed to fetch guruji dashboard' };
  }
}

// Get system alerts
export async function getSystemAlerts() {
  const session = await requireAdminAccess();

  try {
    const [recentErrors, failedLogins, systemHealth] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          action: { contains: "ERROR" },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.auditLog.findMany({
        where: {
          action: "FAILED_LOGIN",
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      // Add system health checks here
      Promise.resolve({ status: "healthy", uptime: process.uptime() }),
    ]);

    return {
      success: true,
      data: {
        recentErrors,
        failedLogins,
        systemHealth,
      },
    };
  } catch (error) {
    console.error("Get system alerts error:", error);
    return { success: false, error: 'Failed to fetch system alerts' };
  }
}

// Get usage reports
export async function getUsageReports(options?: {
  dateFrom?: string;
  dateTo?: string;
  type?: 'summary' | 'detailed' | 'performance' | 'trends';
}) {
  const session = await requireAdminAccess();

  try {
    const { dateFrom, dateTo, type = 'summary' } = options || {};
    
    // Parse dates
    const fromDate = dateFrom ? new Date(dateFrom) : subDays(new Date(), 30);
    const toDate = dateTo ? new Date(dateTo) : new Date();

    // Get basic stats
    const [
      totalUsers,
      activeUsers,
      newUsers,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      totalRemedies,
      gurujiPerformance
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          updatedAt: {
            gte: subDays(new Date(), 7)
          }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: fromDate,
            lte: toDate
          }
        }
      }),
      prisma.appointment.count({
        where: {
          createdAt: {
            gte: fromDate,
            lte: toDate
          }
        }
      }),
      prisma.appointment.count({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: fromDate,
            lte: toDate
          }
        }
      }),
      prisma.appointment.count({
        where: {
          status: 'CANCELLED',
          createdAt: {
            gte: fromDate,
            lte: toDate
          }
        }
      }),
      prisma.remedyTemplate.count({
        where: {
          isActive: true
        }
      }),
      // Get guruji performance
      prisma.user.findMany({
        where: {
          role: 'GURUJI'
        },
        include: {
          _count: {
            select: {
              gurujiAppointments: {
                where: {
                  createdAt: {
                    gte: fromDate,
                    lte: toDate
                  }
                }
              }
            }
          }
        }
      })
    ]);

    // Calculate growth percentages (simplified)
    const userGrowth = 12; // Mock data
    const appointmentGrowth = 8; // Mock data
    const remedyGrowth = 15; // Mock data

    // Calculate average wait time (simplified)
    const averageWaitTime = 25; // Mock data

    // System uptime (mock data)
    const systemUptime = 99.9;

    // User type stats (mock data)
    const userTypeStats = [
      { type: 'Regular Users', count: Math.floor(totalUsers * 0.7), percentage: 70, growth: 5 },
      { type: 'Premium Users', count: Math.floor(totalUsers * 0.2), percentage: 20, growth: 15 },
      { type: 'Gurujis', count: Math.floor(totalUsers * 0.1), percentage: 10, growth: 0 },
    ];

    // Daily usage data (mock data)
    const dailyUsage = [];
    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      dailyUsage.push({
        date: currentDate.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 50) + 10,
        appointments: Math.floor(Math.random() * 20) + 5,
        remedies: Math.floor(Math.random() * 10) + 2,
        avgWaitTime: Math.floor(Math.random() * 30) + 15,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Format guruji performance
    const formattedGurujiPerformance = gurujiPerformance.map(guruji => ({
      id: guruji.id,
      name: guruji.name || 'Unknown',
      totalConsultations: guruji._count.gurujiAppointments,
      averageRating: 4.5, // Mock data
      averageSessionTime: 45, // Mock data
      totalRemediesPrescribed: Math.floor(Math.random() * 50) + 10, // Mock data
    }));

    return {
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        newUsers,
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        totalRemedies,
        averageWaitTime,
        systemUptime,
        userGrowth,
        appointmentGrowth,
        remedyGrowth,
      },
      dailyUsage,
      userTypeStats,
      gurujiPerformance: formattedGurujiPerformance,
    };
  } catch (error) {
    console.error("Get usage reports error:", error);
    return { success: false, error: 'Failed to fetch usage reports' };
  }
}

// Export usage reports
export async function exportUsageReport(options?: {
  dateFrom?: string;
  dateTo?: string;
  type?: 'summary' | 'detailed' | 'performance' | 'trends';
}) {
  const session = await requireAdminAccess();
  try {
    const { dateFrom, dateTo, type = 'summary' } = options || {};
    const fromDate = dateFrom ? new Date(dateFrom) : subDays(new Date(), 30);
    const toDate = dateTo ? new Date(dateTo) : new Date();

    // Generate CSV data
    const csvData = [
      ['Date', 'Total Users', 'Active Users', 'Appointments', 'Completed', 'Cancelled', 'Remedies'],
      [format(fromDate, 'yyyy-MM-dd'), '100', '75', '25', '20', '5', '15'],
      [format(toDate, 'yyyy-MM-dd'), '120', '85', '30', '25', '5', '18'],
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    
    return { success: true, blob };
  } catch (error) {
    console.error("Export usage report error:", error);
    return { success: false, error: 'Failed to export report' };
  }
}

// Helper functions for usage reports
async function getAppointmentUsage(startDate: Date, endDate: Date) {
  const appointments = await prisma.appointment.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      status: true,
      createdAt: true,
      date: true,
    },
  });

  const dailyStats = new Map();
  
  appointments.forEach(appointment => {
    const date = appointment.createdAt.toISOString().split('T')[0];
    if (!dailyStats.has(date)) {
      dailyStats.set(date, { total: 0, completed: 0, cancelled: 0 });
    }
    
    const stats = dailyStats.get(date);
    stats.total++;
    
    if (appointment.status === 'COMPLETED') {
      stats.completed++;
    } else if (appointment.status === 'CANCELLED') {
      stats.cancelled++;
    }
  });

  return {
    total: appointments.length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length,
    cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
    dailyStats: Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date,
      ...stats,
    })),
  };
}

async function getConsultationStats(startDate: Date, endDate: Date) {
  const consultations = await prisma.consultationSession.findMany({
    where: {
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      notes: true,
      symptoms: true,
      diagnosis: true,
      duration: true,
      patient: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      appointment: {
        select: {
          id: true,
          reason: true,
        },
      },
    },
  });

  const consultationStats = {
    total: consultations.length,
    completed: consultations.filter(c => c.endTime !== null).length,
    inProgress: consultations.filter(c => c.endTime === null).length,
    averageDuration: consultations.length > 0 
      ? consultations.reduce((acc, c) => acc + (c.duration || 0), 0) / consultations.length 
      : 0,
  };

  return consultationStats;
}

async function getRemedyUsage(startDate: Date, endDate: Date) {
  const remedies = await prisma.remedyDocument.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      template: true,
      consultationSession: {
        include: {
          guruji: true,
        },
      },
    },
  });

  const remedyStats = {
    total: remedies.length,
    active: remedies.filter(r => r.deliveredAt === null).length,
    completed: remedies.filter(r => r.deliveredAt !== null).length,
    byType: remedies.reduce((acc, remedy) => {
      const type = remedy.template.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return remedyStats;
}

async function getUserUsage(startDate: Date, endDate: Date) {
  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      role: true,
      createdAt: true,
      isActive: true,
    },
  });

  return {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    byRole: users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
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

// Get system status for admin monitoring
export async function getSystemStatus() {
  const session = await requireAdminAccess();

  try {
    // Get basic system metrics
    const [
      totalUsers,
      totalAppointments,
      activeQueues,
      databaseConnections,
      recentErrors
    ] = await Promise.all([
      prisma.user.count(),
      prisma.appointment.count(),
      prisma.queueEntry.count({
        where: {
          status: {
            in: ["WAITING", "IN_PROGRESS"]
          }
        }
      }),
      // Simulate database connections (in real app, this would be actual DB metrics)
      Promise.resolve(15),
      // Get recent system errors from audit logs
      prisma.auditLog.findMany({
        where: {
          action: {
            contains: "ERROR"
          },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        take: 10,
        orderBy: { createdAt: "desc" }
      })
    ]);

    // Calculate system health
    let status: "healthy" | "warning" | "critical" = "healthy";
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for critical issues
    if (activeQueues > 20) {
      status = "warning";
      warnings.push("High queue load detected");
    }

    if (recentErrors.length > 5) {
      status = "critical";
      errors.push("Multiple system errors detected");
    }

    // Simulate system metrics (in real app, these would be actual system calls)
    const cpuUsage = Math.floor(Math.random() * 30) + 20; // 20-50%
    const memoryUsage = Math.floor(Math.random() * 40) + 30; // 30-70%
    const diskUsage = Math.floor(Math.random() * 30) + 50; // 50-80%

    if (diskUsage > 75) {
      status = "warning";
      warnings.push("High disk usage detected");
    }

    if (memoryUsage > 80) {
      status = "warning";
      warnings.push("High memory usage detected");
    }

    // Calculate uptime (simulated)
    const uptime = "5 days, 12 hours";

    // Get last backup time (simulated)
    const lastBackup = "2 hours ago";

    return {
      success: true,
      systemStatus: {
        status,
        uptime,
        cpuUsage,
        memoryUsage,
        diskUsage,
        activeConnections: databaseConnections,
        databaseStatus: "connected" as const,
        lastBackup,
        errors,
        warnings
      }
    };
  } catch (error) {
    console.error("Get system status error:", error);
    return { 
      success: false, 
      error: 'Failed to fetch system status',
      systemStatus: {
        status: "critical" as const,
        uptime: "Unknown",
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        activeConnections: 0,
        databaseStatus: "error" as const,
        lastBackup: "Unknown",
        errors: ["Failed to fetch system status"],
        warnings: []
      }
    };
  }
} 

// Get system settings
export async function getSystemSettings() {
  const session = await requireAdminAccess();

  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    return {
      success: true,
      settings,
    };
  } catch (error) {
    console.error("Get system settings error:", error);
    return { success: false, error: 'Failed to fetch system settings' };
  }
}

// Update system settings
export async function updateSystemSettings(formData: FormData) {
  const session = await requireAdminAccess();

  try {
    const settingsData = Object.fromEntries(formData.entries());
    
    // Update each setting
    const updatePromises = Object.entries(settingsData).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: {
          key,
          value: String(value),
          type: 'string',
          category: 'general',
        },
      })
    );

    await Promise.all(updatePromises);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "SETTINGS_UPDATED",
        resource: "SYSTEM_SETTINGS",
        resourceId: "general",
      },
    });

    revalidatePath('/admin/settings');
    
    return {
      success: true,
      message: 'Settings updated successfully',
    };
  } catch (error) {
    console.error("Update system settings error:", error);
    return { success: false, error: 'Failed to update system settings' };
  }
} 

export async function getApiDocs() {
  try {
    // Import the swagger spec dynamically
    const swaggerModule = await import('@/lib/swagger');
    const swaggerSpec = swaggerModule.default;
    
    return {
      success: true,
      spec: swaggerSpec
    };
  } catch (error) {
    console.error('Error loading API docs:', error);
    return {
      success: false,
      error: 'Failed to load API documentation'
    };
  }
} 