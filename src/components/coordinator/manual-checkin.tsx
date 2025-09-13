"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Search,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  User,
  Phone
} from 'lucide-react';
import { manualCheckIn, searchAppointments } from '@/lib/actions/coordinator-actions';
import { useLanguage } from '@/contexts/LanguageContext';

interface AppointmentSearchResult {
  id: string;
  userId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  status: string;
  reason: string | null;
  priority: string | null;
  user: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  };
  guruji: {
    id: string;
    name: string | null;
  } | null;
}

interface CheckInResult {
  success: boolean;
  data?: {
    queuePosition: number;
    estimatedWaitMinutes: number;
    message: string;
  };
  error?: string;
}

export function ManualCheckIn() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AppointmentSearchResult[]>([]);
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState('RECEPTION_001');

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setCheckInResult(null);

    try {
      const result = await searchAppointments(searchTerm);
      if (result.success && result.data) {
        setSearchResults(result.data);
      } else {
        setCheckInResult({ success: false, error: result.error || 'No appointments found' });
      }
    } catch {
      setCheckInResult({ success: false, error: 'Search failed. Please try again.' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCheckIn = async (appointment: AppointmentSearchResult) => {
    setCheckingInId(appointment.id);
    setCheckInResult(null);

    try {
      const result = await manualCheckIn(appointment.id, selectedLocation);
      setCheckInResult(result);
      
      if (result.success) {
        // Remove the checked-in appointment from search results
        setSearchResults(prev => prev.filter(app => app.id !== appointment.id));
      }
    } catch {
      setCheckInResult({ success: false, error: 'Check-in failed. Please try again.' });
    } finally {
      setCheckingInId(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'BOOKED': return 'bg-blue-100 text-blue-700';
      case 'CONFIRMED': return 'bg-green-100 text-green-700';
      case 'CHECKED_IN': return 'bg-purple-100 text-purple-700';
      case 'COMPLETED': return 'bg-gray-100 text-gray-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityBadgeColor = (priority: string | null) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-700';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
      case 'LOW': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t('coordinator.searchAppointments', 'Search Appointments for Manual Check-in')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">{t('coordinator.searchByDetails', 'Search by Name, Phone, or Email')}</Label>
              <Input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('coordinator.searchPlaceholder', 'Enter patient name, phone number, or email')}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="w-48">
              <Label htmlFor="location">Check-in Location</Label>
              <select
                id="location"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="RECEPTION_001">Main Reception</option>
                <option value="GURUJI_LOC_001">Consultation Room 1</option>
                <option value="GURUJI_LOC_002">Consultation Room 2</option>
                <option value="WAITING_AREA_001">Waiting Area</option>
              </select>
            </div>
          </div>
          
          <Button onClick={handleSearch} disabled={isSearching || !searchTerm.trim()}>
            {isSearching ? 'Searching...' : 'Search Appointments'}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {checkInResult && (
        <Alert className={checkInResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <div className="flex items-start gap-2">
            {checkInResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            )}
            <div>
              <AlertDescription className={checkInResult.success ? 'text-green-800' : 'text-red-800'}>
                {checkInResult.success ? checkInResult.data?.message : checkInResult.error}
              </AlertDescription>
              {checkInResult.success && checkInResult.data && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="default">Position #{checkInResult.data.queuePosition}</Badge>
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {checkInResult.data.estimatedWaitMinutes} min wait
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </Alert>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Found Appointments ({searchResults.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {searchResults.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {appointment.user.name
                          ?.split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">
                          {appointment.user.name || 'Unknown User'}
                        </h3>
                        <Badge className={getStatusBadgeColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                        {appointment.priority && (
                          <Badge className={getPriorityBadgeColor(appointment.priority)}>
                            {appointment.priority}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-4">
                          {appointment.user.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {appointment.user.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {appointment.guruji?.name || 'Unknown Guruji'}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(appointment.startTime).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(appointment.startTime).toLocaleTimeString()} - {new Date(appointment.endTime).toLocaleTimeString()}
                          </div>
                        </div>
                        {appointment.reason && (
                          <p className="text-xs">Reason: {appointment.reason}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {appointment.status === 'CHECKED_IN' ? (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Already Checked In
                      </Badge>
                    ) : (
                      <Button
                        onClick={() => handleCheckIn(appointment)}
                        disabled={checkingInId === appointment.id || appointment.status === 'CANCELLED'}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {checkingInId === appointment.id ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Checking In...
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Manual Check-in
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">How to Use Manual Check-in</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Search for the patient using their name, phone number, or email</li>
            <li>Select the appropriate check-in location from the dropdown</li>
            <li>Find the patient&apos;s appointment in the search results</li>
            <li>Click &quot;Manual Check-in&quot; to add them to the queue</li>
            <li>The patient will receive their queue position and estimated wait time</li>
          </ol>
          <div className="mt-3 p-3 bg-blue-100 rounded border text-xs">
            <strong>Note:</strong> Manual check-in should only be used when patients cannot scan QR codes themselves or for emergency situations. The system will validate that the appointment exists and is eligible for check-in.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}