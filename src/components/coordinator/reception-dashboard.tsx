"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  UserPlus,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle,
  Phone,
  Calendar,
  QrCode,
  FileText,
  ArrowRight,
  Activity,
  UserCheck,
} from "lucide-react";
import { TriageAssessmentComponent } from "./triage-assessment";
import { QuickRegistrationForm } from "./quick-registration-form";
import { UserLookupComponent } from "./user-lookup";
import { EmergencyQueueEntry } from "./emergency-queue-entry";
import { ManualCheckIn } from "./manual-checkin";
import { SimpleAppointmentBooking } from "./simple-appointment-booking";
import { CheckedInDevotees } from "./checked-in-devotees";
import { toast } from "sonner";
import { useQueueUnified } from "@/hooks/use-queue-unified";
import { useTimeStore, startTimeSync } from "@/store/time-store";
import type { QueueEntry } from "@/types/queue";

type WorkflowStep = 
  | "welcome" 
  | "triage" 
  | "lookup" 
  | "registration" 
  | "emergency"
  | "booking" 
  | "checkin" 
  | "manual-checkin"
  | "complete";

interface WorkflowData {
  devoteeInfo?: Record<string, unknown>;
  assessment?: Record<string, unknown>;
  lookupResult?: Record<string, unknown>;
  bookingData?: Record<string, unknown>;
}

export function ReceptionDashboard() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("welcome");
  const [workflowData, setWorkflowData] = useState<WorkflowData>({});
  const [offlineDevotee, setOfflineDevotee] = useState<{
    name: string;
    phone?: string;
    email?: string;
    age: number;
    gender: "MALE" | "FEMALE" | "OTHER";
    userCategory: "WALK_IN" | "EMERGENCY" | "FAMILY_MEMBER";
  } | null>(null);
  const currentTime = useTimeStore((s) => s.currentTime);
  const formatTime = useTimeStore((s) => s.formatTime);

  useEffect(() => {
    startTimeSync();
  }, []);
  
  // Use unified queue hook with React Query caching and socket fallback
  const {
    queueEntries,
    // loading, // Unused for now
    // error, // Unused for now
    stats,
    // refetch: loadQueueEntries, // Unused for now
    // isConnected, // Unused for now
    // isOnline, // Unused for now
  } = useQueueUnified({
    role: 'coordinator',
    autoRefresh: true,
    refreshInterval: 20000,
    enableRealtime: true,
  });

  // Calculate real-time stats from queue data
  const todayStats = {
    totalCheckins: stats?.total || 0,
    newRegistrations: queueEntries?.filter((entry: QueueEntry) => 
      new Date(entry.checkedInAt).toDateString() === new Date().toDateString()
    ).length || 0,
    emergencyDevotees: queueEntries?.filter((entry: QueueEntry) => entry.priority === 'EMERGENCY').length || 0,
    waitingInQueue: stats?.waiting || 0,
    averageWaitTime: stats?.averageWaitTime ? `${Math.round(stats.averageWaitTime)} min` : "N/A",
    nextAvailableSlot: "N/A", // This would need appointment slot logic
  };

  const resetWorkflow = () => {
    setCurrentStep("welcome");
    setWorkflowData({});
  };

  const handleTriageComplete = (assessment: Record<string, unknown>) => {
    setWorkflowData(prev => ({ ...prev, assessment }));
    
    // Route based on triage results
    switch (assessment.recommendedPath) {
      case "EMERGENCY":
        setCurrentStep("emergency");
        break;
      case "SELF_CHECKIN":
        showSelfCheckinGuidance();
        break;
      case "COORDINATOR_CHECKIN":
        setCurrentStep("lookup");
        break;
      case "SELF_BOOKING":
        showSelfBookingGuidance();
        break;
      case "QUICK_BOOKING":
        setCurrentStep("lookup");
        break;
      case "FULL_REGISTRATION":
        setCurrentStep("registration");
        break;
      default:
        setCurrentStep("lookup");
    }
  };

  const showSelfCheckinGuidance = () => {
    toast.success("Please direct the devotee to scan the QR code for self check-in", {
      duration: 5000,
    });
    resetWorkflow();
  };

  const showSelfBookingGuidance = () => {
    toast.success("Please guide the devotee to use the booking QR code", {
      duration: 5000,
    });
    resetWorkflow();
  };

  const handleLookupComplete = (result: Record<string, unknown>) => {
    setWorkflowData(prev => ({ ...prev, lookupResult: result }));
    
    if (result.found) {
      if (workflowData.assessment?.hasAppointment) {
        setCurrentStep("checkin");
      } else {
        setCurrentStep("booking");
      }
    } else {
      setCurrentStep("registration");
    }
  };

  const handleRegistrationComplete = (devoteeInfo: Record<string, unknown>) => {
    setWorkflowData(prev => ({ ...prev, devoteeInfo }));
    setCurrentStep("booking");
    toast.success("Devotee registered successfully! Now booking appointment...");
  };

  const handleEmergencyComplete = (emergencyData: Record<string, unknown>) => {
    setWorkflowData(prev => ({ ...prev, emergencyData }));
    setCurrentStep("complete");
    toast.success("Emergency devotee added to priority queue!");
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case "welcome": return "Welcome - Choose Action";
      case "triage": return "Devotee Assessment";
      case "lookup": return "Find Existing Devotee";
      case "registration": return "New Devotee Registration";
      case "emergency": return "Emergency Registration";
      case "booking": return "Book Appointment";
      case "checkin": return "Check-in Devotee";
      case "manual-checkin": return "Manual Check-in";
      case "complete": return "Process Complete";
      default: return "Reception Desk";
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "welcome":
        return <WelcomeScreen onStepSelect={setCurrentStep} stats={todayStats} />;
      
      case "triage":
        return (
          <TriageAssessmentComponent 
            onComplete={handleTriageComplete}
            onCancel={resetWorkflow}
          />
        );
      
      case "lookup":
        return (
          <UserLookupComponent 
            onComplete={handleLookupComplete}
            onCancel={resetWorkflow}
          />
        );
      
      case "registration":
        return (
          <QuickRegistrationForm 
            onSuccess={handleRegistrationComplete}
            onCancel={resetWorkflow}
            mode={workflowData.assessment?.isEmergency ? "emergency" : "registration"}
          />
        );
      
      case "emergency":
        return (
          <EmergencyQueueEntry 
            onSuccess={handleEmergencyComplete}
            onCancel={resetWorkflow}
          />
        );
      
      case "manual-checkin":
        return <ManualCheckIn />;

      case "complete":
        return <CompletionScreen onReset={resetWorkflow} />;

      case "booking":
        return offlineDevotee ? (
          <SimpleAppointmentBooking
            devoteeInfo={offlineDevotee}
            onSuccess={() => {
              setOfflineDevotee(null);
              setCurrentStep("checkin");
            }}
            onCancel={() => setOfflineDevotee(null)}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Book Appointment (Offline)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <input className="mt-1 w-full border rounded-md px-3 py-2 text-sm" id="offline-name" />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone (optional)</label>
                  <input className="mt-1 w-full border rounded-md px-3 py-2 text-sm" id="offline-phone" />
                </div>
                <div>
                  <label className="text-sm font-medium">Email (optional)</label>
                  <input className="mt-1 w-full border rounded-md px-3 py-2 text-sm" id="offline-email" />
                </div>
                <div>
                  <label className="text-sm font-medium">Age</label>
                  <input type="number" min="0" className="mt-1 w-full border rounded-md px-3 py-2 text-sm" id="offline-age" />
                </div>
                <div>
                  <label className="text-sm font-medium">Gender</label>
                  <select className="mt-1 w-full border rounded-md px-3 py-2 text-sm" id="offline-gender">
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select className="mt-1 w-full border rounded-md px-3 py-2 text-sm" id="offline-category">
                    <option value="WALK_IN">Walk-in</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="FAMILY_MEMBER">Family Member</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => {
                    const name = (document.getElementById('offline-name') as HTMLInputElement)?.value?.trim();
                    if (!name) return;
                    const phone = (document.getElementById('offline-phone') as HTMLInputElement)?.value?.trim();
                    const email = (document.getElementById('offline-email') as HTMLInputElement)?.value?.trim();
                    const ageStr = (document.getElementById('offline-age') as HTMLInputElement)?.value?.trim();
                    const age = ageStr ? parseInt(ageStr, 10) : 0;
                    const gender = ((document.getElementById('offline-gender') as HTMLSelectElement)?.value as 'MALE'|'FEMALE'|'OTHER') || 'OTHER';
                    const userCategory = ((document.getElementById('offline-category') as HTMLSelectElement)?.value as 'WALK_IN'|'EMERGENCY'|'FAMILY_MEMBER') || 'WALK_IN';
                    setOfflineDevotee({ name, phone, email, age: isNaN(age) ? 0 : age, gender, userCategory });
                  }}
                >
                  Continue to Booking
                </Button>
                <Button variant="outline" onClick={() => setCurrentStep('checkin')}>Skip to Check-in</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">After entering basic details, you can select Guruji, date and time.</p>
            </CardContent>
          </Card>
        );
      
      default:
        return <div>Step not implemented yet</div>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reception Dashboard</h1>
          <p className="text-gray-600 mt-1">{getStepTitle()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Clock className="h-3 w-3 mr-1" />
            {formatTime(currentTime)}
          </Badge>
          {currentStep !== "welcome" && (
            <Button variant="outline" onClick={resetWorkflow}>
              Start Over
            </Button>
          )}
        </div>
      </div>

      {/* Workflow Progress */}
      {currentStep !== "welcome" && (
        <Card>
          <CardContent className="py-4">
            <WorkflowProgress currentStep={currentStep} />
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="min-h-[600px]">
        {renderCurrentStep()}
      </div>
    </div>
  );
}

function WelcomeScreen({ onStepSelect, stats }: { 
  onStepSelect: (step: WorkflowStep) => void; 
  stats: {
    totalCheckins: number;
    newRegistrations: number;
    emergencyDevotees: number;
    waitingInQueue: number;
    averageWaitTime: string;
    nextAvailableSlot: string;
  };
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              onClick={() => onStepSelect("triage")}
              className="h-24 flex-col gap-2 text-left"
              variant="outline"
            >
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <div className="font-medium">New Devotee Visit</div>
                <div className="text-sm text-gray-500">Start triage assessment</div>
              </div>
            </Button>

            <Button
              onClick={() => onStepSelect("lookup")}
              className="h-24 flex-col gap-2 text-left"
              variant="outline"
            >
              <Search className="h-8 w-8 text-green-500" />
              <div>
                <div className="font-medium">Find Existing Devotee</div>
                <div className="text-sm text-gray-500">Search by phone/name</div>
              </div>
            </Button>

            <Button
              onClick={() => onStepSelect("manual-checkin")}
              className="h-24 flex-col gap-2 text-left border-green-200 hover:bg-green-50"
              variant="outline"
            >
              <UserCheck className="h-8 w-8 text-green-500" />
              <div>
                <div className="font-medium text-green-700">Manual Check-in</div>
                <div className="text-sm text-green-500">Help with appointment check-in</div>
              </div>
            </Button>

            <Button
              onClick={() => onStepSelect("emergency")}
              className="h-24 flex-col gap-2 text-left border-red-200 hover:bg-red-50"
              variant="outline"
            >
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <div className="font-medium text-red-700">Emergency Devotee</div>
                <div className="text-sm text-red-500">Priority registration</div>
              </div>
            </Button>

            <Button
              onClick={() => onStepSelect("registration")}
              className="h-24 flex-col gap-2 text-left"
              variant="outline"
            >
              <UserPlus className="h-8 w-8 text-purple-500" />
              <div>
                <div className="font-medium">Quick Registration</div>
                <div className="text-sm text-gray-500">New devotee form</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Today&apos;s Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalCheckins}</div>
              <div className="text-sm text-gray-600">Check-ins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.newRegistrations}</div>
              <div className="text-sm text-gray-600">New Devotees</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.emergencyDevotees}</div>
              <div className="text-sm text-gray-600">Emergency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.waitingInQueue}</div>
              <div className="text-sm text-gray-600">In Queue</div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Avg. Wait Time:</span>
              <span className="font-medium">{stats.averageWaitTime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Next Available:</span>
              <span className="font-medium">{stats.nextAvailableSlot}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Self-Service Guide */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Self-Service Options for Tech-Savvy Devotees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <QrCode className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Book Appointment</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Point devotees to the QR code poster for self-booking appointments
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium">Check-in</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Existing appointment holders can scan to check-in automatically
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Phone className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium">Download App</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Share app download link for future self-service
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checked-in Devotees - Full Width */}
      <div className="lg:col-span-3">
        <CheckedInDevotees />
      </div>
    </div>
  );
}

function WorkflowProgress({ currentStep }: { currentStep: WorkflowStep }) {
  const steps = [
    { id: "triage", label: "Assessment", icon: Users },
    { id: "lookup", label: "Lookup", icon: Search },
    { id: "registration", label: "Registration", icon: UserPlus },
    { id: "booking", label: "Booking", icon: Calendar },
    { id: "checkin", label: "Check-in", icon: CheckCircle },
  ];

  const getCurrentStepIndex = () => {
    const stepOrder = ["triage", "lookup", "registration", "booking", "checkin"];
    return stepOrder.indexOf(currentStep);
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = index < currentIndex;

        return (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              isActive ? "bg-blue-100 text-blue-700" :
              isCompleted ? "bg-green-100 text-green-700" :
              "bg-gray-100 text-gray-500"
            }`}>
              <step.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{step.label}</span>
            </div>
            
            {index < steps.length - 1 && (
              <ArrowRight className={`h-4 w-4 mx-2 ${
                isCompleted ? "text-green-500" : "text-gray-300"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CompletionScreen({ onReset }: { onReset: () => void }) {
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <CardTitle>Process Completed!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-gray-600">
          The devotee has been successfully processed and is ready for their consultation.
        </p>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-800">
            Next: Direct the devotee to the waiting area. They will be called when it&apos;s their turn.
          </p>
        </div>

        <Button onClick={onReset} className="w-full">
          Help Next Devotee
        </Button>
      </CardContent>
    </Card>
  );
}
