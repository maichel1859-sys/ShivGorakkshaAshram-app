"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, MapPin, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { createQRCodeWithCoordinates } from '@/lib/actions/location-actions';

interface GeneratedQR {
  locationId: string;
  locationName: string;
  coordinates: { latitude: number; longitude: number };
  qrCodeImage: string;
  qrData: string;
}

export function QRGeneratorForm() {
  const [locationId, setLocationId] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; data?: GeneratedQR; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!locationId || !locationName || !latitude || !longitude) {
      setResult({ success: false, error: 'All fields are required' });
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setResult({ success: false, error: 'Invalid coordinates' });
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setResult({ success: false, error: 'Coordinates out of valid range' });
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('locationId', locationId);
      formData.append('locationName', locationName);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);

      const response = await createQRCodeWithCoordinates(formData);
      setResult(response);

      if (response.success) {
        // Clear form on success
        setLocationId('');
        setLocationName('');
        setLatitude('');
        setLongitude('');
      }
    } catch (error) {
      setResult({ success: false, error: 'Failed to generate QR code' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (qr: GeneratedQR) => {
    const link = document.createElement('a');
    link.href = qr.qrCodeImage;
    link.download = `${qr.locationName.replace(/\s+/g, '_')}_QR_Code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setResult({ success: false, error: 'Geolocation is not supported by this browser' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
      },
      (positionError) => {
        let errorMessage = 'Failed to get current location';
        switch (positionError.code) {
          case positionError.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case positionError.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case positionError.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        setResult({ success: false, error: errorMessage });
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* QR Generator Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Generate New QR Code with Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="locationId">Location ID</Label>
                <Input
                  id="locationId"
                  type="text"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  placeholder="e.g., RECEPTION_001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="locationName">Location Name</Label>
                <Input
                  id="locationName"
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g., Main Reception"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="e.g., 19.076090"
                  required
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="e.g., 72.877426"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isGenerating} className="flex-1">
                {isGenerating ? 'Generating...' : 'Generate QR Code'}
              </Button>
              <Button type="button" variant="outline" onClick={getCurrentLocation}>
                <MapPin className="h-4 w-4 mr-2" />
                Use Current Location
              </Button>
            </div>
          </form>

          {/* Result Display */}
          {result && (
            <div className="mt-4">
              {result.success ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    QR Code generated successfully!
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {result.error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated QR Code Display */}
      {result?.success && result.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Generated QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">QR Code Image</h3>
                <div className="bg-white p-4 rounded-lg border inline-block">
                  <img 
                    src={result.data.qrCodeImage} 
                    alt={`QR Code for ${result.data.locationName}`}
                    className="max-w-[200px] max-h-[200px]"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-2">Location Details</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>ID:</strong> {result.data.locationId}</p>
                    <p><strong>Name:</strong> {result.data.locationName}</p>
                    <p><strong>Latitude:</strong> {result.data.coordinates.latitude}</p>
                    <p><strong>Longitude:</strong> {result.data.coordinates.longitude}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">QR Code Data</h3>
                  <div className="bg-gray-100 p-2 rounded text-xs font-mono break-all">
                    {result.data.qrData}
                  </div>
                </div>
                
                <Button onClick={() => handleDownload(result.data!)} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}