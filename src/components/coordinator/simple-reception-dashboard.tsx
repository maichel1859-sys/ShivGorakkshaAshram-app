"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  Search,
  AlertTriangle,
  UserCheck,
  Activity,
  Clock,
} from "lucide-react";
import { SimpleRegistrationForm } from "./simple-registration-form";
import { SimpleUserLookup } from "./simple-user-lookup";
import { SimpleTriageAssessment } from "./simple-triage-assessment";
import { SimpleAppointmentBooking } from "./simple-appointment-booking";
import { ManualCheckIn } from "./manual-checkin";
import { CheckedInDevotees } from "./checked-in-devotees";
import { toast } from "sonner";
import { useTimeStore, startTimeSync } from "@/store/time-store";

type ActionType =
  | "welcome"
  | "triage"
  | "lookup"
  | "registration"
  | "emergency"
  | "checkin"
  | "booking";

interface DevoteeInfo {
  name: string;
  age: number;
  gender: "MALE" | "FEMALE" | "OTHER";
  userCategory: "WALK_IN" | "FAMILY_MEMBER" | "EMERGENCY";
  email?: string;
  phone?: string;
  isEmergency?: boolean;
}

interface LookupResult {
  found: boolean;
  user?: {
    id: string;
    name: string;
    phone: string;
    hasAppointment: boolean;
    appointmentTime?: string;
  };
}

interface WorkflowData {
  devoteeInfo?: DevoteeInfo;
  lookupResult?: LookupResult;
}

export function SimpleReceptionDashboard() {
  const [currentAction, setCurrentAction] = useState<ActionType>("welcome");
  const [workflowData, setWorkflowData] = useState<WorkflowData>({});
  const currentTime = useTimeStore((s) => s.currentTime);
  const formatTime = useTimeStore((s) => s.formatTime);

  useEffect(() => {
    startTimeSync();
  }, []);

  const resetToWelcome = () => {
    setCurrentAction("welcome");
    setWorkflowData({});
  };

  const handleRegistrationComplete = (devoteeInfo: DevoteeInfo) => {
    setWorkflowData((prev: WorkflowData) => ({ ...prev, devoteeInfo }));
    setCurrentAction("booking");
    toast.success(
      "Offline user information collected! Now booking appointment..."
    );
  };

  const handleLookupComplete = (result: LookupResult) => {
    setWorkflowData((prev: WorkflowData) => ({
      ...prev,
      lookupResult: result,
    }));
    if (result.found && result.user) {
      if (result.user.hasAppointment) {
        setCurrentAction("checkin");
      } else {
        setCurrentAction("booking");
      }
    } else {
      setCurrentAction("registration");
    }
  };

  const handleEmergencyComplete = (emergencyData: DevoteeInfo) => {
    setWorkflowData((prev: WorkflowData) => ({
      ...prev,
      devoteeInfo: emergencyData,
    }));
    setCurrentAction("booking");
    toast.success(
      "Emergency offline user information collected! Now booking priority appointment..."
    );
  };

  const handleBookingComplete = () => {
    toast.success(
      "Appointment booked successfully! Offline user has been added to the queue."
    );
    resetToWelcome();
  };

  const handleTriageComplete = (assessment: {
    isNewDevotee: boolean;
    hasAppointment: boolean;
    isEmergency: boolean;
  }) => {
    // Simple triage - just route to registration for new devotees
    if (assessment.isNewDevotee) {
      setCurrentAction("registration");
    } else {
      setCurrentAction("lookup");
    }
  };

  const getActionTitle = () => {
    switch (currentAction) {
      case "welcome":
        return "Quick Actions";
      case "triage":
        return "New Devotee Assessment";
      case "lookup":
        return "Find Existing Devotee";
      case "registration":
        return "New Devotee Registration";
      case "emergency":
        return "Emergency Registration";
      case "checkin":
        return "Manual Check-in";
      case "booking":
        return "Book Appointment";
      default:
        return "Reception Desk";
    }
  };

  const renderCurrentAction = () => {
    switch (currentAction) {
      case "welcome":
        return <WelcomeScreen onActionSelect={setCurrentAction} />;

      case "triage":
        return (
          <SimpleTriageAssessment
            onComplete={handleTriageComplete}
            onCancel={resetToWelcome}
          />
        );

      case "lookup":
        return (
          <SimpleUserLookup
            onComplete={handleLookupComplete}
            onCancel={resetToWelcome}
          />
        );

      case "registration":
        return (
          <SimpleRegistrationForm
            onSuccess={handleRegistrationComplete}
            onCancel={resetToWelcome}
            mode="registration"
          />
        );

      case "emergency":
        return (
          <SimpleRegistrationForm
            onSuccess={handleEmergencyComplete}
            onCancel={resetToWelcome}
            mode="emergency"
          />
        );

      case "checkin":
        return <ManualCheckIn />;

      case "booking":
        const devoteeInfo =
          workflowData.devoteeInfo ||
          (workflowData.lookupResult?.user
            ? {
                name: workflowData.lookupResult.user.name,
                age: 0, // Default age since lookup doesn't provide this
                gender: "OTHER" as const,
                userCategory: "WALK_IN" as const,
                phone: workflowData.lookupResult.user.phone,
                email: undefined,
              }
            : undefined);

        if (!devoteeInfo) {
          return <div>No devotee information available</div>;
        }

        return (
          <SimpleAppointmentBooking
            devoteeInfo={devoteeInfo}
            onSuccess={handleBookingComplete}
            onCancel={resetToWelcome}
          />
        );

      default:
        return <div>Action not implemented yet</div>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reception Dashboard</h1>
          <p className="text-gray-600 mt-1">{getActionTitle()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Clock className="h-3 w-3 mr-1" />
            {formatTime(currentTime)}
          </Badge>
          {currentAction !== "welcome" && (
            <Button variant="outline" onClick={resetToWelcome}>
              Back to Actions
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-[600px]">{renderCurrentAction()}</div>

      {/* Checked-in Devotees - Always visible at bottom */}
      <CheckedInDevotees />
    </div>
  );
}

function WelcomeScreen({
  onActionSelect,
}: {
  onActionSelect: (action: ActionType) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Quick Actions */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button
              onClick={() => onActionSelect("triage")}
              className="h-24 flex-col gap-2 text-left w-full"
              variant="outline"
            >
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <div className="font-medium">New Offline Devotee</div>
                <div className="text-sm text-gray-500">
                  Book appointment for offline user
                </div>
              </div>
            </Button>

            <Button
              onClick={() => onActionSelect("lookup")}
              className="h-24 flex-col gap-2 text-left w-full"
              variant="outline"
            >
              <Search className="h-8 w-8 text-green-500" />
              <div>
                <div className="font-medium">Find Existing Devotee</div>
                <div className="text-sm text-gray-500">
                  Search by phone/name
                </div>
              </div>
            </Button>

            <Button
              onClick={() => onActionSelect("checkin")}
              className="h-24 flex-col gap-2 text-left w-full"
              variant="outline"
            >
              <UserCheck className="h-8 w-8 text-green-500" />
              <div>
                <div className="font-medium">Manual Check-in</div>
                <div className="text-sm text-gray-500">
                  Help with appointment check-in
                </div>
              </div>
            </Button>

            <Button
              onClick={() => onActionSelect("emergency")}
              className="h-24 flex-col gap-2 text-left w-full border-red-200 hover:bg-red-50"
              variant="outline"
            >
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <div className="font-medium text-red-700">
                  Emergency Devotee
                </div>
                <div className="text-sm text-red-500">
                  Priority registration
                </div>
              </div>
            </Button>

            <Button
              onClick={() => onActionSelect("registration")}
              className="h-24 flex-col gap-2 text-left w-full"
              variant="outline"
            >
              <UserPlus className="h-8 w-8 text-purple-500" />
              <div>
                <div className="font-medium">Direct Appointment Booking</div>
                <div className="text-sm text-gray-500">
                  Book for offline user
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">New Offline Devotee</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Book appointment for users without mobile phones
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Search className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Existing Devotee</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Search by phone number or name to find existing records
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Emergency</h3>
                <p className="text-xs text-gray-600 mt-1">
                  For urgent cases requiring immediate attention
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> This is for offline users without mobile
              phones. After booking, they will be added to the queue just like
              regular users.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
