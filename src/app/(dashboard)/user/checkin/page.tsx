"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { QRScanner } from "@/components/qr/qr-scanner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  QrCode,
  KeyRound,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  MapPin,
} from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface CheckInData {
  appointmentId: string;
  patientName: string;
  gurujiName: string;
  appointmentTime: string;
  queuePosition?: number;
  estimatedWait?: number;
}

export default function CheckInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState<CheckInData | null>(
    null
  );
  const [manualCode, setManualCode] = useState("");
  const [activeTab, setActiveTab] = useState<"qr" | "manual">("qr");
  const router = useRouter();

  const handleQRScan = async (qrData: string) => {
    setIsLoading(true);

    try {
      // Parse QR data
      const parsedData = JSON.parse(qrData);

      // Call check-in API
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointmentId: parsedData.appointmentId,
          qrData: qrData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Check-in failed");
      }

      const result = await response.json();

      setCheckInSuccess({
        appointmentId: result.appointment.id,
        patientName: result.appointment.user.name,
        gurujiName: result.appointment.guruji.name,
        appointmentTime: new Date(
          result.appointment.startTime
        ).toLocaleString(),
        queuePosition: result.queueEntry?.position,
        estimatedWait: result.queueEntry?.estimatedWait,
      });

      toast.success("Successfully checked in!");
    } catch (error: unknown) {
      console.error("Check-in error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Check-in failed";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualCheckIn = async () => {
    if (!manualCode.trim()) {
      toast.error("Please enter your appointment code");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/checkin/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointmentCode: manualCode.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Manual check-in failed");
      }

      const result = await response.json();

      setCheckInSuccess({
        appointmentId: result.appointment.id,
        patientName: result.appointment.user.name,
        gurujiName: result.appointment.guruji.name,
        appointmentTime: new Date(
          result.appointment.startTime
        ).toLocaleString(),
        queuePosition: result.queueEntry?.position,
        estimatedWait: result.queueEntry?.estimatedWait,
      });

      toast.success("Successfully checked in!");
    } catch (error: unknown) {
      console.error("Manual check-in error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Manual check-in failed";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewQueue = () => {
    router.push("/user/queue");
  };

  if (checkInSuccess) {
    return (
      <DashboardLayout title="Check-in Successful" allowedRoles={["USER"]}>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Success Message */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-green-700">
                <CheckCircle className="h-6 w-6" />
                <span>Check-in Successful!</span>
              </CardTitle>
              <CardDescription className="text-green-600">
                You have been successfully checked in for your appointment
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Appointment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Patient</p>
                    <p className="font-medium">{checkInSuccess.patientName}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Guruji</p>
                    <p className="font-medium">{checkInSuccess.gurujiName}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Appointment Time
                    </p>
                    <p className="font-medium">
                      {checkInSuccess.appointmentTime}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">Consultation Room 1</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Queue Information */}
          {checkInSuccess.queuePosition && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Queue Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      Position #{checkInSuccess.queuePosition}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {checkInSuccess.estimatedWait &&
                        `Estimated wait: ${checkInSuccess.estimatedWait} minutes`}
                    </p>
                  </div>
                  <Button onClick={handleViewQueue}>View Live Queue</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>What&apos;s Next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Wait for your turn</p>
                  <p className="text-sm text-muted-foreground">
                    Monitor the live queue or wait for notification
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Proceed to consultation room</p>
                  <p className="text-sm text-muted-foreground">
                    You&apos;ll be notified when it&apos;s your turn
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Receive your remedy</p>
                  <p className="text-sm text-muted-foreground">
                    Digital remedy will be sent after consultation
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="flex-1" onClick={handleViewQueue}>
              <Clock className="mr-2 h-4 w-4" />
              View Live Queue
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/user")}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Check In" allowedRoles={["USER"]}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Check In for Appointment
          </h2>
          <p className="text-muted-foreground">
            Use your QR code or appointment reference to check in
          </p>
        </div>

        {/* Check-in Methods */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "qr" | "manual")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qr" className="flex items-center space-x-2">
              <QrCode className="h-4 w-4" />
              <span>QR Code</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center space-x-2">
              <KeyRound className="h-4 w-4" />
              <span>Manual Entry</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qr" className="space-y-4">
            <QRScanner
              onScan={handleQRScan}
              onError={(error) => toast.error(error)}
              isActive={activeTab === "qr" && !isLoading}
            />

            {isLoading && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="text-blue-700">Processing check-in...</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <KeyRound className="h-5 w-5" />
                  <span>Manual Check-in</span>
                </CardTitle>
                <CardDescription>
                  Enter your appointment reference code to check in
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Appointment Reference Code</Label>
                  <Input
                    id="code"
                    placeholder="Enter your appointment code"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    disabled={isLoading}
                  />
                  <p className="text-sm text-muted-foreground">
                    You can find this code in your appointment confirmation
                    email
                  </p>
                </div>

                <Button
                  onClick={handleManualCheckIn}
                  disabled={isLoading || !manualCode.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
                      Checking in...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Check In
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Need Help?</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <p>
                <strong>QR Code not working?</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Make sure your camera has good lighting</li>
                <li>Hold the device steady and position QR code in frame</li>
                <li>Try switching between front and back camera</li>
                <li>Use manual entry as an alternative</li>
              </ul>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <p>
                <strong>Don&apos;t have your code?</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Check your appointment confirmation email</li>
                <li>Visit the front desk for assistance</li>
                <li>Call us at (555) 123-4567</li>
              </ul>
            </div>

            <Button variant="outline" className="w-full">
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
