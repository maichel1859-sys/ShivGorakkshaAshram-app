'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/database/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import {
  emitUserEvent,
  SocketEventTypes
} from '@/lib/socket/socket-emitter';

// Get all users (admin only)
export async function getUsers(options?: {
  search?: string;
  role?: string;
  active?: boolean;
  limit?: number;
  offset?: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    const where: Record<string, unknown> = {};
    
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
        { phone: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    
    if (options?.role && options.role !== 'all') {
      where.role = options.role;
    }
    
    if (options?.active !== undefined) {
      where.isActive = options.active;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      prisma.user.count({ where }),
    ]);

    return { success: true, users, total };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, error: 'Failed to fetch users' };
  }
}

// Create new user
export async function createUser(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const role = formData.get('role') as string;
    const password = formData.get('password') as string;

    if (!name || !email || !phone || !role || !password) {
      return { success: false, error: 'Missing required fields' };
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role: role as 'USER' | 'GURUJI' | 'COORDINATOR' | 'ADMIN',
        password, // Note: In production, hash this password
      },
    });

    // Emit user registered event
    try {
      await emitUserEvent(
        SocketEventTypes.USER_REGISTERED,
        {
          id: user.id,
          name: user.name || '',
          email: user.email || '',
          role: user.role,
          status: user.isActive ? 'active' : 'inactive'
        }
      );
      console.log(`🔌 Emitted user registered event`);
    } catch (socketError) {
      console.error('🔌 Socket emit error:', socketError);
      // Continue even if socket fails
    }

    revalidatePath('/admin/users');
    return { success: true, user };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: 'Failed to create user' };
  }
}

// Update user
export async function updateUser(userId: string, formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const role = formData.get('role') as string;
    const isActive = formData.get('isActive') === 'true';

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (role) updateData.role = role as 'USER' | 'GURUJI' | 'COORDINATOR' | 'ADMIN';
    updateData.isActive = isActive;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${userId}`);
    return { success: true, user };
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, error: 'Failed to update user' };
  }
}

// Delete user
export async function deleteUser(userId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: 'Failed to delete user' };
  }
}

// Toggle user status
export async function toggleUserStatus(userId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });

    revalidatePath('/admin/users');
    return { success: true, user: updatedUser };
  } catch (error) {
    console.error('Error toggling user status:', error);
    return { success: false, error: 'Failed to toggle user status' };
  }
}

// Update user profile (for the logged-in user)
export async function updateUserProfile(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    // Handle password change if provided
    if (currentPassword && newPassword) {
      // In production, verify current password and hash new password
      updateData.password = newPassword;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    revalidatePath('/profile');
    return { success: true, user };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: 'Failed to update profile' };
  }
}

// Get user by ID
export async function getUserById(userId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only admins can view other users, or users can view their own profile
    if (session.user.role !== 'ADMIN' && session.user.id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { success: false, error: 'Failed to fetch user' };
  }
}

// Get available gurujis for appointment booking
export async function getAvailableGurujis() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

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
      orderBy: { createdAt: 'asc' },
    });

    // Add availability and specialization info
    const availableGurujis = gurujis.map(guruji => ({
      id: guruji.id,
      name: guruji.name,
      email: guruji.email,
      phone: guruji.phone,
      isAvailable: true, // For now, all active gurujis are available
      specialization: guruji.preferences && typeof guruji.preferences === 'object' 
        ? (guruji.preferences as Record<string, unknown>).specialization as string || 'General Consultation'
        : 'General Consultation',
    }));

    return { success: true, gurujis: availableGurujis };
  } catch (error) {
    console.error('Error fetching available gurujis:', error);
    return { success: false, error: 'Failed to fetch available gurujis' };
  }
}

// Enhanced user dashboard endpoint for queries/hooks
export async function getUserDashboard() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get appointment count, recent appointments, remedy counts, and consultation stats
    const [
      appointmentCount,
      recentAppointments,
      unreadNotifications,
      pendingRemedies,
      totalRemedies,
      completedConsultations
    ] = await Promise.all([
      // Total appointments
      prisma.appointment.count({
        where: { userId: session.user.id },
      }),
      // Recent appointments with consultation status
      prisma.appointment.findMany({
        where: { userId: session.user.id },
        include: {
          guruji: {
            select: {
              id: true,
              name: true,
            },
          },
          queueEntry: {
            select: {
              id: true,
              position: true,
              status: true,
            },
          },
          consultationSession: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              remedies: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
        orderBy: { date: 'desc' },
        take: 5,
      }),
      // Unread notifications
      prisma.notification.count({
        where: { userId: session.user.id, read: false },
      }),
      // Pending remedies (all remedies for now, since status field may not exist)
      prisma.remedyDocument.count({
        where: {
          userId: session.user.id,
        },
      }),
      // Total remedies
      prisma.remedyDocument.count({
        where: { userId: session.user.id },
      }),
      // Completed consultations
      prisma.consultationSession.count({
        where: {
          devoteeId: session.user.id,
          endTime: { not: null },
        },
      }),
    ]);

    // Get current queue position
    const currentQueueEntry = await prisma.queueEntry.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['WAITING', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        position: true,
        status: true,
        estimatedWait: true,
      },
    });

    return {
      success: true,
      data: {
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        },
        stats: {
          appointmentCount,
          unreadNotifications,
          currentQueuePosition: currentQueueEntry?.position || null,
          currentQueueStatus: currentQueueEntry?.status || null,
          estimatedWait: currentQueueEntry?.estimatedWait || null,
          pendingRemedies,
          totalRemedies,
          completedConsultations,
        },
        recentAppointments,
        currentQueueEntry,
      },
    };
  } catch (error) {
    console.error('Error fetching user dashboard:', error);
    return { success: false, error: 'Failed to fetch user dashboard' };
  }
}
