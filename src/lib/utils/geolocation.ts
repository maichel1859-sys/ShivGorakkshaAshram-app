/**
 * Geolocation utilities for location-based validation
 */

interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1.latitude * Math.PI / 180; // φ, λ in radians
  const φ2 = point2.latitude * Math.PI / 180;
  const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
  const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

/**
 * Check if user is within specified radius of a location
 */
export function isWithinRadius(userLocation: Coordinates, targetLocation: Coordinates, radiusMeters: number = 100): boolean {
  const distance = calculateDistance(userLocation, targetLocation);
  return distance <= radiusMeters;
}

/**
 * Get user's current geolocation
 * Returns a promise with coordinates or error
 */
export function getCurrentLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000, // Increased timeout to 15 seconds
      maximumAge: 300000 // Cache for 5 minutes to reduce battery usage
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        let errorMessage = 'Unknown location error';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user. Please enable location permissions in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your device settings and internet connection.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again or check your GPS signal.';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      options
    );
  });
}

/**
 * Format distance for display
 */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  } else {
    return `${(distanceMeters / 1000).toFixed(1)}km`;
  }
}

/**
 * Validate if user can scan QR code based on location
 */
export interface LocationValidationResult {
  allowed: boolean;
  distance?: number;
  error?: string;
}

export async function validateQRScanLocation(qrLocation: Coordinates, radiusMeters: number = 100): Promise<LocationValidationResult> {
  try {
    const userLocation = await getCurrentLocation();
    const distance = calculateDistance(userLocation, qrLocation);
    const allowed = distance <= radiusMeters;
    
    return {
      allowed,
      distance,
      error: allowed ? undefined : `You are ${formatDistance(distance)} away. Please move within ${radiusMeters}m of the location to scan.`
    };
  } catch (error) {
    return {
      allowed: false,
      error: error instanceof Error ? error.message : 'Failed to get your location'
    };
  }
}