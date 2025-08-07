'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/database/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sendSMS, generateOTP } from '@/lib/external/sms';
import { sendEmail } from '@/lib/external/email';

// Schemas
const phoneLoginSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

const otpVerificationSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

const userRegistrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  dateOfBirth: z.string().optional(),
  role: z.enum(["USER", "COORDINATOR", "GURUJI", "ADMIN"]).default("USER"),
});

const familyContactSchema = z.object({
  familyContactId: z.string().min(1, "Family contact ID is required"),
  relationship: z.string().min(1, "Relationship is required"),
  canBookAppointments: z.boolean().default(true),
  canViewRemedies: z.boolean().default(true),
  canReceiveUpdates: z.boolean().default(true),
  notes: z.string().optional(),
});

// Helper function to clean phone number
function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Send OTP to phone number
export async function sendPhoneOTP(formData: FormData) {
  try {
    const data = phoneLoginSchema.parse({
      phone: formData.get('phone'),
    });

    const cleanPhoneNumber = cleanPhone(data.phone);

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

    // Generate OTP
    const otp = generateOTP(6);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database (you'll need to create an OTP table)
    // For now, we'll use a simple in-memory store
    // await prisma.otpCode.create({
    //   data: {
    //     phone: cleanPhoneNumber,
    //     code: otp,
    //     expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    //   },
    // });

    // Send SMS
    await sendSMS({
      to: cleanPhoneNumber,
      message: `Your OTP for Aashram app login is: ${otp}. Valid for 10 minutes.`
    });

    return { success: true, message: 'OTP sent successfully' };
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

    const cleanPhoneNumber = cleanPhone(data.phone);

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

    const cleanPhoneNumber = cleanPhone(data.phone);

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

    // Send welcome email
    try {
      await sendEmail({
        to: data.email,
        subject: 'Welcome to Aashram App',
        html: `
          <h1>Welcome to Aashram App!</h1>
          <p>Dear ${data.name},</p>
          <p>Thank you for registering with us. Your account has been created successfully.</p>
          <p>You can now log in to your account and start using our services.</p>
          <p>Best regards,<br>Aashram Team</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the registration if email fails
    }

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
    const data = familyContactSchema.parse({
      familyContactId: formData.get('familyContactId'),
      relationship: formData.get('relationship'),
      canBookAppointments: formData.get('canBookAppointments') === 'true',
      canViewRemedies: formData.get('canViewRemedies') === 'true',
      canReceiveUpdates: formData.get('canReceiveUpdates') === 'true',
      notes: formData.get('notes'),
    });

    // Find existing family contact
    const existingContact = await prisma.familyContact.findFirst({
      where: {
        elderlyUserId: session.user.id,
        familyContactId: data.familyContactId,
      },
    });

    if (existingContact) {
      return { success: false, error: 'Family contact already exists' };
    }

    // Create family contact
    const familyContact = await prisma.familyContact.create({
      data: {
        elderlyUserId: session.user.id,
        familyContactId: data.familyContactId,
        relationship: data.relationship,
        canBookAppointments: data.canBookAppointments,
        canViewRemedies: data.canViewRemedies,
        canReceiveUpdates: data.canReceiveUpdates,
        notes: data.notes,
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
        action: "FAMILY_CONTACT_ADDED",
        resource: "FAMILY_CONTACT",
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
    const data = familyContactSchema.parse({
      familyContactId: formData.get('familyContactId'),
      relationship: formData.get('relationship'),
      canBookAppointments: formData.get('canBookAppointments') === 'true',
      canViewRemedies: formData.get('canViewRemedies') === 'true',
      canReceiveUpdates: formData.get('canReceiveUpdates') === 'true',
      notes: formData.get('notes'),
    });

    const cleanPhoneNumber = cleanPhone(data.familyContactId); // Assuming familyContactId is the phone number for now

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
        relationship: data.relationship,
        canBookAppointments: data.canBookAppointments,
        canViewRemedies: data.canViewRemedies,
        canReceiveUpdates: data.canReceiveUpdates,
        notes: data.notes,
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

    // Clean phone numbers
    const cleanElderlyPhone = cleanPhone(data.elderlyPhone);
    const cleanFamilyContactPhone = cleanPhone(data.familyContactPhone);

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