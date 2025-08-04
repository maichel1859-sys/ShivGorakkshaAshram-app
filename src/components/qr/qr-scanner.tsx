"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Camera, CameraOff, RotateCcw, Zap } from "lucide-react";
import toast from "react-hot-toast";

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  isActive?: boolean;
}

export function QRScanner({
  onScan,
  onError,
  isActive = true,
}: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );

  const startScanning = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Simple QR detection simulation (in real app, use a QR library like jsQR)
        // For demo purposes, we'll simulate successful scan after 3 seconds
        setTimeout(() => {
          if (isScanning) {
            const mockQRData = JSON.stringify({
              appointmentId: "mock-appointment-id",
              userId: "mock-user-id",
              timestamp: Date.now(),
            });
            onScan(mockQRData);
            setIsScanning(false);
          }
        }, 3000);
      }

      if (isScanning) {
        requestAnimationFrame(scan);
      }
    };

    scan();
  }, [isScanning, onScan]);

  const startCamera = useCallback(async () => {
    try {
      setIsScanning(true);

      const constraints = {
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      };

      const mediaStream =
        await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();

        // Start scanning
        videoRef.current.addEventListener("loadedmetadata", startScanning);
      }
    } catch (error) {
      console.error("Camera access error:", error);
      setHasPermission(false);
      setIsScanning(false);

      const errorMessage =
        error instanceof Error ? error.message : "Camera access denied";
      onError?.(errorMessage);
      toast.error("Camera access required for QR scanning");
    }
  }, [facingMode, onError, startScanning]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  }, [stream]);

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isActive, startCamera, stopCamera]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const restartScanning = () => {
    stopCamera();
    setTimeout(() => startCamera(), 500);
  };

  if (hasPermission === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-destructive">
            <CameraOff className="h-5 w-5" />
            <span>Camera Access Required</span>
          </CardTitle>
          <CardDescription>
            Please allow camera access to scan QR codes for check-in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>To enable camera access:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Click the camera icon in your browser&apos;s address bar</li>
              <li>Select &quot;Allow&quot; for camera permissions</li>
              <li>Refresh the page if needed</li>
            </ol>
          </div>
          <Button onClick={() => window.location.reload()} className="w-full">
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry Camera Access
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Camera className="h-5 w-5" />
          <span>QR Code Scanner</span>
        </CardTitle>
        <CardDescription>
          Position the QR code within the camera view to check in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full rounded-lg bg-black"
            style={{ aspectRatio: "4/3" }}
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanning overlay */}
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Scanning frame */}
                <div className="w-48 h-48 border-2 border-primary rounded-lg relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"></div>

                  {/* Scanning line animation */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary animate-pulse"></div>
                  </div>
                </div>

                {/* Status text */}
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded text-sm">
                  Scanning...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleCamera}
            disabled={!hasPermission}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Flip Camera
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={restartScanning}
            disabled={!hasPermission}
          >
            <Zap className="mr-2 h-4 w-4" />
            Restart
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground">
          <p className="font-medium">Instructions:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Hold your device steady</li>
            <li>Position the QR code within the scanning frame</li>
            <li>Ensure good lighting for better recognition</li>
            <li>The scan will happen automatically</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
