import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode } from 'lucide-react';
import { getLocationQRCodes } from '@/lib/actions/location-actions';
import { QRCodeCard } from '@/components/admin/qr-code-card';
import { QRGeneratorForm } from '@/components/admin/qr-generator-form';

async function QRCodeGenerator() {
  const result = await getLocationQRCodes();
  
  if (!result.success) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error: {result.error}</p>
      </div>
    );
  }

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
          <QRCodeCard key={qrCode.locationId} qrCode={qrCode} />
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
    <div className="container mx-auto py-6 space-y-8">
      {/* QR Generator Form */}
      <QRGeneratorForm />
      
      {/* Existing QR Codes */}
      <Suspense fallback={<div>Loading QR codes...</div>}>
        <QRCodeGenerator />
      </Suspense>
    </div>
  );
}
