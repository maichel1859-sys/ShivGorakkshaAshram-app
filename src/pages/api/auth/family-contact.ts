import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { sendSMS } from '@/lib/sms';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

const familyContactSchema = z.object({
  elderlyPhone: z.string().min(10).max(15),
  elderlyName: z.string().min(1).max(100),
  familyContactPhone: z.string().min(10).max(15),
  familyContactName: z.string().min(1).max(100),
  familyContactEmail: z.string().email().optional(),
  relationship: z.string().min(1).max(50),
  requestType: z.enum(['register', 'book_appointment', 'check_status', 'get_remedy']),
  message: z.string().max(500).optional(),
});

function cleanPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }
  return phone;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const data = familyContactSchema.parse(req.body);
    const elderlyPhone = cleanPhone(data.elderlyPhone);
    const familyPhone = cleanPhone(data.familyContactPhone);

    // Check if elderly user exists
    let elderlyUser = await prisma.user.findUnique({
      where: { phone: elderlyPhone }
    });

    // Create elderly user if doesn't exist
    if (!elderlyUser) {
      elderlyUser = await prisma.user.create({
        data: {
          phone: elderlyPhone,
          name: data.elderlyName,
          role: 'USER',
          email: null,
        }
      });
    }

    // Find or create family contact
    let familyContact = await prisma.user.findUnique({
      where: { phone: familyPhone }
    });

    if (!familyContact) {
      familyContact = await prisma.user.create({
        data: {
          phone: familyPhone,
          name: data.familyContactName,
          email: data.familyContactEmail || null,
          role: 'USER',
        }
      });
    }

    // Create family relationship record
    const familyRelation = await prisma.familyContact.create({
      data: {
        elderlyUserId: elderlyUser.id,
        familyContactId: familyContact.id,
        relationship: data.relationship,
        canBookAppointments: true,
        canViewRemedies: true,
        canReceiveUpdates: true,
        isActive: true,
      }
    });

    // Send confirmation SMS to family contact
    const smsMessage = `Hello ${data.familyContactName}, you have been registered as a family contact for ${data.elderlyName} in the Ashram Management System. You can now help with appointments and receive updates. Om Shanti 🙏`;
    
    try {
      await sendSMS({
        to: familyPhone,
        message: smsMessage,
        from: process.env.TWILIO_PHONE_NUMBER!
      });
    } catch (smsError) {
      console.error('Failed to send SMS to family contact:', smsError);
    }

    // Send confirmation email if provided
    if (data.familyContactEmail) {
      try {
        await sendEmail({
          to: data.familyContactEmail,
          subject: 'Family Contact Registration - Ashram Management System',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Family Contact Registration Successful</h2>
              <p>Dear ${data.familyContactName},</p>
              <p>You have been successfully registered as a family contact for <strong>${data.elderlyName}</strong> in our Ashram Management System.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #374151; margin-top: 0;">What you can do:</h3>
                <ul style="color: #6b7280;">
                  <li>Book appointments on behalf of ${data.elderlyName}</li>
                  <li>Check appointment status and queue position</li>
                  <li>Receive important updates and notifications</li>
                  <li>Help with QR code check-ins during visits</li>
                  <li>Access prescribed remedies and spiritual guidance</li>
                </ul>
              </div>

              <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af;">
                  <strong>Next Steps:</strong> Contact our coordinators at the ashram for assistance with your first appointment booking.
                </p>
              </div>

              <p style="color: #6b7280; font-size: 14px;">
                This system helps elderly devotees and their families stay connected with spiritual guidance and ashram services.
              </p>
              
              <p style="color: #374151;">Om Shanti 🙏</p>
              <p style="color: #9ca3af; font-size: 12px;">
                Ashram Management System<br>
                This email was sent automatically. Please do not reply.
              </p>
            </div>
          `,
          from: process.env.RESEND_FROM_EMAIL!
        });
      } catch (emailError) {
        console.error('Failed to send email to family contact:', emailError);
      }
    }

    // Handle specific request types
    let responseMessage = 'Family contact registered successfully.';
    
    switch (data.requestType) {
      case 'register':
        responseMessage = `${data.familyContactName} has been registered as a family contact for ${data.elderlyName}. You can now help with appointments and receive updates.`;
        break;
      case 'book_appointment':
        responseMessage = `Family contact registered. Please contact our coordinators to book an appointment for ${data.elderlyName}.`;
        break;
      case 'check_status':
        responseMessage = `Family contact registered. You can now check appointment status and receive updates for ${data.elderlyName}.`;
        break;
      case 'get_remedy':
        responseMessage = `Family contact registered. You can now access remedies and spiritual guidance for ${data.elderlyName}.`;
        break;
    }

    // Log the family contact creation
    console.log(`Family contact created: ${familyContact.id} for elderly user: ${elderlyUser.id}`);

    res.status(200).json({
      message: responseMessage,
      familyRelationId: familyRelation.id,
      elderlyUser: {
        id: elderlyUser.id,
        name: elderlyUser.name,
        phone: elderlyUser.phone
      },
      familyContact: {
        id: familyContact.id,
        name: familyContact.name,
        phone: familyContact.phone,
        email: familyContact.email
      }
    });

  } catch (error: unknown) {
    console.error('Family contact error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid request data',
        errors: error.errors 
      });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
}