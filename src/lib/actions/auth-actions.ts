'use server';

import { revalidatePath } from 'next/cache';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { 
  phoneSchema,
  phoneLoginSchema,
  otpVerificationSchema,
  userRegistrationSchema,
  normalizePhoneNumber
} from '@/lib/validation/unified-schemas';
import crypto from 'crypto';
import {
  emitUserEvent,
  SocketEventTypes
} from '@/lib/socket/socket-emitter';

// Helper function to clean and validate phone number using unified schemas
function cleanAndValidatePhone(phone: string): { phone: string; isValid: boolean; error?: string } {
  try {
    // Validate using the unified phone schema
    const validatedPhone = phoneSchema.parse(phone);
    const normalizedPhone = normalizePhoneNumber(validatedPhone);
    
    return {
      phone: normalizedPhone,
      isValid: true
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        phone: '',
        isValid: false,
        error: error.errors[0]?.message || 'Invalid phone number'
      };
    }
    
    return {
      phone: '',
      isValid: false,
      error: 'Invalid phone number format'
    };
  }
}

// Send OTP to phone number
export async function sendPhoneOTP(formData: FormData) {
  try {
    const data = phoneLoginSchema.parse({
      phone: formData.get('phone'),
    });

    const phoneValidation = cleanAndValidatePhone(data.phone);
    if (!phoneValidation.isValid) {
      return { success: false, error: phoneValidation.error || 'Invalid phone number' };
    }
    const cleanPhoneNumber = phoneValidation.phone;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: cleanPhoneNumber },
          { phone: data.phone }
        ]
      }
    });

    if (!existingUser) {
      return { success: false, error: 'No account found with this phone number' };
    }

    // Note: OTP functionality is disabled as per requirements
    // The system now relies only on in-app notifications
    
    return { success: false, error: 'Phone OTP login is currently disabled. Please use email/password login.' };
  } catch (error) {
    console.error('Send OTP error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send OTP' };
  }
}

// Verify OTP and login
export async function verifyPhoneOTP(formData: FormData) {
  try {
    const data = otpVerificationSchema.parse({
      phone: formData.get('phone'),
      otp: formData.get('otp'),
    });

    const phoneValidation = cleanAndValidatePhone(data.phone);
    if (!phoneValidation.isValid) {
      return { success: false, error: phoneValidation.error || 'Invalid phone number' };
    }
    const cleanPhoneNumber = phoneValidation.phone;

    // Verify OTP from database
    // const otpRecord = await prisma.otpCode.findFirst({
    //   where: {
    //     phone: cleanPhoneNumber,
    //     code: otp,
    //     expiresAt: { gt: new Date() },
    //   },
    // });

    // if (!otpRecord) {
    //   return { success: false, error: 'Invalid or expired OTP' };
    // }

    // Mark OTP as used
    // await prisma.otpCode.update({
    //   where: { id: otpRecord.id },
    //   data: { used: true },
    // });

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: cleanPhoneNumber },
          { phone: data.phone }
        ]
      }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Create session (this would typically be handled by NextAuth)
    // For now, we'll return success and let the client handle the session
    return { 
      success: true, 
      message: 'OTP verified successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    };
  } catch (error) {
    console.error('Verify OTP error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to verify OTP' };
  }
}

// Register new user
export async function registerUser(formData: FormData) {
  try {
    const data = userRegistrationSchema.parse({
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      password: formData.get('password'),
      dateOfBirth: formData.get('dateOfBirth') || undefined,
      role: formData.get('role') || 'USER',
    });

    const phoneValidation = cleanAndValidatePhone(data.phone);
    if (!phoneValidation.isValid) {
      return { success: false, error: phoneValidation.error || 'Invalid phone number' };
    }
    const cleanPhoneNumber = phoneValidation.phone;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { phone: cleanPhoneNumber },
          { phone: data.phone }
        ]
      }
    });

    if (existingUser) {
      return { success: false, error: 'User with this email or phone already exists' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: cleanPhoneNumber,
        password: hashedPassword,
        role: data.role,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        dateOfBirth: true,
        createdAt: true,
      }
    });

    // Note: Email functionality is disabled as per requirements
    // The system now relies only on in-app notifications

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "USER_REGISTERED",
        resource: "USER",
        resourceId: user.id,
        newData: {
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });

    // Emit socket event for real-time updates with fallback mechanism
    try {
      await emitUserEvent(
        SocketEventTypes.USER_REGISTERED,
        {
          id: user.id,
          name: user.name || '',
          email: user.email || '',
          role: user.role,
          status: 'ACTIVE',
        }
      );
    } catch (socketError) {
      console.warn('🔌 Socket emission failed, using polling fallback:', socketError);
      // Socket failed - clients will use polling fallback automatically
      // No action needed here, React Query will handle stale data refresh
    }

    revalidatePath('/auth');
    return { success: true, user };
  } catch (error) {
    console.error('Register user error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to register user' };
  }
}

// Add family contact
export async function addFamilyContact(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // Extract form data
    const familyContactId = formData.get('familyContactId') as string;
    const relationship = formData.get('relationship') as string;
    const canBookAppointments = formData.get('canBookAppointments') === 'true';
    const canViewRemedies = formData.get('canViewRemedies') === 'true';
    const canReceiveUpdates = formData.get('canReceiveUpdates') === 'true';
    const notes = formData.get('notes') as string || undefined;
    
    if (!familyContactId || !relationship) {
      return { success: false, error: 'Family contact ID and relationship are required' };
    }

    // Find existing family contact
    const existingContact = await prisma.familyContact.findUnique({
      where: {
        elderlyUserId_familyContactId: {
          elderlyUserId: session.user.id,
          familyContactId: familyContactId,
        },
      },
    });

    if (existingContact) {
      return { success: false, error: 'Family contact already exists' };
    }

    // Create family contact
    const familyContact = await prisma.familyContact.create({
      data: {
        elderlyUserId: session.user.id,
        familyContactId: familyContactId,
        relationship: relationship,
        canBookAppointments: canBookAppointments,
        canViewRemedies: canViewRemedies,
        canReceiveUpdates: canReceiveUpdates,
        notes: notes,
      },
      include: {
        familyContact: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'FAMILY_CONTACT_ADDED',
        resource: 'FAMILY_CONTACT',
        resourceId: familyContact.id,
        newData: {
          name: familyContact.familyContact.name,
          phone: familyContact.familyContact.phone,
          relationship: familyContact.relationship,
        },
      },
    });

    revalidatePath('/user/settings');
    return { success: true, contact: familyContact };
  } catch (error) {
    console.error('Add family contact error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add family contact' };
  }
}

// Get family contacts
export async function getFamilyContacts() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const contacts = await prisma.familyContact.findMany({
      where: { elderlyUserId: session.user.id },
      include: {
        familyContact: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    return {
      success: true,
      contacts: contacts.map(contact => ({
        id: contact.id,
        name: contact.familyContact.name,
        phone: contact.familyContact.phone,
        relationship: contact.relationship,
        canBookAppointments: contact.canBookAppointments,
        canViewRemedies: contact.canViewRemedies,
        canReceiveUpdates: contact.canReceiveUpdates,
        notes: contact.notes,
      })),
    };
  } catch (error) {
    console.error('Get family contacts error:', error);
    return { success: false, error: 'Failed to fetch family contacts' };
  }
}

// Update family contact
export async function updateFamilyContact(contactId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // Extract form data directly (not using familyContactSchema as it's for different purpose)
    const relationship = formData.get('relationship') as string;
    const canBookAppointments = formData.get('canBookAppointments') === 'true';
    const canViewRemedies = formData.get('canViewRemedies') === 'true';
    const canReceiveUpdates = formData.get('canReceiveUpdates') === 'true';
    const notes = formData.get('notes') as string || undefined;
    
    if (!relationship) {
      return { success: false, error: 'Relationship is required' };
    }



    // Verify ownership
    const existingContact = await prisma.familyContact.findUnique({
      where: { id: contactId },
      include: {
        familyContact: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!existingContact) {
      return { success: false, error: 'Family contact not found' };
    }

    if (existingContact.elderlyUserId !== session.user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Update contact
    const updatedContact = await prisma.familyContact.update({
      where: { id: contactId },
      data: {
        relationship: relationship,
        canBookAppointments: canBookAppointments,
        canViewRemedies: canViewRemedies,
        canReceiveUpdates: canReceiveUpdates,
        notes: notes,
      },
      include: {
        familyContact: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "FAMILY_CONTACT_UPDATED",
        resource: "FAMILY_CONTACT",
        resourceId: contactId,
        oldData: existingContact,
        newData: updatedContact,
      },
    });

    revalidatePath('/user/settings');
    return { success: true, contact: updatedContact };
  } catch (error) {
    console.error('Update family contact error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update family contact' };
  }
}

// Delete family contact
export async function deleteFamilyContact(contactId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // Verify ownership
    const existingContact = await prisma.familyContact.findFirst({
      where: {
        id: contactId,
        elderlyUserId: session.user.id,
      }
    });

    if (!existingContact) {
      return { success: false, error: 'Contact not found' };
    }

    // Delete contact
    await prisma.familyContact.delete({
      where: { id: contactId }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "FAMILY_CONTACT_DELETED",
        resource: "FAMILY_CONTACT",
        resourceId: contactId,
        oldData: existingContact,
      },
    });

    revalidatePath('/user/settings');
    return { success: true, message: 'Contact deleted successfully' };
  } catch (error) {
    console.error('Delete family contact error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete family contact' };
  }
}

// Change password
export async function changePassword(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { success: false, error: 'All password fields are required' };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: 'New passwords do not match' };
    }

    if (newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters' };
    }

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password || '');
    if (!isCurrentPasswordValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedNewPassword }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "PASSWORD_CHANGED",
        resource: "USER",
        resourceId: session.user.id,
      },
    });

    revalidatePath('/user/settings');
    return { success: true, message: 'Password changed successfully' };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to change password' };
  }
} 

// Register as family contact for elderly user
export async function registerFamilyContact(formData: FormData) {
  try {
    const data = {
      elderlyPhone: formData.get('elderlyPhone') as string,
      elderlyName: formData.get('elderlyName') as string,
      familyContactPhone: formData.get('familyContactPhone') as string,
      familyContactName: formData.get('familyContactName') as string,
      familyContactEmail: formData.get('familyContactEmail') as string,
      relationship: formData.get('relationship') as string,
      requestType: formData.get('requestType') as string,
      message: formData.get('message') as string,
    };

    // Validate required fields
    if (!data.elderlyPhone || !data.elderlyName || !data.familyContactPhone || !data.familyContactName || !data.relationship) {
      return { success: false, error: 'All required fields must be provided' };
    }

    // Clean and validate phone numbers
    const elderlyPhoneValidation = cleanAndValidatePhone(data.elderlyPhone);
    if (!elderlyPhoneValidation.isValid) {
      return { success: false, error: `Elderly person phone: ${elderlyPhoneValidation.error}` };
    }
    const cleanElderlyPhone = elderlyPhoneValidation.phone;
    const familyPhoneValidation = cleanAndValidatePhone(data.familyContactPhone);
    if (!familyPhoneValidation.isValid) {
      return { success: false, error: `Family contact phone: ${familyPhoneValidation.error}` };
    }
    const cleanFamilyContactPhone = familyPhoneValidation.phone;

    // Check if elderly user exists, if not create a placeholder
    let elderlyUser = await prisma.user.findUnique({
      where: { phone: cleanElderlyPhone }
    });

    if (!elderlyUser) {
      // Create a placeholder user for the elderly person
      elderlyUser = await prisma.user.create({
        data: {
          name: data.elderlyName,
          phone: cleanElderlyPhone,
          role: 'USER',
          isActive: true,
          // Generate a temporary password
          password: await bcrypt.hash(Math.random().toString(36).substring(2, 15), 12),
        }
      });
    }

    // Check if family contact user exists, if not create
    let familyContactUser = await prisma.user.findUnique({
      where: { phone: cleanFamilyContactPhone }
    });

    if (!familyContactUser) {
      // Create family contact user
      familyContactUser = await prisma.user.create({
        data: {
          name: data.familyContactName,
          phone: cleanFamilyContactPhone,
          email: data.familyContactEmail || null,
          role: 'USER',
          isActive: true,
          // Generate a temporary password
          password: await bcrypt.hash(Math.random().toString(36).substring(2, 15), 12),
        }
      });
    }

    // Create family contact relationship
    const familyContact = await prisma.familyContact.create({
      data: {
        elderlyUserId: elderlyUser.id,
        familyContactId: familyContactUser.id,
        relationship: data.relationship,
        isActive: true,
      },
      include: {
        elderlyUser: {
          select: {
            id: true,
            name: true,
            phone: true,
          }
        },
        familyContact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: familyContactUser.id,
        action: "FAMILY_CONTACT_REGISTERED",
        resource: "FAMILY_CONTACT",
        resourceId: familyContact.id,
      },
    });

    // Send notifications (placeholder for SMS/email)
    // TODO: Implement actual SMS/email notifications
    console.log('Family contact registration:', {
      elderlyUser: elderlyUser.name,
      familyContact: familyContactUser.name,
      relationship: data.relationship,
    });

    return { 
      success: true, 
      message: 'Family contact registration successful',
      familyContact 
    };
  } catch (error) {
    console.error('Register family contact error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to register family contact' 
    };
  }
}

// Generate a secure reset token
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Hash the reset token for storage
async function hashResetToken(token: string): Promise<string> {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Request password reset
export async function requestPasswordReset(formData: FormData) {
  try {
    const email = formData.get('email') as string;
    
    if (!email) {
      return { success: false, error: 'Email is required' };
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email },
      select: { id: true, name: true, email: true, isActive: true }
    });

    if (!user || !user.isActive) {
      // Don't reveal if user exists or not for security
      return { 
        success: true, 
        message: 'If an account with that email exists, we have sent a password reset link.' 
      };
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const hashedToken = await hashResetToken(resetToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now

    // Store reset token in database
    await prisma.verificationToken.create({
      data: {
        identifier: user.email || '',
        token: hashedToken,
        expires: expiresAt,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resource: 'USER',
        resourceId: user.id,
        newData: {
          email: user.email,
          requestedAt: new Date().toISOString(),
        },
      },
    });

    // Create notification in the system (since email is disabled)
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Password Reset Requested',
        message: `A password reset was requested for your account. If you didn't request this, please ignore this notification.`,
        type: 'security',
        data: {
          resetToken: resetToken, // For development/testing
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    revalidatePath('/auth');
    return { 
      success: true, 
      message: 'Password reset link has been sent to your email.',
      // For development/testing - remove in production
      resetToken: resetToken,
      resetUrl: `/auth/reset-password?token=${resetToken}`
    };
  } catch (error) {
    console.error('Request password reset error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to request password reset' 
    };
  }
}

// Reset password with token
export async function resetPassword(formData: FormData) {
  try {
    const token = formData.get('token') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!token || !password || !confirmPassword) {
      return { success: false, error: 'All fields are required' };
    }

    if (password !== confirmPassword) {
      return { success: false, error: 'Passwords do not match' };
    }

    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }

    // Hash the provided token to compare with stored token
    const hashedToken = await hashResetToken(token);

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token: hashedToken,
        expires: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    if (!verificationToken) {
      return { 
        success: false, 
        error: 'Invalid or expired reset token. Please request a new password reset.' 
      };
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return { 
        success: false, 
        error: 'User not found. Please request a new password reset.' 
      };
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete the used verification token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: hashedToken,
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_COMPLETED',
        resource: 'USER',
        resourceId: user.id,
        newData: {
          email: user.email,
          resetAt: new Date().toISOString(),
        },
      },
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Password Reset Successful',
        message: 'Your password has been successfully reset. If you did not make this change, please contact support immediately.',
        type: 'security',
        data: {
          resetAt: new Date().toISOString(),
        },
      },
    });

    revalidatePath('/auth');
    return { 
      success: true, 
      message: 'Password has been reset successfully. You can now sign in with your new password.' 
    };
  } catch (error) {
    console.error('Reset password error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to reset password' 
    };
  }
}

// Verify reset token (for the reset password page)
export async function verifyResetToken(token: string) {
  try {
    if (!token) {
      return { success: false, error: 'Reset token is required' };
    }

    const hashedToken = await hashResetToken(token);

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token: hashedToken,
        expires: {
          gt: new Date(),
        },
      },
    });

    if (!verificationToken) {
      return { 
        success: false, 
        error: 'Invalid or expired reset token' 
      };
    }

    return { 
      success: true, 
      message: 'Reset token is valid',
      email: verificationToken.identifier 
    };
  } catch (error) {
    console.error('Verify reset token error:', error);
    return { 
      success: false, 
      error: 'Failed to verify reset token' 
    };
  }
} 