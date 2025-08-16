import { Metadata } from 'next';
import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge'; // Temporarily unused
import { QrCode, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import StaticQRScanner from '@/components/qr/static-qr-scanner';

export const metadata: Metadata = {
  title: 'QR Scanner - Check In',
  description: 'Scan QR code to check in for your appointment',
  keywords: ['qr scanner', 'check in', 'appointment', 'shivgoraksha ashram'],
  openGraph: {
    title: 'QR Scanner - Check In',
    description: 'Scan QR code to check in for your appointment',
    type: 'website',
  },
};

export default function QRScannerPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QR Scanner</h1>
          <p className="text-muted-foreground mt-2">
            Scan the QR code to check in for your appointment
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/user/appointments">
              <QrCode className="h-4 w-4 mr-2" />
              My Appointments
            </Link>
          </Button>
        </div>
      </div>

      {/* QR Scanner Card */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Point your camera at the QR code provided at the reception desk
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3" />
              <span>Make sure you have a confirmed appointment</span>
            </div>
          </div>
          
          <Suspense fallback={
            <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
              <div className="text-center">
                <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
                <p className="text-sm text-muted-foreground">Loading camera...</p>
              </div>
            </div>
          }>
            <StaticQRScanner />
          </Suspense>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How to check in:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Ensure you have a confirmed appointment</li>
                  <li>Go to the reception desk</li>
                  <li>Ask for the QR code for your appointment</li>
                  <li>Scan the QR code using this scanner</li>
                  <li>Your appointment will be automatically checked in</li>
                </ol>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alternative Check-in Options */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg">Alternative Check-in Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Manual Check-in</h3>
                <p className="text-sm text-muted-foreground">
                  Check in manually at the reception desk
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/user/checkin">
                  Check In
                </Link>
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">View Appointments</h3>
                <p className="text-sm text-muted-foreground">
                  See your upcoming appointments and check-in status
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/user/appointments">
                  View Appointments
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
