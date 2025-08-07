"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QrCode, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { checkInWithQR, manualCheckIn } from "@/lib/actions/checkin-actions";
import { useRouter } from "next/navigation";

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  guruji: {
    name: string;
  };
  reason: string;
}

export default function UserCheckinPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Load user's appointments for today
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      // This would need to be implemented as a server action
      // For now, we'll use a placeholder
      const todayAppointments: Appointment[] = [];
      setAppointments(todayAppointments);
    } catch (error) {
      console.error("Failed to load appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQRCheckIn = async () => {
    if (!qrCode.trim()) {
      alert("Please enter a QR code");
      return;
    }

    setCheckingIn(true);
    try {
      const formData = new FormData();
      formData.append("qrCode", qrCode);

      const result = await checkInWithQR(formData);
      if (result.success) {
        alert("Successfully checked in!");
        setQrCode("");
        await loadAppointments();
      } else {
        alert(`Check-in failed: ${result.error}`);
      }
    } catch (error) {
      console.error("QR check-in error:", error);
      alert("Failed to check in. Please try again.");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleManualCheckIn = async () => {
    if (!manualCode.trim()) {
      alert("Please enter a check-in code");
      return;
    }

    setCheckingIn(true);
    try {
      const formData = new FormData();
      formData.append("appointmentId", manualCode);

      const result = await manualCheckIn(formData);
      if (result.success) {
        alert("Successfully checked in!");
        setManualCode("");
        await loadAppointments();
      } else {
        alert(`Check-in failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Manual check-in error:", error);
      alert("Failed to check in. Please try again.");
    } finally {
      setCheckingIn(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "BOOKED":
        return "bg-blue-100 text-blue-800";
      case "CONFIRMED":
        return "bg-green-100 text-green-800";
      case "CHECKED_IN":
        return "bg-purple-100 text-purple-800";
      case "COMPLETED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Check In</h1>
        <p className="text-muted-foreground">
          Check in for your appointment using QR code or manual code
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code Check-in */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <QrCode className="h-5 w-5" />
              <span>QR Code Check-in</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qrCode">QR Code</Label>
              <Input
                id="qrCode"
                placeholder="Scan or enter QR code"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
              />
            </div>
            <Button
              onClick={handleQRCheckIn}
              disabled={checkingIn || !qrCode.trim()}
              className="w-full"
            >
              {checkingIn ? "Checking In..." : "Check In with QR"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Scan the QR code displayed at the reception or enter it manually
            </p>
          </CardContent>
        </Card>

        {/* Manual Check-in */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Manual Check-in</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manualCode">Check-in Code</Label>
              <Input
                id="manualCode"
                placeholder="Enter check-in code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
            </div>
            <Button
              onClick={handleManualCheckIn}
              disabled={checkingIn || !manualCode.trim()}
              className="w-full"
            >
              {checkingIn ? "Checking In..." : "Check In Manually"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Enter the code provided by the reception staff
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Appointments */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Today&apos;s Appointments</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">
                Loading appointments...
              </p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No appointments for today</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/user/appointments/book")}
              >
                Book Appointment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {new Date(appointment.startTime).toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(appointment.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium">{appointment.guruji.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {appointment.reason}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                    {appointment.status === "BOOKED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setManualCode(appointment.id);
                        }}
                      >
                        Check In
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Check In</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">QR Code Method</h4>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. Go to the reception desk</li>
                <li>2. Ask for the QR code</li>
                <li>3. Scan or enter the code here</li>
                <li>4. Wait for confirmation</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium mb-2">Manual Method</h4>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. Ask reception for your check-in code</li>
                <li>2. Enter the code in the manual section</li>
                <li>3. Click &quot;Check In Manually&quot;</li>
                <li>4. Wait for confirmation</li>
              </ol>
            </div>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> Please check in at least 10 minutes before
              your appointment time. If you have any issues, please speak with
              the reception staff.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
