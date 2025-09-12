"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, QrCode } from 'lucide-react';
import { generateLocationQRCode } from '@/lib/actions/location-actions';

interface QRCodeCardProps {
  qrCode: {
    locationId: string;
    locationName: string;
    qrCodeData: string;
  };
}

export function QRCodeCard({ qrCode }: QRCodeCardProps) {
  const handleDownloadQR = async () => {
    try {
      const qrCodeImage = await generateLocationQRCode(qrCode.locationId, qrCode.locationName);
      
      // Create a download link
      const link = document.createElement('a');
      link.href = qrCodeImage;
      link.download = `${qrCode.locationName.replace(/\s+/g, '_')}_QR_Code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('Failed to download QR code');
    }
  };

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          {qrCode.locationName}
        </CardTitle>
        <CardDescription>
          Location ID: {qrCode.locationId}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-100 p-4 rounded-lg">
          <p className="text-sm font-mono text-gray-600 break-all">
            {qrCode.qrCodeData}
          </p>
        </div>
        <Button 
          onClick={handleDownloadQR}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          Download QR Code
        </Button>
      </CardContent>
    </Card>
  );
}