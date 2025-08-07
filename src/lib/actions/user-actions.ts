'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';
import { z } from 'zod';
import { userRegistrationSchema, userUpdateSchema } from '@/lib/validation/unified-schemas';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits').optional(),
  role: z.enum(['USER', 'STAFF', 'ADMIN']).default('USER'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

const updateUserAdminSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().min(10, 'Phone must be at least 10 digits').optional(),
  role: z.enum(['USER', 'STAFF', 'ADMIN']).optional(),
  active: z.boolean().optional(),
});

// Get users with filtering - Enhanced version
export async function getUsers(options?: {
  role?: Role;
  active?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const { role, active, search, limit = 50, offset = 0 } = options || {};

    // Build where clause
    const whereClause: Record<string, unknown> = {};
    
    if (role) {
      whereClause.role = role;
    }
    
    if (active !== undefined) {
      whereClause.isActive = active;
    }

    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          phone: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            // Remove non-existent appointments field
          },
        },
        orderBy: {
          name: 'asc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    // Transform the data to match expected format
    const transformedUsers = users.map(user => ({
      ...user,
      active: user.isActive,
    }));

    return {
      success: true,
      users: transformedUsers,
      total,
      hasMore: offset + limit < total,
    };
  } catch (error) {
    console.error('Get users error:', error);
    return { success: false, error: 'Failed to fetch users' };
  }
}

// Get single user by ID
export async function getUser(userId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // Users can only view their own profile, admins can view any
    if (session.user.id !== userId && session.user.role !== 'ADMIN') {
      return { success: false, error: 'Permission denied' };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        phone: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          // Remove non-existent appointments field
        },
      },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return {
      success: true,
      user: {
        ...user,
        active: user.isActive,
      },
    };
  } catch (error) {
    console.error('Get user error:', error);
    return { success: false, error: 'Failed to fetch user' };
  }
}

// Create user Server Action
export async function createUser(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only admins can create users
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Permission denied' };
  }

  try {
    const data = createUserSchema.parse({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string || undefined,
      role: formData.get('role') as Role || 'USER',
      password: formData.get('password') as string || undefined,
    });

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return { success: false, error: 'Email already exists' };
    }

    // Hash password if provided, otherwise generate a temporary one
    let hashedPassword;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 12);
    } else {
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      hashedPassword = await bcrypt.hash(tempPassword, 12);
      // TODO: Send email with temporary password
    }

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role as 'USER' | 'ADMIN' | 'GURUJI' | 'COORDINATOR',
        password: hashedPassword,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        phone: true,
        createdAt: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_USER',
        resource: 'USER',
        resourceId: user.id,
        newData: {
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });

    revalidatePath('/admin/users');
    
    return { success: true, user: { ...user, active: user.isActive } };
  } catch (error) {
    console.error('Create user error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Failed to create user' };
  }
}

// Update user Server Action (Admin version)
export async function updateUser(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const userId = formData.get('userId') as string;
    
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    // Users can only update their own profile, admins can update any
    if (session.user.id !== userId && session.user.role !== 'ADMIN') {
      return { success: false, error: 'Permission denied' };
    }

    const data = updateUserAdminSchema.parse({
      name: formData.get('name') as string || undefined,
      email: formData.get('email') as string || undefined,
      phone: formData.get('phone') as string || undefined,
      role: formData.get('role') as Role || undefined,
      active: formData.get('active') ? formData.get('active') === 'true' : undefined,
    });

    // Check if email already exists (excluding current user)
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: { 
          email: data.email,
          id: { not: userId },
        },
      });

      if (existingUser) {
        return { success: false, error: 'Email already exists' };
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.role && session.user.role === 'ADMIN') updateData.role = data.role;
    if (data.active !== undefined && session.user.role === 'ADMIN') updateData.isActive = data.active;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        phone: true,
        updatedAt: true,
      },
    });

    revalidatePath('/admin/users');
    revalidatePath('/user/profile');
    
    return { success: true, user: { ...user, active: user.isActive } };
  } catch (error) {
    console.error('Update user error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Failed to update user' };
  }
}

// Delete user Server Action
export async function deleteUser(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only admins can delete users
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Permission denied' };
  }

  try {
    const userId = formData.get('userId') as string;
    
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    // Can't delete yourself
    if (userId === session.user.id) {
      return { success: false, error: 'Cannot delete your own account' };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check for dependencies
    const appointmentCount = await prisma.appointment.count({
      where: { userId },
    });

    if (appointmentCount > 0) {
      return { success: false, error: 'Cannot delete user with existing appointments. Deactivate instead.' };
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_USER',
        resource: 'USER',
        resourceId: userId,
        oldData: {
          name: user.name,
          email: user.email,
        },
      },
    });

    revalidatePath('/admin/users');
    
    return { success: true };
  } catch (error) {
    console.error('Delete user error:', error);
    return { success: false, error: 'Failed to delete user' };
  }
}

// Toggle user status Server Action
export async function toggleUserStatus(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Only admins can toggle user status
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Permission denied' };
  }

  try {
    const userId = formData.get('userId') as string;
    const active = formData.get('active') === 'true';
    
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    // Can't deactivate yourself
    if (userId === session.user.id && !active) {
      return { success: false, error: 'Cannot deactivate your own account' };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: active },
    });

    revalidatePath('/admin/users');
    
    return { success: true };
  } catch (error) {
    console.error('Toggle user status error:', error);
    return { success: false, error: 'Failed to update user status' };
  }
}

// Change user password Server Action (Enhanced)
export async function changeUserPassword(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const userId = formData.get('userId') as string;
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    
    if (!userId || !newPassword) {
      return { success: false, error: 'User ID and new password are required' };
    }

    // Users can only change their own password, admins can change any
    if (session.user.id !== userId && session.user.role !== 'ADMIN') {
      return { success: false, error: 'Permission denied' };
    }

    // If not admin, require current password
    if (session.user.role !== 'ADMIN' && !currentPassword) {
      return { success: false, error: 'Current password is required' };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password if not admin
    if (session.user.role !== 'ADMIN') {
      const isValidPassword = await bcrypt.compare(currentPassword, user.password || '');
      if (!isValidPassword) {
        return { success: false, error: 'Current password is incorrect' };
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, error: 'Failed to change password' };
  }
}

// Update user profile Server Action
export async function updateUserProfile(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  try {
    const data = userUpdateSchema.parse({
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      dateOfBirth: formData.get('dateOfBirth'),
      address: formData.get('address'),
    });

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        address: data.address,
      },
    });

    revalidatePath('/user/settings');
    revalidatePath('/admin/users');
    
    return { success: true, user };
  } catch (error) {
    console.error('Update profile error:', error);
    throw new Error('Failed to update profile');
  }
}

// Change password Server Action
export async function changePassword(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  try {
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.password) {
      throw new Error('User not found or no password set');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    revalidatePath('/user/settings');
    
    return { success: true };
  } catch (error) {
    console.error('Change password error:', error);
    throw new Error('Failed to change password');
  }
}

// Register new user Server Action
export async function registerUser(formData: FormData) {
  try {
    const data = userRegistrationSchema.parse({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      phone: formData.get('phone'),
      dateOfBirth: formData.get('dateOfBirth'),
      address: formData.get('address'),
    });

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { phone: data.phone },
        ],
      },
    });

    if (existingUser) {
      throw new Error('User with this email or phone already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        address: data.address,
        role: 'USER',
        isActive: true,
      },
    });

    revalidatePath('/admin/users');
    
    return { success: true, user };
  } catch (error) {
    console.error('Register user error:', error);
    throw new Error('Failed to register user');
  }
}

// Deactivate user Server Action
export async function deactivateUser(userId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    revalidatePath('/admin/users');
    
    return { success: true };
  } catch (error) {
    console.error('Deactivate user error:', error);
    throw new Error('Failed to deactivate user');
  }
}

// Activate user Server Action
export async function activateUser(userId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    revalidatePath('/admin/users');
    
    return { success: true };
  } catch (error) {
    console.error('Activate user error:', error);
    throw new Error('Failed to activate user');
  }
} 

// Get available gurujis
export async function getAvailableGurujis() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const gurujis = await prisma.user.findMany({
      where: {
        role: 'GURUJI',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        preferences: true,
      },
    });

    // Transform the data to include specialization and availability
    const gurujisWithDetails = gurujis.map(guruji => {
      const preferences = guruji.preferences as Record<string, unknown> || {};
      return {
        id: guruji.id,
        name: guruji.name || 'Unknown Guruji',
        specialization: preferences.specialization || 'General Consultation',
        isAvailable: true, // You can add logic to check current appointments/availability
        email: guruji.email,
        phone: guruji.phone,
      };
    });

    return { success: true, gurujis: gurujisWithDetails };
  } catch (error) {
    console.error('Get available gurujis error:', error);
    return { success: false, error: 'Failed to fetch gurujis' };
  }
} 