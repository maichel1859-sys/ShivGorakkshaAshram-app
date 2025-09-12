interface LocationQRData {
  locationId: string;
  locationName: string;
  timestamp: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Validate location QR code data
 */
export function validateLocationQRData(qrData: string): { valid: boolean; data?: LocationQRData; error?: string } {
  try {
    const parsedData: LocationQRData = JSON.parse(qrData);
    
    if (!parsedData.locationId || !parsedData.locationName) {
      return { valid: false, error: 'Invalid QR code data format' };
    }

    if (!parsedData.locationId.startsWith('GURUJI_LOC_')) {
      return { valid: false, error: 'Invalid location ID format' };
    }

    return { valid: true, data: parsedData };
  } catch {
    return { valid: false, error: 'Invalid QR code format' };
  }
}
