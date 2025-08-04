import { User, Prisma, Role } from '@prisma/client';
import { BaseRepository, FindManyOptions, PaginationOptions } from './base.repository';

// Types for User repository
export type UserCreateInput = Prisma.UserCreateInput;
export type UserUpdateInput = Prisma.UserUpdateInput;
export type UserWhereInput = Prisma.UserWhereInput;
export type UserWithRelations = User & {
  accounts?: unknown[];
  sessions?: unknown[];
  patientAppointments?: unknown[];
  gurujiAppointments?: unknown[];
  elderlyFamilyContacts?: unknown[];
  familyContactFor?: unknown[];
};

export interface UserSearchOptions extends FindManyOptions<UserWhereInput> {
  search?: string;
  role?: Role;
  isActive?: boolean;
  includeRelations?: boolean;
}



export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<Role, number>;
  recentRegistrations: number;
}

export class UserRepository extends BaseRepository<User, UserCreateInput, UserUpdateInput, UserWhereInput> {
  protected modelName = 'user';

  // Enhanced find methods with common includes
  async findByIdWithRelations(id: string): Promise<UserWithRelations | null> {
    try {
      return await this.callModelMethod<UserWithRelations | null>('findUnique', {
        where: { id },
        include: {
          accounts: true,
          sessions: true,
          patientAppointments: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          },
          gurujiAppointments: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          },
          elderlyFamilyContacts: true,
          familyContactFor: true,
        }
      });
    } catch (error) {
      this.handleError('findByIdWithRelations', error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.callModelMethod<User | null>('findUnique', {
        where: { email }
      });
    } catch (error) {
      this.handleError('findByEmail', error);
      throw error;
    }
  }

  async findByPhone(phone: string): Promise<User | null> {
    try {
      return await this.callModelMethod<User | null>('findUnique', {
        where: { phone }
      });
    } catch (error) {
      this.handleError('findByPhone', error);
      throw error;
    }
  }

  async findByEmailOrPhone(email?: string, phone?: string): Promise<User | null> {
    if (!email && !phone) return null;
    
    try {
      const where: UserWhereInput = {};
      
      if (email && phone) {
        where.OR = [{ email }, { phone }];
      } else if (email) {
        where.email = email;
      } else if (phone) {
        where.phone = phone;
      }

      return await this.callModelMethod<User | null>('findFirst', { where });
    } catch (error) {
      this.handleError('findByEmailOrPhone', error);
      throw error;
    }
  }

  async findByRole(role: Role, options?: FindManyOptions<UserWhereInput>): Promise<User[]> {
    try {
      return await this.findMany({
        ...options,
        where: {
          ...options?.where,
          role
        }
      });
    } catch (error) {
      this.handleError('findByRole', error);
      throw error;
    }
  }

  async findActiveUsers(options?: FindManyOptions<UserWhereInput>): Promise<User[]> {
    try {
      return await this.findMany({
        ...options,
        where: {
          ...options?.where,
          isActive: true
        }
      });
    } catch (error) {
      this.handleError('findActiveUsers', error);
      throw error;
    }
  }

  async searchUsers(options: UserSearchOptions): Promise<User[]> {
    try {
      const { search, role, isActive, includeRelations, ...baseOptions } = options;
      
      let where: UserWhereInput = { ...baseOptions.where };

      // Add role filter
      if (role) {
        where.role = role;
      }

      // Add active filter
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      // Add search filter
      if (search) {
        const searchFilter = this.buildSearchFilter(
          ['name', 'email', 'phone'],
          search
        );
        where = { ...where, ...searchFilter };
      }

      const findOptions: FindManyOptions<UserWhereInput> = {
        ...baseOptions,
        where,
        include: includeRelations ? {
          patientAppointments: { take: 5 },
          gurujiAppointments: { take: 5 },
        } as unknown as Prisma.Sql : undefined
      };

      return await this.findMany(findOptions);
    } catch (error) {
      this.handleError('searchUsers', error);
      throw error;
    }
  }

  async findUsersWithPagination(options: PaginationOptions<UserWhereInput> & UserSearchOptions) {
    try {
      const { search, role, isActive, includeRelations, ...paginationOptions } = options;
      
      let where: UserWhereInput = { ...paginationOptions.where };

      if (role) where.role = role;
      if (isActive !== undefined) where.isActive = isActive;
      
      if (search) {
        const searchFilter = this.buildSearchFilter(['name', 'email', 'phone'], search);
        where = { ...where, ...searchFilter };
      }

      return await this.findManyWithPagination({
        ...paginationOptions,
        where,
        include: includeRelations ? {
          patientAppointments: { take: 5 },
          gurujiAppointments: { take: 5 },
        } as unknown as Prisma.Sql : undefined
      });
    } catch (error) {
      this.handleError('findUsersWithPagination', error);
      throw error;
    }
  }

  // User management methods
  async createUser(data: UserCreateInput): Promise<User> {
    try {
      // Ensure email uniqueness if provided
      if (data.email) {
        const existingUser = await this.findByEmail(data.email as string);
        if (existingUser) {
          throw new Error('User with this email already exists');
        }
      }

      // Ensure phone uniqueness if provided
      if (data.phone) {
        const existingUser = await this.findByPhone(data.phone as string);
        if (existingUser) {
          throw new Error('User with this phone number already exists');
        }
      }

      return await this.create(data);
    } catch (error) {
      this.handleError('createUser', error);
      throw error;
    }
  }

  async updateUser(id: string, data: UserUpdateInput): Promise<User> {
    try {
      // Check if user exists
      const existingUser = await this.findById(id);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Check email uniqueness if being updated
      if (data.email && data.email !== existingUser.email) {
        const emailUser = await this.findByEmail(data.email as string);
        if (emailUser && emailUser.id !== id) {
          throw new Error('Email already in use by another user');
        }
      }

      // Check phone uniqueness if being updated
      if (data.phone && data.phone !== existingUser.phone) {
        const phoneUser = await this.findByPhone(data.phone as string);
        if (phoneUser && phoneUser.id !== id) {
          throw new Error('Phone number already in use by another user');
        }
      }

      return await this.update(id, data);
    } catch (error) {
      this.handleError('updateUser', error);
      throw error;
    }
  }

  async deactivateUser(id: string): Promise<User> {
    try {
      return await this.update(id, { isActive: false });
    } catch (error) {
      this.handleError('deactivateUser', error);
      throw error;
    }
  }

  async activateUser(id: string): Promise<User> {
    try {
      return await this.update(id, { isActive: true });
    } catch (error) {
      this.handleError('activateUser', error);
      throw error;
    }
  }

  async changeUserRole(id: string, role: Role): Promise<User> {
    try {
      return await this.update(id, { role });
    } catch (error) {
      this.handleError('changeUserRole', error);
      throw error;
    }
  }

  // Statistics and analytics
  async getUserStats(dateFrom?: Date, dateTo?: Date): Promise<UserStats> {
    try {
      const dateFilter = this.buildDateRangeFilter('createdAt', dateFrom, dateTo);
      
      const [
        total,
        active,
        inactive,
        userRoles,
        recentRegistrations
      ] = await Promise.all([
        this.count(dateFilter),
        this.count({ ...dateFilter, isActive: true }),
        this.count({ ...dateFilter, isActive: false }),
        this.getRoleDistribution(dateFilter),
        this.getRecentRegistrations(7)
      ]);

      return {
        total,
        active,
        inactive,
        byRole: userRoles,
        recentRegistrations
      };
    } catch (error) {
      this.handleError('getUserStats', error);
      throw error;
    }
  }

  private async getRoleDistribution(where?: UserWhereInput): Promise<Record<Role, number>> {
    try {
      const roles: Role[] = ['USER', 'COORDINATOR', 'GURUJI', 'ADMIN'];
      const rolePromises = roles.map(role => 
        this.count({ ...where, role })
      );
      
      const roleCounts = await Promise.all(rolePromises);
      
      return roles.reduce((acc, role, index) => {
        acc[role] = roleCounts[index];
        return acc;
      }, {} as Record<Role, number>);
    } catch (error) {
      this.handleError('getRoleDistribution', error);
      throw error;
    }
  }

  private async getRecentRegistrations(days: number): Promise<number> {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      
      return await this.count({
        createdAt: {
          gte: dateFrom
        }
      });
    } catch (error) {
      this.handleError('getRecentRegistrations', error);
      throw error;
    }
  }

  // Family contact related methods
  async findUsersWithFamilyContacts(): Promise<UserWithRelations[]> {
    try {
      return await this.callModelMethod<UserWithRelations[]>('findMany', {
        where: {
          elderlyFamilyContacts: {
            some: {
              isActive: true
            }
          }
        },
        include: {
          elderlyFamilyContacts: {
            where: { isActive: true },
            include: {
              familyContact: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true
                }
              }
            }
          }
        }
      });
    } catch (error) {
      this.handleError('findUsersWithFamilyContacts', error);
      throw error;
    }
  }

  async findFamilyContactsForUser(elderlyUserId: string): Promise<unknown[]> {
    try {
      const result = await this.callModelMethod<{ elderlyFamilyContacts: unknown[] } | null>('findUnique', {
        where: { id: elderlyUserId },
        select: {
          elderlyFamilyContacts: {
            where: { isActive: true },
            include: {
              familyContact: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true
                }
              }
            }
          }
        }
      });

      return result?.elderlyFamilyContacts || [];
    } catch (error) {
      this.handleError('findFamilyContactsForUser', error);
      throw error;
    }
  }

  // Bulk operations
  async bulkUpdateUserStatus(userIds: string[], isActive: boolean): Promise<{ count: number }> {
    try {
      return await this.updateMany(
        { id: { in: userIds } },
        { isActive }
      );
    } catch (error) {
      this.handleError('bulkUpdateUserStatus', error);
      throw error;
    }
  }

  async bulkUpdateUserRole(userIds: string[], role: Role): Promise<{ count: number }> {
    try {
      return await this.updateMany(
        { id: { in: userIds } },
        { role }
      );
    } catch (error) {
      this.handleError('bulkUpdateUserRole', error);
      throw error;
    }
  }

  // Cleanup methods
  async deleteInactiveUsers(daysInactive: number = 365): Promise<{ count: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

      return await this.deleteMany({
        isActive: false,
        updatedAt: {
          lt: cutoffDate
        },
        // Don't delete users with any appointments
        patientAppointments: {
          none: {}
        },
        gurujiAppointments: {
          none: {}
        }
      });
    } catch (error) {
      this.handleError('deleteInactiveUsers', error);
      throw error;
    }
  }
}