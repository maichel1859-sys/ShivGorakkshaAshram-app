'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import QRCode from 'qrcode';

interface LocationQRData {
  locationId: string;
  locationName: string;
  timestamp: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

// Predefined location coordinates (replace with actual ashram coordinates)
const LOCATION_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  'GURUJI_LOC_001': { latitude: 19.0760, longitude: 72.8777 }, // Mumbai example
  'RECEPTION_001': { latitude: 19.0760, longitude: 72.8777 },
  'CONSULTATION_001': { latitude: 19.0760, longitude: 72.8777 },
  'MAIN_HALL_001': { latitude: 19.0760, longitude: 72.8777 },
};

/**
 * Generate QR code data for a location
 * This creates the data that will be encoded in the QR code
 */
export async function generateLocationQRData(locationId: string, locationName: string, customCoordinates?: { latitude: number; longitude: number }): Promise<string> {
  const coordinates = customCoordinates || LOCATION_COORDINATES[locationId] || { latitude: 19.0760, longitude: 72.8777 };
  
  const qrData: LocationQRData = {
    locationId,
    locationName,
    timestamp: Date.now(),
    coordinates
  };
  
  return JSON.stringify(qrData);
}

/**
 * Generate QR code image for a location with custom coordinates
 * This creates the actual QR code image that can be printed and stuck on the wall
 */
export async function generateLocationQRCode(locationId: string, locationName: string, coordinates?: { latitude: number; longitude: number }): Promise<string> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }

  const qrData = await generateLocationQRData(locationId, locationName, coordinates);
  const qrCodeImage = await QRCode.toDataURL(qrData, {
    width: 300,
    margin: 2,
    color: {
      dark: 'hsl(var(--foreground))',
      light: 'hsl(var(--background))'
    }
  });

  return qrCodeImage;
}

/**
 * Create QR code with custom coordinates
 */
export async function createQRCodeWithCoordinates(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Admin access required' };
  }

  try {
    const locationId = formData.get('locationId') as string;
    const locationName = formData.get('locationName') as string;
    const latitude = parseFloat(formData.get('latitude') as string);
    const longitude = parseFloat(formData.get('longitude') as string);

    if (!locationId || !locationName || isNaN(latitude) || isNaN(longitude)) {
      return { success: false, error: 'Invalid input data' };
    }

    const coordinates = { latitude, longitude };
    const qrCodeImage = await generateLocationQRCode(locationId, locationName, coordinates);
    const qrData = await generateLocationQRData(locationId, locationName, coordinates);

    return { 
      success: true, 
      data: {
        qrCodeImage,
        qrData,
        locationId,
        locationName,
        coordinates
      }
    };
  } catch (error) {
    console.error('Create QR code error:', error);
    return { success: false, error: 'Failed to create QR code' };
  }
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
