import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, QrCode } from 'lucide-react';
import { getLocationQRCodes, generateLocationQRCode } from '@/lib/actions/location-actions';

async function QRCodeGenerator() {
  const result = await getLocationQRCodes();
  
  if (!result.success) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error: {result.error}</p>
      </div>
    );
  }

  const handleDownloadQR = async (locationId: string, locationName: string) => {
    try {
      const qrCodeImage = await generateLocationQRCode(locationId, locationName);
      
      // Create a download link
      const link = document.createElement('a');
      link.href = qrCodeImage;
      link.download = `${locationName.replace(/\s+/g, '_')}_QR_Code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('Failed to download QR code');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Location QR Codes</h1>
          <p className="text-muted-foreground">
            Generate and download QR codes for different locations in your ashram
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {result.qrCodes?.map((qrCode) => (
          <Card key={qrCode.locationId} className="relative">
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
                onClick={() => handleDownloadQR(qrCode.locationId, qrCode.locationName)}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download QR Code
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <ol className="list-decimal list-inside space-y-2">
            <li>Download the QR codes for each location</li>
            <li>Print them and stick them on the walls at the respective locations</li>
            <li>Users will scan these QR codes when they arrive for their appointments</li>
            <li>The system will automatically check them in and add them to the queue</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

export default function QRCodesPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<div>Loading QR codes...</div>}>
        <QRCodeGenerator />
      </Suspense>
    </div>
  );
}
