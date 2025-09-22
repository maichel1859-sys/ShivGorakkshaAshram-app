'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, CheckCircle, AlertCircle, Clock, MapPin, Navigation, Settings, Info } from 'lucide-react';
import { processQRScanSimple } from '@/lib/actions/qr-scan-actions-simple';
import { useRouter } from 'next/navigation';
import { showToast } from '@/lib/toast';
import { getCurrentLocation } from '@/lib/utils/geolocation';
import QrScanner from 'qr-scanner';

interface QRScanResult {
  success: boolean;
  data?: {
    queuePosition: number;
    estimatedWaitMinutes: number;
    message: string;
  };
  error?: string;
}

export default function StaticQRScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'checking' | 'allowed' | 'denied' | 'error'>('checking');
  const [showLocationHelp, setShowLocationHelp] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // const streamRef = useRef<MediaStream | null>(null); // Unused with QR scanner library
  const qrScannerRef = useRef<QrScanner | null>(null);
  const router = useRouter();

  // Get user location on component mount
  useEffect(() => {
    const getLocation = async () => {
      try {
        setLocationStatus('checking');

        // Check if geolocation is supported
        if (!navigator.geolocation) {
          setLocationStatus('error');
          setError('Geolocation is not supported by this browser');
          return;
        }

        // Request location with improved options
        const location = await getCurrentLocation();
        setUserLocation(location);
        setLocationStatus('allowed');
        setError(null);
      } catch (error) {
        console.error('Location error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to get location';

        // Check if it's a permission denied error specifically
        if (errorMessage.includes('denied')) {
          setLocationStatus('denied');
          setShowLocationHelp(true);
        } else {
          setLocationStatus('error');
        }

        setError(errorMessage);
      }
    };

    getLocation();
  }, []);

  const processQRCode = useCallback(async (qrData: string) => {
    setIsProcessing(true);
    setError(null);
    setScanResult(null);

    try {
      // Pass user location for geolocation validation
      const result = await processQRScanSimple(qrData, userLocation || undefined);
      setScanResult(result);

      if (result.success) {
        showToast.success(result.data?.message || 'Successfully checked in!');
        // Auto-refresh queue page after successful scan
        setTimeout(() => {
          router.push('/user/queue');
          router.refresh();
        }, 2000);
      } else {
        showToast.error(result.error || 'QR scan failed');
      }
    } catch (err) {
      console.error('QR processing error:', err);
      setError('Failed to process QR code. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [userLocation, router]);

  const startCamera = useCallback(async () => {
    try {
      if (!videoRef.current) {
        setError('Video element not available');
        return;
      }

      // Initialize QR scanner
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          // Auto-process detected QR code
          setIsScanning(false);
          processQRCode(result.data);
        },
        {
          onDecodeError: (err) => {
            // Ignore decode errors - this is normal when scanning
            console.debug('QR decode attempt:', err);
          },
          preferredCamera: 'environment', // Use back camera on mobile
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
        }
      );

      await qrScannerRef.current.start();
      setError(null);
    } catch (err) {
      console.error('Error starting QR scanner:', err);
      setError('Unable to access camera. Please check permissions and try again.');
    }
  }, [processQRCode]);

  const stopCamera = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
  };

  // Initialize camera
  useEffect(() => {
    if (isScanning) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isScanning, startCamera]);


  const handleManualQRInput = () => {
    const qrData = prompt(
      'Enter QR code data in any of these formats:\n' +
      '• Full QR code JSON data\n' +
      '• ASHRAM_MAIN\n' +
      '• ASHRAM\n' +
      '• MAIN\n\n' +
      'What is displayed on your QR code?'
    );
    if (qrData?.trim()) {
      processQRCode(qrData.trim());
    }
  };


  const resetScanner = () => {
    setScanResult(null);
    setError(null);
    setIsScanning(true);
  };

  return (
    <div className="space-y-6">
      {/* Location Status */}
      <Alert className={locationStatus === 'allowed' ? 'border-green-200 bg-green-50' : locationStatus === 'denied' ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}>
        <div className="flex items-start gap-2">
          {locationStatus === 'checking' ? (
            <Navigation className="h-4 w-4 text-blue-600 mt-0.5 animate-spin" />
          ) : locationStatus === 'allowed' ? (
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
          )}
          <div>
            <AlertDescription className={locationStatus === 'allowed' ? 'text-green-800' : locationStatus === 'denied' ? 'text-red-800' : 'text-blue-800'}>
              {locationStatus === 'checking' && 'Getting your location...'}
              {locationStatus === 'allowed' && 'Location access granted. You can scan QR codes within 100m of their location.'}
              {locationStatus === 'denied' && 'Location access denied. Please enable location access to use QR code scanning with location validation.'}
              {locationStatus === 'error' && 'Location error occurred.'}
            </AlertDescription>
            {userLocation && (
              <p className="text-xs text-muted-foreground mt-1">
                Your location: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
              </p>
            )}
            {locationStatus === 'denied' && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-red-800">Alternative options:</p>
                <div className="space-y-1 text-sm text-red-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    <span>Use &quot;Manual Input&quot; button below to enter the QR code text</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    <span>Ask reception staff to manually check you in</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    <span>Enable location in browser settings and refresh page</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    onClick={async () => {
                      try {
                        setLocationStatus('checking');
                        const location = await getCurrentLocation();
                        setUserLocation(location);
                        setLocationStatus('allowed');
                        setError(null);
                        setShowLocationHelp(false);
                      } catch (error) {
                        console.error('Location error:', error);
                        setLocationStatus('denied');
                        setError(error instanceof Error ? error.message : 'Failed to get location');
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Navigation className="h-3 w-3 mr-1" />
                    Try Again
                  </Button>

                  <Button
                    onClick={() => setShowLocationHelp(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Info className="h-3 w-3 mr-1" />
                    Help
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Alert>

      {/* Location Help Card */}
      {showLocationHelp && locationStatus === 'denied' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
              <Settings className="h-5 w-5" />
              How to Enable Location Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-blue-700">
              <p className="mb-3">To use QR code scanning with location validation, please enable location access in your browser:</p>

              <div className="space-y-4">
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <h4 className="font-semibold mb-2">📱 Chrome Mobile / Chrome Desktop:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Click the location icon (🔒) in the address bar</li>
                    <li>Select &quot;Allow&quot; for location access</li>
                    <li>Refresh the page</li>
                  </ol>
                </div>

                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <h4 className="font-semibold mb-2">🍎 Safari Mobile:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Go to Settings → Safari → Location</li>
                    <li>Select &quot;Ask&quot; or &quot;Allow&quot;</li>
                    <li>Return to this page and refresh</li>
                  </ol>
                </div>

                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <h4 className="font-semibold mb-2">🦊 Firefox:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Click the shield icon in the address bar</li>
                    <li>Click &quot;Allow Location Access&quot;</li>
                    <li>Refresh the page</li>
                  </ol>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Tip:</strong> Location access is used to verify you&apos;re physically present at the ashram for check-in security.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  try {
                    setLocationStatus('checking');
                    const location = await getCurrentLocation();
                    setUserLocation(location);
                    setLocationStatus('allowed');
                    setError(null);
                    setShowLocationHelp(false);
                  } catch (error) {
                    console.error('Location error:', error);
                    setLocationStatus('denied');
                    setError(error instanceof Error ? error.message : 'Failed to get location');
                  }
                }}
                variant="default"
                size="sm"
              >
                <Navigation className="h-3 w-3 mr-1" />
                Try Again
              </Button>

              <Button
                onClick={() => setShowLocationHelp(false)}
                variant="outline"
                size="sm"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scanner Status */}
      {scanResult && (
        <Alert className={scanResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <div className="flex items-start gap-2">
            {scanResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            )}
            <AlertDescription className={scanResult.success ? 'text-green-800' : 'text-red-800'}>
              {scanResult.success ? scanResult.data?.message : scanResult.error}
            </AlertDescription>
          </div>
          {scanResult.success && scanResult.data && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="default">Position #{scanResult.data.queuePosition}</Badge>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {scanResult.data.estimatedWaitMinutes} min wait
                </Badge>
              </div>
            </div>
          )}
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Camera Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Location QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Point your camera at the static QR code posted at the location
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>QR code should be permanently displayed at the reception</span>
            </div>
          </div>

          {/* Camera View */}
          <div className="relative">
            {isScanning ? (
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                {/* QR Scanner automatically adds highlighting overlay */}
              </div>
            ) : (
              <div className="bg-muted rounded-lg h-64 flex items-center justify-center">
                <div className="text-center">
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Camera not active</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click &quot;Start Scanner&quot; to begin QR code detection
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Manual Input Helper */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1">💡 Manual Input Formats:</p>
            <div className="space-y-1">
              <p>• Full QR data: JSON string from QR code</p>
              <p>• Location ID: ASHRAM_MAIN</p>
              <p>• Simple format: ASHRAM or MAIN</p>
            </div>
          </div>

          {/* Scanner Controls */}
          <div className="flex gap-2">
            {!isScanning ? (
              <Button 
                onClick={() => setIsScanning(true)}
                disabled={isProcessing}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Start Scanner
              </Button>
            ) : (
              <Button 
                onClick={() => setIsScanning(false)}
                variant="outline"
                className="flex-1"
              >
                Stop Scanner
              </Button>
            )}
            
            <Button
              onClick={handleManualQRInput}
              variant="outline"
              disabled={isProcessing}
              title="Enter QR code data manually (supports multiple formats)"
            >
              Manual Input
            </Button>
          </div>

          {/* Processing State */}
          {isProcessing && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Processing QR code...</p>
            </div>
          )}

          {/* Reset Button */}
          {scanResult && (
            <Button 
              onClick={resetScanner}
              variant="outline"
              className="w-full"
            >
              Scan Another QR Code
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to Check In</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                1
              </div>
              <div>
                <p className="font-medium">Ensure you have an appointment for today</p>
                <p className="text-muted-foreground">You must have a confirmed appointment for the current date</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                2
              </div>
              <div>
                <p className="font-medium">Arrive at the location</p>
                <p className="text-muted-foreground">Go to the reception desk where the QR code is displayed</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                3
              </div>
              <div>
                <p className="font-medium">Scan the QR code within the time window</p>
                <p className="text-muted-foreground">You can scan 20 minutes before to 15 minutes after your appointment time</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                4
              </div>
              <div>
                <p className="font-medium">Wait for your turn</p>
                <p className="text-muted-foreground">You&apos;ll be added to the queue and can see your position and estimated wait time</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
