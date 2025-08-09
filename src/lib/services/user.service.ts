import { User, Role } from '@prisma/client';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { BaseService, ServiceResponse, ServiceError, ServiceErrorCode } from './base.service';
import { UserRepository } from '@/lib/repositories/user.repository';
import { 
  UserRegistration, 
  UserUpdate, 
  userRegistrationSchema, 
  userUpdateSchema 
} from '@/lib/validation/unified-schemas';
import { hash, compare } from 'bcryptjs';
import { repositories } from '@/lib/repositories';
import { Prisma } from '@prisma/client';

export interface CreateUserRequest extends UserRegistration {
  skipEmailVerification?: boolean;
}

export interface UpdateUserRequest extends UserUpdate {
  id: string;
}

export interface UserSearchRequest {
  search?: string;
  role?: Role;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeStats?: boolean;
}

export interface ChangePasswordRequest {
  userId: string;
  currentPassword?: string;
  newPassword: string;
  requireCurrentPassword?: boolean;
}

export interface UserWithStats extends User {
  stats?: {
    appointmentCount: number;
    completedAppointments: number;
    cancelledAppointments: number;
    lastAppointment?: Date;
    joinedDaysAgo: number;
  };
}

export class UserService extends BaseService {
  public readonly serviceName = 'UserService';

  constructor(private userRepository: UserRepository = repositories.user) {
    super();
  }

  async createUser(request: CreateUserRequest): Promise<ServiceResponse<User>> {
    return await this.execute(async () => {
      // Validate input
      const validatedData = this.validateInput(
        request,
        (data) => userRegistrationSchema.parse(data),
        'Invalid user registration data'
      );

      // Check permissions (only admins and coordinators can create users with roles other than USER)
      if (validatedData.role && validatedData.role !== 'USER') {
        this.requirePermission('create:users');
      }

      // Hash password
      const hashedPassword = await hash(validatedData.password, 12);

      // Create user data
      const userData = {
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        password: hashedPassword,
        role: validatedData.role || 'USER',
        isActive: validatedData.isActive ?? true,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
      };

      const user = await this.userRepository.createUser(userData);

      // Remove password from response
      const { password: _password, ...userResponse } = user;
      
      return userResponse as User;
    }, 'createUser');
  }

  async getUserById(userId: string, includeRelations = false): Promise<ServiceResponse<User | null>> {
    return await this.execute(async () => {
      // Check if user can access this profile
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id !== userId) {
        this.requirePermission('read:users');
      }

      const user = includeRelations 
        ? await this.userRepository.findByIdWithRelations(userId)
        : await this.userRepository.findById(userId);

      if (!user) {
        throw new ServiceError(
          'User not found',
          ServiceErrorCode.NOT_FOUND,
          404
        );
      }

      // Remove sensitive data
      const { password: _password, ...userResponse } = user;
      
      return userResponse as User;
    }, 'getUserById');
  }

  async updateUser(request: UpdateUserRequest): Promise<ServiceResponse<User>> {
    return await this.execute(async () => {
      const { id, ...updateData } = request;

      // Validate input
      const validatedData = this.validateInput(
        updateData,
        (data) => userUpdateSchema.parse(data),
        'Invalid user update data'
      );

      // Check ownership or permissions
      const currentUser = this.getCurrentUser();
      if (currentUser?.id !== id) {
        this.requirePermission('update:users');
      }

      // Check role change permissions
      if (validatedData.role && validatedData.role !== 'USER') {
        this.requirePermission('manage:users');
      }

      const updatedUser = await this.userRepository.updateUser(id, {
        ...validatedData,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : undefined,
      });

      // Remove password from response
      const { password: _password, ...userResponse } = updatedUser;
      
      return userResponse as User;
    }, 'updateUser');
  }

  async deleteUser(userId: string): Promise<ServiceResponse<void>> {
    return await this.execute(async () => {
      this.requirePermission('delete:users');

      // Check if user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ServiceError(
          'User not found',
          ServiceErrorCode.NOT_FOUND,
          404
        );
      }

      // Prevent self-deletion
      const currentUser = this.getCurrentUser();
      if (currentUser?.id === userId) {
        throw new ServiceError(
          'Cannot delete your own account',
          ServiceErrorCode.BUSINESS_RULE_VIOLATION,
          400
        );
      }

      // Soft delete (deactivate) instead of hard delete to preserve data integrity
      await this.userRepository.deactivateUser(userId);
      
      return undefined;
    }, 'deleteUser');
  }

  async searchUsers(request: UserSearchRequest): Promise<ServiceResponse<{
    users: User[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    stats?: {
      total: number;
      active: number;
      inactive: number;
      byRole: Record<string, number>;
    };
  }>> {
    return await this.execute(async () => {
      this.requirePermission('read:users');

      const { page, limit } = this.parsePagination({
        page: request.page,
        limit: request.limit,
        maxLimit: 100
      });

      const result = await this.userRepository.findUsersWithPagination({
        page,
        limit,
        search: request.search,
        role: request.role,
        isActive: request.isActive,
        orderBy: request.sortBy ? {
          [request.sortBy]: request.sortOrder || 'asc'
        } as unknown as Prisma.Sql : { createdAt: 'desc' } as unknown as Prisma.Sql,
        includeRelations: request.includeStats
      });

      // Remove passwords from all users
      const sanitizedUsers = result.data.map(user => {
        const { password: _password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      });

      let stats;
      if (request.includeStats) {
        stats = await this.userRepository.getUserStats();
      }

      return {
        users: sanitizedUsers,
        pagination: {
          ...result.pagination,
          pages: result.pagination.totalPages
        },
        stats
      };
    }, 'searchUsers');
  }

  async changePassword(request: ChangePasswordRequest): Promise<ServiceResponse<void>> {
    return await this.execute(async () => {
      const { userId, currentPassword, newPassword, requireCurrentPassword = true } = request;

      // Check ownership or permissions
      const currentUser = this.getCurrentUser();
      if (currentUser?.id !== userId) {
        this.requirePermission('update:users');
        // Admins don't need current password
        if (requireCurrentPassword) {
          request.requireCurrentPassword = false;
        }
      }

      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ServiceError(
          'User not found',
          ServiceErrorCode.NOT_FOUND,
          404
        );
      }

      // Verify current password if required
      if (requireCurrentPassword && currentPassword) {
        if (!user.password) {
          throw new ServiceError(
            'User has no password set',
            ServiceErrorCode.BUSINESS_RULE_VIOLATION,
            400
          );
        }

        const isCurrentPasswordValid = await compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
          throw new ServiceError(
            'Current password is incorrect',
            ServiceErrorCode.VALIDATION_ERROR,
            400
          );
        }
      }

      // Hash new password
      const hashedNewPassword = await hash(newPassword, 12);

      // Update password
      await this.userRepository.updateUser(userId, {
        password: hashedNewPassword
      });

      return undefined;
    }, 'changePassword');
  }

  async activateUser(userId: string): Promise<ServiceResponse<User>> {
    return await this.execute(async () => {
      this.requirePermission('manage:users');

      const user = await this.userRepository.activateUser(userId);
      const { password: _password, ...userResponse } = user;
      
      return userResponse as User;
    }, 'activateUser');
  }

  async deactivateUser(userId: string): Promise<ServiceResponse<User>> {
    return await this.execute(async () => {
      this.requirePermission('manage:users');

      // Prevent self-deactivation
      const currentUser = this.getCurrentUser();
      if (currentUser?.id === userId) {
        throw new ServiceError(
          'Cannot deactivate your own account',
          ServiceErrorCode.BUSINESS_RULE_VIOLATION,
          400
        );
      }

      const user = await this.userRepository.deactivateUser(userId);
      const { password: _password, ...userResponse } = user;
      
      return userResponse as User;
    }, 'deactivateUser');
  }

  async changeUserRole(userId: string, newRole: Role): Promise<ServiceResponse<User>> {
    return await this.execute(async () => {
      this.requirePermission('manage:users');

      // Prevent changing own role to lower privilege
      const currentUser = this.getCurrentUser();
      if (currentUser?.id === userId && newRole !== 'ADMIN') {
        throw new ServiceError(
          'Cannot change your own role to lower privilege',
          ServiceErrorCode.BUSINESS_RULE_VIOLATION,
          400
        );
      }

      const user = await this.userRepository.changeUserRole(userId, newRole);
      const { password: _password, ...userResponse } = user;
      
      return userResponse as User;
    }, 'changeUserRole');
  }

  async getUsersByRole(role: Role): Promise<ServiceResponse<User[]>> {
    return await this.execute(async () => {
      this.requirePermission('read:users');

      const users = await this.userRepository.findByRole(role, {
        where: { isActive: true },
        orderBy: { name: 'asc' } as unknown as Prisma.Sql
      });

      // Remove passwords
      const sanitizedUsers = users.map(user => {
        const { password: _password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      });

      return sanitizedUsers;
    }, 'getUsersByRole');
  }

  async getActiveUsers(): Promise<ServiceResponse<User[]>> {
    return await this.execute(async () => {
      this.requirePermission('read:users');

      const users = await this.userRepository.findActiveUsers({
        orderBy: { name: 'asc' } as unknown as Prisma.Sql
      });

      // Remove passwords
      const sanitizedUsers = users.map(user => {
        const { password: _password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      });

      return sanitizedUsers;
    }, 'getActiveUsers');
  }

  async getUserStats(dateFrom?: Date, dateTo?: Date): Promise<ServiceResponse<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
    recentRegistrations: number;
  }>> {
    return await this.execute(async () => {
      this.requirePermission('read:analytics');

      const { startDate, endDate } = this.parseDateRange({
        startDate: dateFrom,
        endDate: dateTo
      });

      const stats = await this.userRepository.getUserStats(startDate, endDate);
      
      return stats;
    }, 'getUserStats');
  }

  async findUserByEmailOrPhone(email?: string, phone?: string): Promise<ServiceResponse<User | null>> {
    return await this.execute(async () => {
      if (!email && !phone) {
        throw new ServiceError(
          'Either email or phone number is required',
          ServiceErrorCode.VALIDATION_ERROR,
          400
        );
      }

      const user = await this.userRepository.findByEmailOrPhone(email, phone);
      
      if (user) {
        const { password: _password, ...userResponse } = user;
        return userResponse as User;
      }

      return null;
    }, 'findUserByEmailOrPhone');
  }

  async bulkUpdateUserStatus(userIds: string[], isActive: boolean): Promise<ServiceResponse<{ count: number }>> {
    return await this.execute(async () => {
      this.requirePermission('manage:users');

      // Prevent self-deactivation in bulk operations
      const currentUser = this.getCurrentUser();
      if (!isActive && currentUser && userIds.includes(currentUser.id)) {
        throw new ServiceError(
          'Cannot deactivate your own account in bulk operation',
          ServiceErrorCode.BUSINESS_RULE_VIOLATION,
          400
        );
      }

      const result = await this.userRepository.bulkUpdateUserStatus(userIds, isActive);
      
      return result;
    }, 'bulkUpdateUserStatus');
  }

  async getFamilyContacts(elderlyUserId: string): Promise<ServiceResponse<unknown[]>> {
    return await this.execute(async () => {
      // Check ownership or permissions
      this.checkOwnership(elderlyUserId, 'view family contacts');

      const familyContacts = await this.userRepository.findFamilyContactsForUser(elderlyUserId);
      
      return familyContacts;
    }, 'getFamilyContacts');
  }

  async getUsersWithFamilyContacts(): Promise<ServiceResponse<unknown[]>> {
    return await this.execute(async () => {
      this.requirePermission('read:users');

      const users = await this.userRepository.findUsersWithFamilyContacts();
      
      // Remove passwords
      const sanitizedUsers = users.map(user => {
        const { password: _password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      return sanitizedUsers;
    }, 'getUsersWithFamilyContacts');
  }

  // Health check implementation
  public async healthCheck(): Promise<boolean> {
    try {
      await this.userRepository.count();
      return true;
    } catch {
      return false;
    }
  }
}