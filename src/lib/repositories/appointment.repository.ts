import { Appointment, Prisma, AppointmentStatus, Priority } from '@prisma/client';
import { BaseRepository, FindManyOptions } from './base.repository';

// Types for Appointment repository
export type AppointmentCreateInput = Prisma.AppointmentCreateInput;
export type AppointmentUpdateInput = Prisma.AppointmentUpdateInput;
export type AppointmentWhereInput = Prisma.AppointmentWhereInput;
export type AppointmentWithRelations = Appointment & {
  user?: unknown;
  guruji?: unknown;
  queueEntry?: unknown;
  consultationSession?: unknown;
};

export interface AppointmentSearchOptions extends FindManyOptions<AppointmentWhereInput> {
  search?: string;
  status?: AppointmentStatus;
  priority?: Priority;
  gurujiId?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  includeRelations?: boolean;
}

export interface AppointmentStats {
  total: number;
  byStatus: Record<AppointmentStatus, number>;
  byPriority: Record<Priority, number>;
  todayCount: number;
  upcomingCount: number;
  completedToday: number;
}

export interface AvailabilitySlot {
  date: Date;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  gurujiId: string;
}

export class AppointmentRepository extends BaseRepository<Appointment, AppointmentCreateInput, AppointmentUpdateInput, AppointmentWhereInput> {
  protected modelName = 'appointment';

  // Enhanced find methods
  async findByIdWithRelations(id: string): Promise<AppointmentWithRelations | null> {
    try {
      return await this.model.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            }
          },
          guruji: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          queueEntry: true,
          consultationSession: true,
        }
      });
    } catch (error) {
      this.handleError('findByIdWithRelations', error);
      throw error;
    }
  }

  async findByQRCode(qrCode: string): Promise<AppointmentWithRelations | null> {
    try {
      return await this.model.findUnique({
        where: { qrCode },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            }
          },
          guruji: {
            select: {
              id: true,
              name: true,
            }
          },
        }
      });
    } catch (error) {
      this.handleError('findByQRCode', error);
      throw error;
    }
  }

  async findByUserId(userId: string, options?: FindManyOptions<AppointmentWhereInput>): Promise<Appointment[]> {
    try {
      return await this.findMany({
        ...options,
        where: {
          ...options?.where,
          userId
        }
      });
    } catch (error) {
      this.handleError('findByUserId', error);
      throw error;
    }
  }

  async findByGurujiId(gurujiId: string, options?: FindManyOptions<AppointmentWhereInput>): Promise<Appointment[]> {
    try {
      return await this.findMany({
        ...options,
        where: {
          ...options?.where,
          gurujiId
        }
      });
    } catch (error) {
      this.handleError('findByGurujiId', error);
      throw error;
    }
  }

  async findByStatus(status: AppointmentStatus, options?: FindManyOptions<AppointmentWhereInput>): Promise<Appointment[]> {
    try {
      return await this.findMany({
        ...options,
        where: {
          ...options?.where,
          status
        }
      });
    } catch (error) {
      this.handleError('findByStatus', error);
      throw error;
    }
  }

  async findByDateRange(startDate: Date, endDate: Date, options?: FindManyOptions<AppointmentWhereInput>): Promise<Appointment[]> {
    try {
      return await this.findMany({
        ...options,
        where: {
          ...options?.where,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });
    } catch (error) {
      this.handleError('findByDateRange', error);
      throw error;
    }
  }

  async findTodayAppointments(gurujiId?: string): Promise<AppointmentWithRelations[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const where: AppointmentWhereInput = {
        date: {
          gte: today,
          lt: tomorrow
        }
      };

      if (gurujiId) {
        where.gurujiId = gurujiId;
      }

      return await this.model.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            }
          },
          guruji: {
            select: {
              id: true,
              name: true,
            }
          },
          queueEntry: true,
        },
        orderBy: { startTime: 'asc' }
      });
    } catch (error) {
      this.handleError('findTodayAppointments', error);
      throw error;
    }
  }

  async findUpcomingAppointments(userId: string, days: number = 7): Promise<AppointmentWithRelations[]> {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      return await this.model.findMany({
        where: {
          userId,
          date: {
            gte: now,
            lte: futureDate
          },
          status: {
            in: ['BOOKED', 'CONFIRMED', 'CHECKED_IN']
          }
        },
        include: {
          guruji: {
            select: {
              id: true,
              name: true,
            }
          },
        },
        orderBy: { date: 'asc' }
      });
    } catch (error) {
      this.handleError('findUpcomingAppointments', error);
      throw error;
    }
  }

  async searchAppointments(options: AppointmentSearchOptions): Promise<Appointment[]> {
    try {
      const { 
        search, 
        status, 
        priority, 
        gurujiId, 
        userId, 
        dateFrom, 
        dateTo, 
        includeRelations,
        ...baseOptions 
      } = options;
      
      const where: AppointmentWhereInput = { ...baseOptions.where };

      // Add filters
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (gurujiId) where.gurujiId = gurujiId;
      if (userId) where.userId = userId;

      // Add date range filter
      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = dateFrom;
        if (dateTo) where.date.lte = dateTo;
      }

      // Add search filter
      if (search) {
        where.OR = [
          {
            user: {
              name: {
                contains: search,
                mode: 'insensitive'
              }
            }
          },
          {
            guruji: {
              name: {
                contains: search,
                mode: 'insensitive'
              }
            }
          },
          {
            reason: {
              contains: search,
              mode: 'insensitive'
            }
          }
        ];
      }

      return await this.findMany({
        ...baseOptions,
        where,
        include: includeRelations ? {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            }
          },
          guruji: {
            select: {
              id: true,
              name: true,
            }
          },
        } : undefined
      });
    } catch (error) {
      this.handleError('searchAppointments', error);
      throw error;
    }
  }

  // Appointment management methods
  async createAppointment(data: AppointmentCreateInput): Promise<AppointmentWithRelations> {
    try {
      // Check for conflicts
      const conflicts = await this.findConflictingAppointments(
        data.gurujiId as string,
        data.date as Date,
        data.startTime as Date,
        data.endTime as Date
      );

      if (conflicts.length > 0) {
        throw new Error('Appointment time slot is not available');
      }

      // Generate QR code
      const qrCode = this.generateQRCode();

      const appointment = await this.model.create({
        data: {
          ...data,
          qrCode
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            }
          },
          guruji: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
        }
      });

      return appointment;
    } catch (error) {
      this.handleError('createAppointment', error);
      throw error;
    }
  }

  async updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    try {
      const updateData: AppointmentUpdateInput = { status };

      // Set checkedInAt when status changes to CHECKED_IN
      if (status === 'CHECKED_IN') {
        updateData.checkedInAt = new Date();
      }

      return await this.update(id, updateData);
    } catch (error) {
      this.handleError('updateAppointmentStatus', error);
      throw error;
    }
  }

  async checkInAppointment(id: string): Promise<Appointment> {
    try {
      return await this.updateAppointmentStatus(id, 'CHECKED_IN');
    } catch (error) {
      this.handleError('checkInAppointment', error);
      throw error;
    }
  }

  async cancelAppointment(id: string, reason?: string): Promise<Appointment> {
    try {
      const updateData: AppointmentUpdateInput = { 
        status: 'CANCELLED',
        notes: reason 
      };

      return await this.update(id, updateData);
    } catch (error) {
      this.handleError('cancelAppointment', error);
      throw error;
    }
  }

  async completeAppointment(id: string): Promise<Appointment> {
    try {
      return await this.updateAppointmentStatus(id, 'COMPLETED');
    } catch (error) {
      this.handleError('completeAppointment', error);
      throw error;
    }
  }

  // Availability and scheduling
  async findConflictingAppointments(
    gurujiId: string,
    date: Date,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ): Promise<Appointment[]> {
    try {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const where: AppointmentWhereInput = {
        gurujiId,
        date: {
          gte: dayStart,
          lte: dayEnd
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW']
        },
        OR: [
          {
            // New appointment starts during existing appointment
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          {
            // New appointment ends during existing appointment
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          {
            // New appointment encompasses existing appointment
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          }
        ]
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      return await this.findMany({ where });
    } catch (error) {
      this.handleError('findConflictingAppointments', error);
      throw error;
    }
  }

  async getAvailableSlots(
    gurujiId: string,
    date: Date,
    slotDuration: number = 30
  ): Promise<AvailabilitySlot[]> {
    try {
      const businessHours = {
        start: 9, // 9 AM
        end: 18,  // 6 PM
      };

      const slots: AvailabilitySlot[] = [];
      const existingAppointments = await this.findByDateRange(
        new Date(date.setHours(0, 0, 0, 0)),
        new Date(date.setHours(23, 59, 59, 999)),
        {
          where: {
            gurujiId,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] }
          }
        }
      );

      // Generate time slots
      for (let hour = businessHours.start; hour < businessHours.end; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const startTime = new Date(date);
          startTime.setHours(hour, minute, 0, 0);
          
          const endTime = new Date(startTime);
          endTime.setMinutes(endTime.getMinutes() + slotDuration);

          // Check if slot conflicts with existing appointments
          const hasConflict = existingAppointments.some(apt => {
            const aptStart = new Date(apt.startTime);
            const aptEnd = new Date(apt.endTime);
            
            return (
              (startTime >= aptStart && startTime < aptEnd) ||
              (endTime > aptStart && endTime <= aptEnd) ||
              (startTime <= aptStart && endTime >= aptEnd)
            );
          });

          slots.push({
            date,
            startTime,
            endTime,
            isAvailable: !hasConflict,
            gurujiId
          });
        }
      }

      return slots;
    } catch (error) {
      this.handleError('getAvailableSlots', error);
      throw error;
    }
  }

  // Statistics and reporting
  async getAppointmentStats(
    dateFrom?: Date,
    dateTo?: Date,
    gurujiId?: string
  ): Promise<AppointmentStats> {
    try {
      const where: AppointmentWhereInput = {};

      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = dateFrom;
        if (dateTo) where.date.lte = dateTo;
      }

      if (gurujiId) {
        where.gurujiId = gurujiId;
      }

      const [
        total,
        statusCounts,
        priorityCounts,
        todayCount,
        upcomingCount,
        completedToday
      ] = await Promise.all([
        this.count(where),
        this.getStatusDistribution(where),
        this.getPriorityDistribution(where),
        this.getTodayAppointmentCount(gurujiId),
        this.getUpcomingAppointmentCount(gurujiId),
        this.getCompletedTodayCount(gurujiId)
      ]);

      return {
        total,
        byStatus: statusCounts,
        byPriority: priorityCounts,
        todayCount,
        upcomingCount,
        completedToday
      };
    } catch (error) {
      this.handleError('getAppointmentStats', error);
      throw error;
    }
  }

  private async getStatusDistribution(where?: AppointmentWhereInput): Promise<Record<AppointmentStatus, number>> {
    try {
      const statuses: AppointmentStatus[] = ['BOOKED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
      const statusPromises = statuses.map(status => 
        this.count({ ...where, status })
      );
      
      const statusCounts = await Promise.all(statusPromises);
      
      return statuses.reduce((acc, status, index) => {
        acc[status] = statusCounts[index];
        return acc;
      }, {} as Record<AppointmentStatus, number>);
    } catch (error) {
      this.handleError('getStatusDistribution', error);
      throw error;
    }
  }

  private async getPriorityDistribution(where?: AppointmentWhereInput): Promise<Record<Priority, number>> {
    try {
      const priorities: Priority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
      const priorityPromises = priorities.map(priority => 
        this.count({ ...where, priority })
      );
      
      const priorityCounts = await Promise.all(priorityPromises);
      
      return priorities.reduce((acc, priority, index) => {
        acc[priority] = priorityCounts[index];
        return acc;
      }, {} as Record<Priority, number>);
    } catch (error) {
      this.handleError('getPriorityDistribution', error);
      throw error;
    }
  }

  private async getTodayAppointmentCount(gurujiId?: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const where: AppointmentWhereInput = {
        date: {
          gte: today,
          lt: tomorrow
        }
      };

      if (gurujiId) where.gurujiId = gurujiId;

      return await this.count(where);
    } catch (error) {
      this.handleError('getTodayAppointmentCount', error);
      throw error;
    }
  }

  private async getUpcomingAppointmentCount(gurujiId?: string): Promise<number> {
    try {
      const now = new Date();
      const where: AppointmentWhereInput = {
        date: { gte: now },
        status: { in: ['BOOKED', 'CONFIRMED'] }
      };

      if (gurujiId) where.gurujiId = gurujiId;

      return await this.count(where);
    } catch (error) {
      this.handleError('getUpcomingAppointmentCount', error);
      throw error;
    }
  }

  private async getCompletedTodayCount(gurujiId?: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const where: AppointmentWhereInput = {
        date: {
          gte: today,
          lt: tomorrow
        },
        status: 'COMPLETED'
      };

      if (gurujiId) where.gurujiId = gurujiId;

      return await this.count(where);
    } catch (error) {
      this.handleError('getCompletedTodayCount', error);
      throw error;
    }
  }

  // Utility methods
  private generateQRCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `APT-${timestamp}-${random}`.toUpperCase();
  }

  // Bulk operations
  async bulkUpdateStatus(appointmentIds: string[], status: AppointmentStatus): Promise<{ count: number }> {
    try {
      const updateData: AppointmentUpdateInput = { status };
      
      if (status === 'CHECKED_IN') {
        updateData.checkedInAt = new Date();
      }

      return await this.updateMany(
        { id: { in: appointmentIds } },
        updateData
      );
    } catch (error) {
      this.handleError('bulkUpdateStatus', error);
      throw error;
    }
  }

  async bulkCancel(appointmentIds: string[], reason?: string): Promise<{ count: number }> {
    try {
      return await this.updateMany(
        { id: { in: appointmentIds } },
        { 
          status: 'CANCELLED',
          notes: reason 
        }
      );
    } catch (error) {
      this.handleError('bulkCancel', error);
      throw error;
    }
  }

  // Cleanup methods
  async deleteOldCancelledAppointments(daysOld: number = 90): Promise<{ count: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      return await this.deleteMany({
        status: 'CANCELLED',
        updatedAt: { lt: cutoffDate }
      });
    } catch (error) {
      this.handleError('deleteOldCancelledAppointments', error);
      throw error;
    }
  }
}