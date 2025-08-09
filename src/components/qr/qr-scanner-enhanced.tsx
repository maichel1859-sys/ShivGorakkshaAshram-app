"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Camera,
  CameraOff,
  RotateCcw,
  FlashlightIcon as Flashlight,
  RefreshCw,
  Smartphone,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface QRScannerEnhancedProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

export function QRScannerEnhanced({
  onScan,
  onError,
  className = "",
  disabled = false,
}: QRScannerEnhancedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<QrScanner.Camera[]>([]);
  const [currentCamera, setCurrentCamera] = useState<string>("");
  const [flashlight, setFlashlight] = useState(false);
  const [error, setError] = useState<string>("");
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    checkSupport();
    return () => {
      stopScanning();
    };
  }, []);

  const checkSupport = async () => {
    try {
      const supported = await QrScanner.hasCamera();
      setIsSupported(supported);

      if (supported) {
        const cameraList = await QrScanner.listCameras(true);
        setCameras(cameraList);
        if (cameraList.length > 0) {
          setCurrentCamera(cameraList[0].id);
        }
      }
    } catch (err) {
      console.error("Error checking camera support:", err);
      setIsSupported(false);
      setError("Camera not supported on this device");
    }
  };

  const startScanning = async () => {
    if (!videoRef.current || disabled || !isSupported) return;

    try {
      setError("");

      // Request camera permission
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setHasPermission(true);
      } catch {
        setHasPermission(false);
        setError("Camera permission denied. Please enable camera access.");
        return;
      }

      // Initialize QR Scanner
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log("QR Code detected:", result.data);
          onScan(result.data);
          // Optionally stop scanning after successful scan
          // stopScanning();
        },
        {
          onDecodeError: (err) => {
            console.log("QR decode error:", err);
            // Don't show decode errors to user as they're normal during scanning
          },
          preferredCamera: currentCamera || "environment",
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        }
      );

      await qrScannerRef.current.start();
      setIsScanning(true);
    } catch (err: unknown) {
      console.error("Error starting QR scanner:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start camera";
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
    setFlashlight(false);
  };

  const toggleFlashlight = async () => {
    if (qrScannerRef.current && "setFlashlight" in qrScannerRef.current) {
      try {
        const newFlashlightState = !flashlight;
        await (
          qrScannerRef.current as {
            setFlashlight: (state: boolean) => Promise<void>;
          }
        ).setFlashlight(newFlashlightState);
        setFlashlight(newFlashlightState);
      } catch (err) {
        console.error("Flashlight not supported:", err);
        setError("Flashlight not supported on this device");
      }
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1 || !qrScannerRef.current) return;

    const currentIndex = cameras.findIndex((cam) => cam.id === currentCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];

    try {
      if ("setCamera" in qrScannerRef.current) {
        await (
          qrScannerRef.current as { setCamera: (id: string) => Promise<void> }
        ).setCamera(nextCamera.id);
        setCurrentCamera(nextCamera.id);
      }
    } catch (err) {
      console.error("Failed to switch camera:", err);
      toast.error("Failed to switch camera");
    }
  };

  const handleRetry = () => {
    setError("");
    setHasPermission(null);
    stopScanning();
    checkSupport();
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Camera Not Supported</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              QR code scanning is not supported on this device or browser.
              Please use a device with a camera or try manual entry.
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Smartphone className="h-16 w-16 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Camera access is required for QR code scanning
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasPermission === false) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CameraOff className="h-5 w-5 text-red-500" />
            <span>Camera Access Denied</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CameraOff className="h-4 w-4" />
            <AlertDescription>
              Camera permission is required to scan QR codes. Please enable
              camera access in your browser settings and try again.
            </AlertDescription>
          </Alert>
          <div className="mt-4 space-y-2">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Look for the camera icon in your address bar and click
              &quot;Allow&quot;
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="h-5 w-5" />
            <span>QR Code Scanner</span>
          </div>
          {isScanning && (
            <div className="flex items-center space-x-2">
              {cameras.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={switchCamera}
                  title="Switch Camera"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFlashlight}
                title="Toggle Flashlight"
              >
                <Flashlight
                  className={`h-4 w-4 ${flashlight ? "text-yellow-500" : ""}`}
                />
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Video Element */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-64 object-cover"
              playsInline
              muted
            />

            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center text-white">
                  <Camera className="h-12 w-12 mx-auto mb-2" />
                  <p>Camera ready to scan</p>
                </div>
              </div>
            )}

            {isScanning && (
              <div className="absolute top-4 left-4">
                <div className="flex items-center space-x-2 bg-green-600 text-white px-2 py-1 rounded text-sm">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span>Scanning...</span>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-2">
            {!isScanning ? (
              <Button
                onClick={startScanning}
                disabled={disabled}
                className="flex-1"
              >
                <Camera className="mr-2 h-4 w-4" />
                Start Scanning
              </Button>
            ) : (
              <Button
                onClick={stopScanning}
                variant="destructive"
                className="flex-1"
              >
                <CameraOff className="mr-2 h-4 w-4" />
                Stop Scanning
              </Button>
            )}
          </div>

          {/* Instructions */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Position the QR code within the camera view
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Hold your device steady</p>
              <p>• Ensure good lighting</p>
              <p>• QR code should fill most of the frame</p>
            </div>
          </div>

          {/* Camera Info */}
          {cameras.length > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              Camera:{" "}
              {cameras.find((cam) => cam.id === currentCamera)?.label ||
                "Default"}
              {cameras.length > 1 && ` (${cameras.length} available)`}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
