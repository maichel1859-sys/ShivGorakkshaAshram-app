"use client";

import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { motion } from "framer-motion";
import { Download, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptimizedImage } from "@/components/ui/optimized-image";
import toast from "react-hot-toast";

interface QRCodeGeneratorProps {
  appointmentId: string;
  devoteeName: string;
  gurujiName: string;
  appointmentDate: string;
  appointmentTime: string;
  className?: string;
}

export function QRCodeGenerator({
  appointmentId,
  devoteeName,
  gurujiName,
  appointmentDate,
  appointmentTime,
  className = "",
}: QRCodeGeneratorProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Generate QR code data
  const qrData = JSON.stringify({
    appointmentId,
    devoteeName,
    gurujiName,
    appointmentDate,
    appointmentTime,
    timestamp: new Date().toISOString(),
  });

  const generateQRCode = useCallback(async () => {
    setIsGenerating(true);
    try {
      const dataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: "hsl(var(--foreground))",
          light: "hsl(var(--background))",
        },
        errorCorrectionLevel: "H",
      });
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      toast.error("Failed to generate QR code");
    } finally {
      setIsGenerating(false);
    }
  }, [qrData]);

  useEffect(() => {
    generateQRCode();
  }, [generateQRCode]);

  const downloadQRCode = async () => {
    if (!qrCodeDataUrl) return;

    try {
      const link = document.createElement("a");
      link.download = `appointment-${appointmentId}-qr.png`;
      link.href = qrCodeDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("QR code downloaded successfully");
    } catch (error) {
      console.error("Failed to download QR code:", error);
      toast.error("Failed to download QR code");
    }
  };

  const copyQRData = async () => {
    try {
      await navigator.clipboard.writeText(qrData);
      setIsCopied(true);
      toast.success("QR data copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy QR data:", error);
      toast.error("Failed to copy QR data");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Appointment QR Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* QR Code Display */}
          <div className="flex justify-center">
            {isGenerating ? (
              <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : qrCodeDataUrl ? (
              <div className="relative">
                <OptimizedImage
                  src={qrCodeDataUrl}
                  alt="Appointment QR Code"
                  width={256}
                  height={256}
                  className="border-2 border-border rounded-lg"
                  objectFit="contain"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-background px-2 py-1 rounded text-xs text-muted-foreground">
                    {appointmentId.slice(-6)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                QR Code not available
              </div>
            )}
          </div>

          {/* Appointment Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">Devotee:</span>
              <span>{devoteeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Guruji:</span>
              <span>{gurujiName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Date:</span>
              <span>{useTimeStore.getState().formatDate(appointmentDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Time:</span>
              <span>{appointmentTime}</span>
            </div>
          </div>

          {/* QR Data (for debugging) */}
          <div className="space-y-2">
            <Label htmlFor="qrData">QR Data</Label>
            <Input
              id="qrData"
              value={qrData}
              readOnly
              className="text-xs font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={downloadQRCode}
              disabled={!qrCodeDataUrl}
              className="flex-1"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={copyQRData}
              disabled={!qrData}
              className="flex-1"
              variant="outline"
            >
              {isCopied ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {isCopied ? "Copied!" : "Copy Data"}
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground text-center">
            <p>Scan this QR code at the Ashram entrance to check in</p>
            <p>Keep this code safe for your appointment</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Standalone QR Code Display Component
interface QRCodeDisplayProps {
  data: string;
  size?: number;
  title?: string;
  showData?: boolean;
}

export function QRCodeDisplay({
  data,
  size = 200,
  title,
  showData = false,
}: QRCodeDisplayProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQRCode = useCallback(async () => {
    setIsGenerating(true);
    try {
      const dataUrl = await QRCode.toDataURL(data, {
        width: size,
        margin: 2,
        color: {
          dark: "hsl(var(--foreground))",
          light: "hsl(var(--background))",
        },
        errorCorrectionLevel: "H",
      });
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [data, size]);

  useEffect(() => {
    if (data) {
      generateQRCode();
    }
  }, [data, size, generateQRCode]);

  return (
    <div className="text-center">
      {title && <h3 className="text-lg font-medium mb-2">{title}</h3>}

      <div className="flex justify-center mb-4">
        {isGenerating ? (
          <div
            className="bg-muted rounded-lg flex items-center justify-center"
            style={{ width: size, height: size }}
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : qrCodeDataUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeDataUrl}
              alt="QR Code"
              className="border-2 border-border rounded-lg"
              style={{ width: size, height: size }}
            />
          </>
        ) : (
          <div
            className="bg-muted rounded-lg flex items-center justify-center text-muted-foreground"
            style={{ width: size, height: size }}
          >
            QR Code not available
          </div>
        )}
      </div>

      {showData && (
        <div className="text-xs text-muted-foreground font-mono break-all">
          {data}
        </div>
      )}
    </div>
  );
}
import { useTimeStore } from "@/store/time-store";
