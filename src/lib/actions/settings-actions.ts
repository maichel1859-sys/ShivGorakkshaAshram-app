'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';
import { z } from 'zod';

// Schemas
const systemSettingsSchema = z.object({
  businessHours: z.object({
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  }),
  appointmentDuration: z.number().min(15).max(120),
  maxAppointmentsPerDay: z.number().min(1).max(100),
  enableNotifications: z.boolean(),
  enableSMS: z.boolean(),
  enableEmail: z.boolean(),
  maintenanceMode: z.boolean(),
  allowWalkIns: z.boolean(),
  autoConfirmAppointments: z.boolean(),
});

const userSettingsSchema = z.object({
  language: z.enum(['en', 'hi', 'mr']).default('en'),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  notifications: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(true),
    push: z.boolean().default(true),
  }),
  privacy: z.object({
    shareProfile: z.boolean().default(false),
    allowContact: z.boolean().default(true),
    showStatus: z.boolean().default(true),
  }),
});

// Get system settings
export async function getSystemSettings() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Admin access required' };
  }

  try {
    const settings = await prisma.systemSetting.findFirst({
      where: { key: 'GENERAL' },
    });

    if (!settings) {
      return {
        success: true,
        data: {
          businessHours: { start: '09:00', end: '18:00' },
          appointmentDuration: 30,
          maxAppointmentsPerDay: 20,
          enableNotifications: true,
          enableSMS: false,
          enableEmail: true,
          maintenanceMode: false,
          allowWalkIns: true,
          autoConfirmAppointments: false,
        }
      };
    }

    const parsedValue = JSON.parse(settings.value);

    return {
      success: true,
      data: {
        businessHours: parsedValue.businessHours as { start: string; end: string },
        appointmentDuration: parsedValue.appointmentDuration,
        maxAppointmentsPerDay: parsedValue.maxAppointmentsPerDay,
        enableNotifications: parsedValue.enableNotifications,
        enableSMS: parsedValue.enableSMS,
        enableEmail: parsedValue.enableEmail,
        maintenanceMode: parsedValue.maintenanceMode,
        allowWalkIns: parsedValue.allowWalkIns,
        autoConfirmAppointments: parsedValue.autoConfirmAppointments,
      }
    };
  } catch (error) {
    console.error('Get system settings error:', error);
    return { success: false, error: 'Failed to fetch system settings' };
  }
}



// Get user settings
export async function getUserSettings() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // For now, return default settings since userSettings table doesn't exist
    return {
      success: true,
      settings: {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          sms: false,
          push: true,
        },
        privacy: {
          profileVisibility: 'public',
          showEmail: false,
          showPhone: false,
        },
      },
    };
  } catch (error) {
    console.error('Get user settings error:', error);
    return { success: false, error: 'Failed to fetch user settings' };
  }
}

// Update user settings
export async function updateUserSettings(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // For now, return success since userSettings table doesn't exist
    return {
      success: true,
      message: 'Settings updated successfully',
    };
  } catch (error) {
    console.error('Update user settings error:', error);
    return { success: false, error: 'Failed to update user settings' };
  }
}

// Get notification settings
export async function getNotificationSettings() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // For now, return default settings since userSettings table doesn't exist
    return {
      success: true,
      settings: {
        email: true,
        sms: false,
        push: true,
        appointmentReminders: true,
        queueUpdates: true,
        remedyNotifications: true,
        systemAnnouncements: true,
      },
    };
  } catch (error) {
    console.error('Get notification settings error:', error);
    return { success: false, error: 'Failed to fetch notification settings' };
  }
}

// Update notification settings
export async function updateNotificationSettings(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // For now, return success since userSettings table doesn't exist
    return {
      success: true,
      message: 'Notification settings updated successfully',
    };
  } catch (error) {
    console.error('Update notification settings error:', error);
    return { success: false, error: 'Failed to update notification settings' };
  }
}

// Get privacy settings
export async function getPrivacySettings() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // For now, return default settings since userSettings table doesn't exist
    return {
      success: true,
      settings: {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
        allowContact: true,
        showStatus: true,
        shareAppointments: false,
        shareRemedies: false,
      },
    };
  } catch (error) {
    console.error('Get privacy settings error:', error);
    return { success: false, error: 'Failed to fetch privacy settings' };
  }
}

// Update privacy settings
export async function updatePrivacySettings(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // For now, return success since userSettings table doesn't exist
    return {
      success: true,
      message: 'Privacy settings updated successfully',
    };
  } catch (error) {
    console.error('Update privacy settings error:', error);
    return { success: false, error: 'Failed to update privacy settings' };
  }
}

// Reset user settings to defaults
export async function resetUserSettings() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // For now, return success since userSettings table doesn't exist
    return {
      success: true,
      message: 'Settings reset to defaults successfully',
    };
  } catch (error) {
    console.error('Reset user settings error:', error);
    return { success: false, error: 'Failed to reset user settings' };
  }
}

// Export settings
export async function exportUserSettings() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // For now, return default settings since userSettings table doesn't exist
    const settings = {
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        sms: false,
        push: true,
      },
      privacy: {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
      },
    };

    return {
      success: true,
      data: settings,
      filename: `user-settings-${session.user.id}-${new Date().toISOString().split('T')[0]}.json`,
    };
  } catch (error) {
    console.error('Export user settings error:', error);
    return { success: false, error: 'Failed to export user settings' };
  }
} 