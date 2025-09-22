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
 * Supports both JSON format and simple location ID format
 */
export function validateLocationQRData(qrData: string): { valid: boolean; data?: LocationQRData; error?: string } {
  // First try to parse as JSON (standard QR code format)
  try {
    const parsedData: LocationQRData = JSON.parse(qrData);

    if (!parsedData.locationId || !parsedData.locationName) {
      return { valid: false, error: 'QR code missing required location data' };
    }

    if (parsedData.locationId !== 'ASHRAM_MAIN') {
      return { valid: false, error: 'Invalid location. Only main ashram location is supported.' };
    }

    return { valid: true, data: parsedData };
  } catch {
    // If JSON parsing fails, try to handle as simple location ID string
    const cleanedInput = qrData.trim().toUpperCase();

    // Check if it's the main ashram location
    if (cleanedInput === 'ASHRAM_MAIN' || cleanedInput === 'ASHRAM' || cleanedInput === 'MAIN') {
      const locationData: LocationQRData = {
        locationId: 'ASHRAM_MAIN',
        locationName: 'Shiv Goraksha Ashram',
        timestamp: Date.now()
      };

      return { valid: true, data: locationData };
    }

    return {
      valid: false,
      error: 'Invalid format. Enter "ASHRAM_MAIN", "ASHRAM", "MAIN", or the full QR code data.'
    };
  }
}

