'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import QRCode from 'qrcode';

interface LocationQRData {
  locationId: string;
  locationName: string;
  timestamp: number;
}

/**
 * Generate QR code data for a location
 * This creates the data that will be encoded in the QR code
 */
export async function generateLocationQRData(locationId: string, locationName: string): Promise<string> {
  const qrData: LocationQRData = {
    locationId,
    locationName,
    timestamp: Date.now()
  };
  
  return JSON.stringify(qrData);
}

/**
 * Generate QR code image for a location
 * This creates the actual QR code image that can be printed and stuck on the wall
 */
export async function generateLocationQRCode(locationId: string, locationName: string): Promise<string> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }

  const qrData = await generateLocationQRData(locationId, locationName);
  const qrCodeImage = await QRCode.toDataURL(qrData, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  return qrCodeImage;
}

/**
 * Get all available location QR codes for admin
 */
export async function getLocationQRCodes() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Admin access required' };
  }

  try {
    // Define your locations here
    const locations = [
      { id: 'GURUJI_LOC_001', name: 'Main Consultation Room' },
      { id: 'GURUJI_LOC_002', name: 'Waiting Area' },
      { id: 'GURUJI_LOC_003', name: 'Reception Desk' }
    ];

    const qrCodes = await Promise.all(
      locations.map(async (location) => ({
        locationId: location.id,
        locationName: location.name,
        qrCodeData: await generateLocationQRData(location.id, location.name)
      }))
    );

    return { success: true, qrCodes };
  } catch (error) {
    console.error('Get location QR codes error:', error);
    return { success: false, error: 'Failed to generate QR codes' };
  }
}

// Validation function moved to utils/qr-validation.ts
