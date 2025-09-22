"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  ArrowLeft,
  User,
  CheckCircle,
  Loader2,
  AlertCircle,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { getAvailableGurujis } from "@/lib/actions/user-actions";
import { createOfflineAppointment } from "@/lib/actions/appointment-actions";
import { useQuery } from "@tanstack/react-query";
import { useAppointmentAvailability } from "@/hooks/queries/use-appointments";
import AppointmentForm from "@/components/forms/AppointmentForm";
import { convertTimeTo24Hour, formatDateForAPI } from "@/lib/utils/helpers";

interface BookingResult {
  appointment: {
    devoteeName: string;
    gurujiName: string;
    date: string;
  };
  queueEntry: {
    position: number;
    estimatedWait: number;
  };
}

interface SimpleAppointmentBookingProps {
  devoteeInfo: {
    id?: string;
    name: string;
    age: number;
    gender: "MALE" | "FEMALE" | "OTHER";
    phone?: string;
    email?: string;
    userCategory: "WALK_IN" | "EMERGENCY" | "FAMILY_MEMBER";
  };
  onSuccess: (appointment: BookingResult["appointment"]) => void;
  onCancel: () => void;
}

export function SimpleAppointmentBooking({
  devoteeInfo,
  onSuccess,
  onCancel,
}: SimpleAppointmentBookingProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedGuruji, setSelectedGuruji] = useState("");
  const [reason, setReason] = useState("");
  const [booking, setBooking] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(
    null
  );

  // Fetch available gurujis using TanStack Query with Server Action
  const { data: gurujisData, isLoading: gurujisLoading } = useQuery({
    queryKey: ["gurujis"],
    queryFn: async () => {
      const result = await getAvailableGurujis();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch gurujis");
      }
      return result.gurujis;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const gurujis = gurujisData || [];

  // Use the appointment availability hook
  const {
    data: availability,
    isLoading: availabilityLoading,
    error: availabilityError,
  } = useAppointmentAvailability(
    selectedDate ? selectedDate.toISOString().split("T")[0] : ""
  );

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime || !selectedGuruji) {
      toast.error("Please select a Guruji, date, and time.");
      return;
    }

    setBooking(true);
    try {
      const formData = new FormData();
      formData.append("devoteeName", devoteeInfo.name);
      formData.append("devoteePhone", devoteeInfo.phone || "");
      formData.append("devoteeEmail", devoteeInfo.email || "");
      formData.append("gurujiId", selectedGuruji);
      formData.append("date", formatDateForAPI(selectedDate));
      const time24Hour = convertTimeTo24Hour(selectedTime);
      formData.append("startTime", time24Hour);
      formData.append("reason", reason);
      formData.append(
        "priority",
        devoteeInfo.userCategory === "EMERGENCY" ? "URGENT" : "NORMAL"
      );
      formData.append(
        "notes",
        `Booked by coordinator for offline user. Category: ${devoteeInfo.userCategory}`
      );

      const result = await createOfflineAppointment(formData);

      if (result.success && result.appointment && result.queueEntry) {
        setBookingResult({
          appointment: {
            devoteeName:
              (result.appointment as { devoteeName?: string }).devoteeName ||
              "",
            gurujiName:
              (result.appointment as { gurujiName?: string }).gurujiName || "",
            date: (result.appointment as { date: string }).date,
          },
          queueEntry: {
            position: (result.queueEntry as { position: number }).position,
            estimatedWait: (result.queueEntry as { estimatedWait: number })
              .estimatedWait,
          },
        });
        setShowSuccessModal(true);
        toast.success(
          "Appointment booked successfully! Offline user added to queue."
        );
      } else {
        toast.error(result.error || "Failed to book appointment");
      }
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("Failed to book appointment. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  const getAvailableGurujisList = () => {
    return gurujis.filter((guruji) => guruji.isAvailable);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Book Appointment for Offline User
          </h1>
          <p className="text-gray-600 mt-1">
            Schedule consultation for offline devotee
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Offline User Info Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-500" />
            Offline User Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">Name:</span>
              <span className="font-semibold">{devoteeInfo.name}</span>
            </div>
            {devoteeInfo.phone && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-medium">Phone:</span>
                <span>{devoteeInfo.phone}</span>
              </div>
            )}
            {devoteeInfo.email && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-medium">Email:</span>
                <span>{devoteeInfo.email}</span>
              </div>
            )}
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <strong>Note:</strong> This offline user will be automatically
              added to the queue after booking
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Booking Form */}
        <AppointmentForm
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedTime={selectedTime}
          setSelectedTime={setSelectedTime}
          selectedGuruji={selectedGuruji}
          setSelectedGuruji={setSelectedGuruji}
          reason={reason}
          setReason={setReason}
          gurujis={gurujis}
          gurujisLoading={gurujisLoading}
          availability={availability}
          availabilityLoading={availabilityLoading}
          availabilityError={availabilityError}
          onBookAppointment={handleBookAppointment}
          booking={booking}
        />

        {/* Available Gurujis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-xl">
              <User className="h-5 w-5 text-green-500" />
              <span>Available Gurujis</span>
              <span className="ml-auto text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {getAvailableGurujisList().length} available
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gurujisLoading ? (
              <div className="text-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Loading gurujis...
                </p>
              </div>
            ) : getAvailableGurujisList().length === 0 ? (
              <div className="text-center py-6">
                <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No gurujis available at the moment
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please check back later
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {getAvailableGurujisList().map((guruji) => (
                  <div
                    key={guruji.id}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                      selectedGuruji === guruji.id
                        ? "border-blue-500 bg-blue-50 shadow-lg"
                        : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedGuruji(guruji.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          selectedGuruji === guruji.id
                            ? "bg-blue-500 text-white shadow-lg"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <User className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base truncate">
                          {guruji.name || "Unknown"}
                        </h4>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {typeof guruji.specialization === "string"
                            ? guruji.specialization
                            : "General Consultation"}
                        </p>
                        <div className="flex items-center mt-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          <span className="text-xs text-green-600 font-medium">
                            Available
                          </span>
                        </div>
                      </div>
                      {selectedGuruji === guruji.id && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            Booking Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">For the Offline User</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Arrive 2 minutes early</li>
                <li>
                  • <strong>Wait for their turn in the queue</strong>
                </li>
                <li>• Guruji will call them by name</li>
                <li>• Prepare a list of symptoms</li>
                <li>• Wear comfortable clothing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">What to Expect</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Consultation duration: 5 minutes</li>
                <li>• Digital remedy prescription</li>
                <li>• Follow-up appointment scheduling</li>
                <li>• Health recommendations</li>
              </ul>
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <strong>Important:</strong> The offline user will be automatically
              added to the queue after booking. They should arrive at the
              scheduled time and wait for their turn.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <span>Appointment Booked Successfully!</span>
            </DialogTitle>
            <DialogDescription>
              The offline user has been added to the queue and will be notified
              when it&apos;s their turn.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {bookingResult && (
              <>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Appointment Details:</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <strong>Devotee:</strong>{" "}
                        {bookingResult.appointment.devoteeName}
                      </p>
                      <p>
                        <strong>Guruji:</strong>{" "}
                        {bookingResult.appointment.gurujiName}
                      </p>
                      <p>
                        <strong>Date:</strong>{" "}
                        {new Date(
                          bookingResult.appointment.date
                        ).toLocaleDateString()}
                      </p>
                      <p>
                        <strong>Time:</strong> {selectedTime}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      Queue Information:
                    </p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <strong>Position:</strong> #
                        {bookingResult.queueEntry.position}
                      </p>
                      <p>
                        <strong>Estimated Wait:</strong>{" "}
                        {bookingResult.queueEntry.estimatedWait} minutes
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        <span className="text-green-600 font-medium">
                          Waiting in Queue
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    <strong>Important:</strong> The offline user should arrive
                    at the scheduled time and wait for their turn. The Guruji
                    will be notified of their presence in the queue.
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                if (bookingResult?.appointment) {
                  onSuccess(bookingResult.appointment);
                }
              }}
              className="w-full"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
