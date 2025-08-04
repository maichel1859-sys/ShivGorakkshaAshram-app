import { NextApiRequest, NextApiResponse } from 'next';
import { sendSMS } from '@/lib/sms';
import { z } from 'zod';

const sendOTPSchema = z.object({
  phone: z.string().min(10).max(15),
});

// In production, use Redis or a proper cache
const otpStore = new Map<string, { otp: string; expiresAt: Date; attempts: number }>();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanPhone(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add country code if not present
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  } else if (cleaned.length === 13 && cleaned.startsWith('+91')) {
    return cleaned;
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
    const { phone } = sendOTPSchema.parse(req.body);
    const cleanedPhone = cleanPhone(phone);

    // Rate limiting: Check if OTP was sent recently
    const existing = otpStore.get(cleanedPhone);
    if (existing && existing.expiresAt > new Date()) {
      const timeRemaining = Math.ceil((existing.expiresAt.getTime() - Date.now()) / 1000);
      if (timeRemaining > 240) { // 4 minutes remaining
        return res.status(429).json({ 
          message: `Please wait ${Math.ceil(timeRemaining / 60)} more minutes before requesting a new OTP` 
        });
      }
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP (in production, use Redis with TTL)
    otpStore.set(cleanedPhone, { otp, expiresAt, attempts: 0 });

    // Send SMS
    try {
      await sendSMS({
        to: cleanedPhone,
        message: `Your Ashram Management System OTP is: ${otp}. Valid for 5 minutes. Do not share this code with anyone. Om Shanti 🙏`,
        from: process.env.TWILIO_PHONE_NUMBER!
      });

      // Log the OTP attempt
      console.log(`OTP sent to ${cleanedPhone}: ${otp} (expires at ${expiresAt})`);
      
      res.status(200).json({ 
        message: 'OTP sent successfully',
        phone: cleanedPhone,
        expiresIn: 300 // 5 minutes in seconds
      });
    } catch (smsError: unknown) {
      console.error('SMS sending failed:', smsError);
      
      // Clean up stored OTP if SMS failed
      otpStore.delete(cleanedPhone);
      
      res.status(500).json({ 
        message: 'Failed to send OTP. Please check your phone number and try again.' 
      });
    }
    
  } catch (error: unknown) {
    console.error('Send OTP error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid phone number format',
        errors: error.errors 
      });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
}