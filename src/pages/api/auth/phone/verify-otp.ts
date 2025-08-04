import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { sign } from 'jsonwebtoken';
import { z } from 'zod';

const verifyOTPSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(6),
});

// This should match the otpStore from send-otp.ts
// In production, use Redis or a proper shared cache
declare global {
  var otpStore: Map<string, { otp: string; expiresAt: Date; attempts: number }> | undefined;
}

if (!global.otpStore) {
  global.otpStore = new Map();
}

const otpStore = global.otpStore;

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
    const { phone, otp } = verifyOTPSchema.parse(req.body);
    const cleanedPhone = cleanPhone(phone);

    // Get stored OTP
    const storedOTP = otpStore.get(cleanedPhone);
    
    if (!storedOTP) {
      return res.status(400).json({ message: 'OTP not found or expired. Please request a new OTP.' });
    }

    // Check if OTP is expired
    if (storedOTP.expiresAt < new Date()) {
      otpStore.delete(cleanedPhone);
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
    }

    // Check attempt limit
    if (storedOTP.attempts >= 3) {
      otpStore.delete(cleanedPhone);
      return res.status(429).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (storedOTP.otp !== otp) {
      // Increment attempts
      storedOTP.attempts += 1;
      otpStore.set(cleanedPhone, storedOTP);
      
      const remainingAttempts = 3 - storedOTP.attempts;
      return res.status(400).json({ 
        message: `Invalid OTP. ${remainingAttempts} attempts remaining.` 
      });
    }

    // OTP is valid, clean up
    otpStore.delete(cleanedPhone);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { phone: cleanedPhone }
    });

    if (!user) {
      // Create new user with phone number
      user = await prisma.user.create({
        data: {
          phone: cleanedPhone,
          role: 'USER',
          name: `User ${cleanedPhone.slice(-4)}`, // Temporary name
          email: null, // Phone-only user
        }
      });
    }

    // Generate JWT token
    const token = sign(
      { 
        userId: user.id, 
        phone: user.phone, 
        role: user.role 
      },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie
    res.setHeader('Set-Cookie', [
      `auth-token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${
        process.env.NODE_ENV === 'production' ? '; Secure' : ''
      }`
    ]);

    // Log successful authentication
    console.log(`User authenticated via phone: ${user.id} (${cleanedPhone})`);

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        email: user.email,
      },
      token // Also return token for client-side storage if needed
    });

  } catch (error: unknown) {
    console.error('Verify OTP error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid request data',
        errors: error.errors 
      });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
}