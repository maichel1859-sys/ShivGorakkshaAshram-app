import { Prisma, AppointmentStatus, Priority } from '@prisma/client';
import { prisma } from '@/lib/database/prisma';
import { BaseRepository, FindManyOptions } from './base.repository';

// Types for Appointment repository
export type AppointmentCreateInput = Prisma.AppointmentCreateInput;
export type AppointmentUpdateInput = Prisma.AppointmentUpdateInput;
export type AppointmentWhereInput = Prisma.AppointmentWhereInput;
export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: {
    user: true;
    guruji: true;
  };
}>;

export interface AppointmentSearchOptions extends FindManyOptions<AppointmentWhereInput> {
  search?: string;
  status?: AppointmentStatus;
  priority?: Priority;
  gurujiId?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface AppointmentStats {
  total: number;
  byStatus: Record<AppointmentStatus, number>;
  byPriority: Record<Priority, number>;
  todayCount: number;
  upcomingCount: number;
  completedCount: number;
  cancelledCount: number;
}

export class AppointmentRepository extends BaseRepository<Prisma.AppointmentGetPayload<Record<string, unknown>>, AppointmentCreateInput, AppointmentUpdateInput, AppointmentWhereInput> {
  protected modelName = 'appointment';

  // Enhanced find methods
  async findByIdWithRelations(id: string): Promise<AppointmentWithRelations | null> {
    try {
      return await prisma.appointment.findUnique({
        where: { id },
        include: {
          user: true,
          guruji: true,
        },
      });
    } catch (error) {
      this.handleError('findByIdWithRelations', error);
      return null;
    }
  }

  async findByQRCode(qrCode: string): Promise<AppointmentWithRelations | null> {
    try {
      return await prisma.appointment.findUnique({
        where: { qrCode },
        include: {
          user: true,
          guruji: true,
        },
      });
    } catch (error) {
      this.handleError('findByQRCode', error);
      return null;
    }
  }

  async findByUserId(userId: string, options?: FindManyOptions<AppointmentWhereInput>): Promise<Prisma.AppointmentGetPayload<Record<string, unknown>>[]> {
    try {
      return await this.findMany({
        ...options,
        where: { ...options?.where, userId },
      });
    } catch (error) {
      this.handleError('findByUserId', error);
      return [];
    }
  }

  async findByGurujiId(gurujiId: string, options?: FindManyOptions<AppointmentWhereInput>): Promise<Prisma.AppointmentGetPayload<Record<string, unknown>>[]> {
    try {
      return await this.findMany({
        ...options,
        where: { ...options?.where, gurujiId },
      });
    } catch (error) {
      this.handleError('findByGurujiId', error);
      return [];
    }
  }

  async findByStatus(status: AppointmentStatus, options?: FindManyOptions<AppointmentWhereInput>): Promise<Prisma.AppointmentGetPayload<Record<string, unknown>>[]> {
    try {
      return await this.findMany({
        ...options,
        where: { ...options?.where, status },
      });
    } catch (error) {
      this.handleError('findByStatus', error);
      return [];
    }
  }

  async findByDateRange(startDate: Date, endDate: Date, options?: FindManyOptions<AppointmentWhereInput>): Promise<Prisma.AppointmentGetPayload<Record<string, unknown>>[]> {
    try {
      return await this.findMany({
        ...options,
        where: {
          ...options?.where,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
    } catch (error) {
      this.handleError('findByDateRange', error);
      return [];
    }
  }

  async findUpcomingAppointments(userId: string, days: number = 7): Promise<Prisma.AppointmentGetPayload<Record<string, unknown>>[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      return await prisma.appointment.findMany({
        where: {
          userId,
          date: {
            gte: new Date(),
            lte: futureDate,
          },
          status: {
            in: ['BOOKED', 'CONFIRMED'],
          },
        },
        include: {
          user: true,
          guruji: true,
        },
        orderBy: {
          date: 'asc',
        },
      });
    } catch (error) {
      this.handleError('findUpcomingAppointments', error);
      return [];
    }
  }

  async searchAppointments(options: AppointmentSearchOptions): Promise<Prisma.AppointmentGetPayload<Record<string, unknown>>[]> {
    try {
      const { 
        search, 
        status, 
        priority, 
        gurujiId, 
        userId, 
        dateFrom, 
        dateTo,
        ...findOptions 
      } = options;

      const where: AppointmentWhereInput = {
        ...findOptions.where,
      };

      if (search) {
        where.OR = [
          { reason: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { guruji: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (gurujiId) where.gurujiId = gurujiId;
      if (userId) where.userId = userId;

      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = dateFrom;
        if (dateTo) where.date.lte = dateTo;
      }

      return await this.findMany({
        ...findOptions,
        where,
      });
    } catch (error) {
      this.handleError('searchAppointments', error);
      return [];
    }
  }

  async createAppointment(data: AppointmentCreateInput): Promise<Prisma.AppointmentGetPayload<Record<string, unknown>>> {
    try {
      // Check for conflicts
      const conflicts = await this.findConflictingAppointments(
        data.guruji as string,
        data.date as Date,
        data.startTime as Date,
        data.endTime as Date,
      );

      if (conflicts.length > 0) {
        throw new Error('Appointment time slot is not available');
      }

      // Generate QR code
      const qrCode = this.generateQRCode();

      const appointment = await prisma.appointment.create({
        data: {
          ...data,
          qrCode,
        },
        include: {
          user: true,
          guruji: true,
        },
      });

      return appointment;
    } catch (error) {
      this.handleError('createAppointment', error);
      throw error;
    }
  }

  async updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<Prisma.AppointmentGetPayload<Record<string, unknown>>> {
    try {
      const updateData: AppointmentUpdateInput = { status };
      return await this.update(id, updateData);
    } catch (error) {
      this.handleError('updateAppointmentStatus', error);
      throw error;
    }
  }

  async checkInAppointment(id: string): Promise<Prisma.AppointmentGetPayload<Record<string, unknown>>> {
    try {
      return await this.updateAppointmentStatus(id, 'CHECKED_IN');
    } catch (error) {
      this.handleError('checkInAppointment', error);
      throw error;
    }
  }

  async cancelAppointment(id: string, reason?: string): Promise<Prisma.AppointmentGetPayload<Record<string, unknown>>> {
    try {
      const updateData: AppointmentUpdateInput = { 
        status: 'CANCELLED',
        reason: reason || 'Cancelled by user',
      };
      return await this.update(id, updateData);
    } catch (error) {
      this.handleError('cancelAppointment', error);
      throw error;
    }
  }

  async completeAppointment(id: string): Promise<Prisma.AppointmentGetPayload<Record<string, unknown>>> {
    try {
      return await this.updateAppointmentStatus(id, 'COMPLETED');
    } catch (error) {
      this.handleError('completeAppointment', error);
      throw error;
    }
  }

  private async findConflictingAppointments(
    gurujiId: string,
    date: Date,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ): Promise<Prisma.AppointmentGetPayload<Record<string, unknown>>[]> {
    try {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      return await prisma.appointment.findMany({
        where: {
          gurujiId,
          date: {
            gte: dayStart,
            lte: dayEnd,
          },
          status: {
            notIn: ['CANCELLED', 'NO_SHOW'],
          },
          OR: [
            {
              startTime: {
                lt: endTime,
                gte: startTime,
              },
            },
            {
              endTime: {
                gt: startTime,
                lte: endTime,
              },
            },
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gte: endTime } },
              ],
            },
          ],
          ...(excludeId && { id: { not: excludeId } }),
        },
      });
    } catch (error) {
      this.handleError('findConflictingAppointments', error);
      return [];
    }
  }

  private generateQRCode(): string {
    // Simple QR code generation - in production, use a proper QR library
    return `QR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getAppointmentStats(where?: AppointmentWhereInput): Promise<AppointmentStats> {
    try {
      const [
        total,
        todayCount,
        upcomingCount,
        completedCount,
        cancelledCount,
        statusDistribution,
        priorityDistribution,
      ] = await Promise.all([
        this.count(where),
        this.count({
          ...where,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        }),
        this.count({
          ...where,
          date: {
            gte: new Date(),
          },
          status: {
            in: ['BOOKED', 'CONFIRMED'],
          },
        }),
        this.count({
          ...where,
          status: 'COMPLETED',
        }),
        this.count({
          ...where,
          status: 'CANCELLED',
        }),
        this.getStatusDistribution(where),
        this.getPriorityDistribution(where),
      ]);

      return {
        total,
        byStatus: statusDistribution,
        byPriority: priorityDistribution,
        todayCount,
        upcomingCount,
        completedCount,
        cancelledCount,
      };
    } catch (error) {
      this.handleError('getAppointmentStats', error);
      return {
        total: 0,
        byStatus: {} as Record<AppointmentStatus, number>,
        byPriority: {} as Record<Priority, number>,
        todayCount: 0,
        upcomingCount: 0,
        completedCount: 0,
        cancelledCount: 0,
      };
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
      return {} as Record<AppointmentStatus, number>;
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
      return {} as Record<Priority, number>;
    }
  }

  // Bulk operations
  async bulkUpdateStatus(appointmentIds: string[], status: AppointmentStatus): Promise<{ count: number }> {
    try {
      const updateData: AppointmentUpdateInput = { status };
      const updatePromises = appointmentIds.map(id => this.update(id, updateData));
      await Promise.all(updatePromises);
      
      return { count: appointmentIds.length };
    } catch (error) {
      this.handleError('bulkUpdateStatus', error);
      throw error;
    }
  }

  async bulkCancelAppointments(appointmentIds: string[], reason?: string): Promise<{ count: number }> {
    try {
      const updateData: AppointmentUpdateInput = { 
        status: 'CANCELLED',
        reason: reason || 'Bulk cancelled',
      };
      const updatePromises = appointmentIds.map(id => this.update(id, updateData));
      await Promise.all(updatePromises);
      
      return { count: appointmentIds.length };
    } catch (error) {
      this.handleError('bulkCancelAppointments', error);
      throw error;
    }
  }

  // Advanced queries
  async findAppointmentsByDateRange(startDate: Date, endDate: Date, options?: FindManyOptions<AppointmentWhereInput>): Promise<Prisma.AppointmentGetPayload<Record<string, unknown>>[]> {
    try {
      return await this.findMany({
        ...options,
        where: {
          ...options?.where,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
    } catch (error) {
      this.handleError('findAppointmentsByDateRange', error);
      return [];
    }
  }

  async findAppointmentsByGurujiAndDate(gurujiId: string, date: Date): Promise<Prisma.AppointmentGetPayload<Record<string, unknown>>[]> {
    try {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      return await prisma.appointment.findMany({
        where: {
          gurujiId,
          date: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        include: {
          user: true,
          guruji: true,
        },
        orderBy: {
          startTime: 'asc',
        },
      });
    } catch (error) {
      this.handleError('findAppointmentsByGurujiAndDate', error);
      return [];
    }
  }

  async findAvailableTimeSlots(gurujiId: string, date: Date, duration: number = 30): Promise<Date[]> {
    try {
      const existingAppointments = await this.findAppointmentsByGurujiAndDate(gurujiId, date);
      
      // Business hours: 9 AM to 6 PM
      const businessStart = new Date(date);
      businessStart.setHours(9, 0, 0, 0);
      
      const businessEnd = new Date(date);
      businessEnd.setHours(18, 0, 0, 0);
      
      const availableSlots: Date[] = [];
      const currentSlot = new Date(businessStart);
      
      while (currentSlot < businessEnd) {
        const slotEnd = new Date(currentSlot.getTime() + duration * 60000);
        
        if (slotEnd <= businessEnd) {
          const hasConflict = existingAppointments.some(appointment => {
            const appointmentStart = new Date(appointment.startTime);
            const appointmentEnd = new Date(appointment.endTime);
            
            return (
              (currentSlot >= appointmentStart && currentSlot < appointmentEnd) ||
              (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
              (currentSlot <= appointmentStart && slotEnd >= appointmentEnd)
            );
          });
          
          if (!hasConflict) {
            availableSlots.push(new Date(currentSlot));
          }
        }
        
        currentSlot.setMinutes(currentSlot.getMinutes() + duration);
      }
      
      return availableSlots;
    } catch (error) {
      this.handleError('findAvailableTimeSlots', error);
      return [];
    }
  }
}