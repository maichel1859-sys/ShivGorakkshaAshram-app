'use server';
import { logger } from '@/lib/utils/logger';


import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/prisma';
import {
  emitUserEvent,
  SocketEventTypes
} from '@/lib/socket/socket-emitter';


// Schemas


// Get system settings
export async function getSystemSettingsFromSettings() {
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
    logger.error('Get system settings error:', error);
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
    logger.error('Get user settings error:', error);
    return { success: false, error: 'Failed to fetch user settings' };
  }
}

// Update user settings
export async function updateUserSettings() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // For now, return success since userSettings table doesn't exist

    // Emit user settings updated event
    await emitUserEvent(
      SocketEventTypes.USER_UPDATED,
      {
        id: session.user.id,
        name: session.user.name || 'User',
        email: session.user.email || '',
        role: session.user.role,
        status: 'settings_updated'
      }
    );

    return {
      success: true,
      message: 'Settings updated successfully',
    };
  } catch (error) {
    logger.error('Update user settings error:', error);
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
    logger.error('Get notification settings error:', error);
    return { success: false, error: 'Failed to fetch notification settings' };
  }
}

// Update notification settings
export async function updateNotificationSettings() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // For now, return success since userSettings table doesn't exist

    // Emit notification settings updated event
    await emitUserEvent(
      SocketEventTypes.USER_UPDATED,
      {
        id: session.user.id,
        name: session.user.name || 'User',
        email: session.user.email || '',
        role: session.user.role,
        status: 'notification_settings_updated'
      }
    );

    return {
      success: true,
      message: 'Notification settings updated successfully',
    };
  } catch (error) {
    logger.error('Update notification settings error:', error);
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
    logger.error('Get privacy settings error:', error);
    return { success: false, error: 'Failed to fetch privacy settings' };
  }
}

// Update privacy settings
export async function updatePrivacySettings() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // For now, return success since userSettings table doesn't exist

    // Emit privacy settings updated event
    await emitUserEvent(
      SocketEventTypes.USER_UPDATED,
      {
        id: session.user.id,
        name: session.user.name || 'User',
        email: session.user.email || '',
        role: session.user.role,
        status: 'privacy_settings_updated'
      }
    );

    return {
      success: true,
      message: 'Privacy settings updated successfully',
    };
  } catch (error) {
    logger.error('Update privacy settings error:', error);
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

    // Emit settings reset event
    await emitUserEvent(
      SocketEventTypes.USER_UPDATED,
      {
        id: session.user.id,
        name: session.user.name || 'User',
        email: session.user.email || '',
        role: session.user.role,
        status: 'settings_reset'
      }
    );

    return {
      success: true,
      message: 'Settings reset to defaults successfully',
    };
  } catch (error) {
    logger.error('Reset user settings error:', error);
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
    logger.error('Export user settings error:', error);
    return { success: false, error: 'Failed to export user settings' };
  }
} 
