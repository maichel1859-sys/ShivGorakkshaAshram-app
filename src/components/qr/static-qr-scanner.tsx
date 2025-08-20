'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, CheckCircle, AlertCircle, Clock, MapPin } from 'lucide-react';
import { processQRScanSimple } from '@/lib/actions/qr-scan-actions-simple';
import { useRouter } from 'next/navigation';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();

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
  }, [isScanning]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Note: captureFrame is currently unused but may be needed for future QR processing
  // const captureFrame = (): string | null => {
  //   if (!videoRef.current || !canvasRef.current) return null;

  //   const video = videoRef.current;
  //   const canvas = canvasRef.current;
  //   const context = canvas.getContext('2d');

  //   if (!context) return null;

  //   canvas.width = video.videoWidth;
  //   canvas.height = video.videoHeight;
  //   context.drawImage(video, 0, 0, canvas.width, canvas.height);

  //   return canvas.toDataURL('image/jpeg');
  // };

  const processQRCode = async (qrData: string) => {
    setIsProcessing(true);
    setError(null);
    setScanResult(null);

    try {
      const result = await processQRScanSimple(qrData);
      setScanResult(result);

      if (result.success) {
        // Auto-refresh queue page after successful scan
        setTimeout(() => {
          router.refresh();
        }, 2000);
      }
    } catch (err) {
      console.error('QR processing error:', err);
      setError('Failed to process QR code. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualQRInput = () => {
    const qrData = prompt('Please enter the QR code data:');
    if (qrData) {
      processQRCode(qrData);
    }
  };

  // Note: handleScanSuccess is currently unused but may be needed for future QR processing
  // const handleScanSuccess = (qrData: string) => {
  //   setIsScanning(false);
  //   processQRCode(qrData);
  // };

  const resetScanner = () => {
    setScanResult(null);
    setError(null);
    setIsScanning(true);
  };

  return (
    <div className="space-y-6">
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
                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-white rounded-lg p-4">
                    <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                      <div className="absolute inset-0 border-2 border-green-400 rounded-lg animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-muted rounded-lg h-64 flex items-center justify-center">
                <div className="text-center">
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Camera not active</p>
                </div>
              </div>
            )}
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
