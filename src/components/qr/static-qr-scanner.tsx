'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Camera,
  CameraOff,
  CheckCircle,
  AlertCircle,
  User,
  Loader2,
  ScanLine
} from 'lucide-react';
import { processQRScanSimple, processManualTextCheckIn } from '@/lib/actions/qr-scan-actions-simple';
import { useLanguage } from '@/contexts/LanguageContext';

export default function StaticQRScanner() {
  const { t } = useLanguage();
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr');
  const [locationId, setLocationId] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  // Get user's current location - MANDATORY
  const getUserLocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (!navigator.geolocation) {
      setResult({
        success: false,
        error: 'Geolocation is not supported by your browser. Please enable location services to check in.',
      });
      return null;
    }

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: true,
            maximumAge: 0,
          });
        }
      );

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setUserLocation(coords);
      return coords;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      let errorMessage = 'Failed to get your location. ';

      if (error.code === 1) {
        errorMessage += 'Please enable location permissions in your browser settings.';
      } else if (error.code === 2) {
        errorMessage += 'Location information is unavailable. Please check your device settings.';
      } else if (error.code === 3) {
        errorMessage += 'Location request timed out. Please try again.';
      } else {
        errorMessage += 'Please enable location services to check in.';
      }

      setResult({
        success: false,
        error: errorMessage,
      });

      return null;
    }
  }, []);

  const handleScan = useCallback(async (data: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setResult(null);

    try {
      // MANDATORY: Get user's location
      const userCoordinates = await getUserLocation();

      if (!userCoordinates) {
        setIsProcessing(false);
        return; // Error already set by getUserLocation
      }

      const response = await processQRScanSimple(data, userCoordinates);

      if (response.success && response.data) {
        setResult({
          success: true,
          message: response.data.message,
        });

        // Stop scanning after successful scan
        if (scannerRef.current) {
          scannerRef.current.stop();
          setScanning(false);
        }
      } else {
        setResult({
          success: false,
          error: response.error || 'Failed to process QR code',
        });
      }
    } catch (error) {
      console.error('QR processing error:', error);
      setResult({
        success: false,
        error: 'An error occurred while processing the QR code',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, getUserLocation]);

  // Initialize QR scanner
  const initializeScanner = useCallback(async () => {
    try {
      setCameraError(null);
      setScanning(true);

      // Check if QrScanner is available
      if (typeof window === 'undefined' || !videoRef.current) {
        return;
      }

      const QrScannerModule = await import('qr-scanner');
      const QrScannerClass = QrScannerModule.default;

      const scanner = new QrScannerClass(
        videoRef.current,
        (result: { data: string }) => handleScan(result.data),
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
      setScanning(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Scanner initialization error:', error);
      setCameraError(
        error?.message || 'Failed to access camera. Please check permissions.'
      );
      setScanning(false);
    }
  }, [handleScan]);

  useEffect(() => {
    if (activeTab === 'qr' && videoRef.current && !scannerRef.current) {
      initializeScanner();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current = null;
      }
    };
  }, [activeTab, initializeScanner]);

  const handleManualCheckIn = async () => {
    // Validate location ID is entered
    if (!locationId.trim()) {
      setResult({
        success: false,
        error: 'Please enter the Location ID from the QR code card',
      });
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      // MANDATORY: Get user's location
      setGettingLocation(true);
      const userCoordinates = await getUserLocation();
      setGettingLocation(false);

      if (!userCoordinates) {
        setIsProcessing(false);
        return; // Error already set by getUserLocation
      }

      // Use the location ID entered by user
      const response = await processManualTextCheckIn(locationId.toUpperCase().trim(), userCoordinates);

      if (response.success && response.data) {
        setResult({
          success: true,
          message: response.data.message,
        });
        setLocationId(''); // Clear input on success
      } else {
        setResult({
          success: false,
          error: response.error || 'Failed to check in',
        });
      }
    } catch (error) {
      console.error('Manual check-in error:', error);
      setResult({
        success: false,
        error: 'An error occurred while checking in',
      });
    } finally {
      setIsProcessing(false);
      setGettingLocation(false);
    }
  };

  const startCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.start();
      setScanning(true);
      setCameraError(null);
    } else {
      initializeScanner();
    }
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      setScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'qr' | 'manual')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="qr">
            <Camera className="h-4 w-4 mr-2" />
            {t('qr.scanQR', 'Scan QR Code')}
          </TabsTrigger>
          <TabsTrigger value="manual">
            <User className="h-4 w-4 mr-2" />
            {t('qr.manualCheckIn', 'Manual Check-in')}
          </TabsTrigger>
        </TabsList>

        {/* QR Scanner Tab */}
        <TabsContent value="qr" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                {!scanning && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center text-white">
                      <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {t('qr.clickToStartCamera', 'Click "Start Camera" to begin scanning')}
                      </p>
                    </div>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center text-white">
                      <CameraOff className="h-12 w-12 mx-auto mb-2 text-red-400" />
                      <p className="text-sm">{cameraError}</p>
                    </div>
                  </div>
                )}

                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  style={{ display: scanning ? 'block' : 'none' }}
                />

                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-center text-white">
                      <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin" />
                      <p className="text-sm">
                        {t('qr.processing', 'Processing...')}
                      </p>
                    </div>
                  </div>
                )}

                {scanning && !isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-4 border-green-500 w-64 h-64 rounded-lg relative">
                      <ScanLine className="absolute top-0 left-1/2 transform -translate-x-1/2 h-6 w-6 text-green-500 animate-pulse" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                {!scanning ? (
                  <Button onClick={startCamera} className="flex-1" disabled={isProcessing}>
                    <Camera className="h-4 w-4 mr-2" />
                    {t('qr.startCamera', 'Start Camera')}
                  </Button>
                ) : (
                  <Button onClick={stopCamera} variant="destructive" className="flex-1" disabled={isProcessing}>
                    <CameraOff className="h-4 w-4 mr-2" />
                    {t('qr.stopCamera', 'Stop Camera')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Check-in Tab */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('qr.manualCheckInTitle', 'Check-in Without Scanning')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {t('qr.manualCheckInInfo', 'If you cannot scan the QR code, enter the Location ID printed below the QR code. Location services must be enabled.')}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="locationId" className="text-base font-medium">
                  {t('qr.locationId', 'Location ID')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="locationId"
                  type="text"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value.toUpperCase())}
                  placeholder={t('qr.enterLocationId', 'e.g., ASHRAM_MAIN')}
                  disabled={isProcessing || gettingLocation}
                  className="text-lg font-mono uppercase"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  {t('qr.locationIdHelp', 'Find this code printed below the QR code on the wall')}
                </p>
              </div>

              {userLocation && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 text-xs">
                    Location detected: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleManualCheckIn}
                className="w-full"
                size="lg"
                disabled={isProcessing || gettingLocation || !locationId.trim()}
              >
                {gettingLocation ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {t('qr.gettingLocation', 'Getting Location...')}
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {t('common.processing', 'Processing...')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    {t('qr.checkInNow', 'Check In Now')}
                  </>
                )}
              </Button>

              <div className="space-y-2">
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 text-xs space-y-1">
                    <p><strong>{t('common.requirements', 'Requirements')}:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>{t('qr.req1', 'Enter correct Location ID from QR code card')}</li>
                      <li>{t('qr.req2', 'Location services must be enabled')}</li>
                      <li>{t('qr.req3', 'You must be within 100 meters of the location')}</li>
                      <li>{t('qr.req4', 'You must have a confirmed appointment for today')}</li>
                      <li>{t('qr.req5', 'Check-in window: 20 min before to 15 min after appointment')}</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Result Display */}
      {result && (
        <Alert className={result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
          <div className="flex items-start gap-2">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                {result.success ? result.message : result.error}
              </AlertDescription>
              {result.success && (
                <div className="mt-3">
                  <Button asChild variant="default" size="sm">
                    <a href="/user/queue">
                      {t('qr.viewQueue', 'View Queue Status')}
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
}