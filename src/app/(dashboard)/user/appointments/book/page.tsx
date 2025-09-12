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
import { User, AlertCircle, Loader2, CheckCircle, XCircle } from "lucide-react";
import { bookAppointment } from "@/lib/actions/appointment-actions";
import { getAvailableGurujis } from "@/lib/actions/user-actions";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAppointmentAvailability } from "@/hooks/queries/use-appointments";
import AppointmentForm from "@/components/forms/AppointmentForm";
import { convertTimeTo24Hour, formatDateForAPI } from "@/lib/utils/helpers";

interface TimeSlot {
  time: string;
  available: boolean;
  gurujiId?: string;
}

export default function BookAppointmentPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedGuruji, setSelectedGuruji] = useState("");
  const [reason, setReason] = useState("");
  const [booking, setBooking] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const router = useRouter();

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

  // Debug logging - only in development
  if (process.env.NODE_ENV === "development") {
    console.log("Booking page state:", {
      selectedDate,
      availability,
      availabilityLoading,
      availabilityError,
      gurujis: gurujis.length,
    });
  }

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime || !selectedGuruji || !reason.trim()) {
      setModalMessage("Please fill in all required fields");
      setShowErrorModal(true);
      return;
    }

    setBooking(true);
    try {
      const formData = new FormData();
      formData.append("date", formatDateForAPI(selectedDate));
      // Convert time from 12-hour format (9:00 AM) to 24-hour format (09:00)
      const time24Hour = convertTimeTo24Hour(selectedTime);
      formData.append("time", time24Hour);
      formData.append("gurujiId", selectedGuruji);
      formData.append("reason", reason);

      console.log("Booking with time format:", {
        original: selectedTime,
        converted: time24Hour,
      });
      await bookAppointment(formData);
      setModalMessage("Your appointment has been booked successfully!");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Booking error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to book appointment. Please try again.";
      setModalMessage(errorMessage);
      setShowErrorModal(true);
    } finally {
      setBooking(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    router.push("/user/appointments");
  };

  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    setModalMessage("");
  };

  const getAvailableGurujisList = () => {
    return gurujis.filter((guruji) => guruji.isAvailable);
  };

  const getAvailableTimeSlots = () => {
    if (!availability) return [];
    return availability.filter((slot: TimeSlot) => slot.available);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
          Book Appointment
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Schedule your consultation with our experienced gurujis
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
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
        <Card className="rounded-xl !gap-1">
          <CardHeader className="rounded-t-xl ">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <User className="h-5 w-5" />
              <span>Available Gurujis</span>
              <span className="ml-auto text-sm text-muted-foreground">
                {getAvailableGurujisList().length} available
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
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
              <div className="space-y-2 sm:space-y-3">
                {getAvailableGurujisList().map((guruji) => (
                  <div
                    key={guruji.id}
                    className={`p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      selectedGuruji === guruji.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                    }`}
                    onClick={() => setSelectedGuruji(guruji.id)}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                          selectedGuruji === guruji.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        <User className="h-5 w-5 sm:h-6 sm:w-6" />
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
                        <div className="flex items-center mt-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          <span className="text-xs text-green-600 dark:text-green-400">
                            Available
                          </span>
                        </div>
                      </div>
                      {selectedGuruji === guruji.id && (
                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
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

      {/* Debug Info - Only in Development */}
      {process.env.NODE_ENV === "development" && selectedDate && (
        <Card className="mt-4 sm:mt-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20 rounded-xl">
          <CardHeader className="rounded-t-xl pb-4">
            <CardTitle className="text-orange-800 dark:text-orange-200 text-lg">
              🔧 Debug Information (Dev Only)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-2 text-sm">
              <p>
                <strong>Selected Date:</strong>{" "}
                {selectedDate
                  ? selectedDate.toISOString().split("T")[0]
                  : "None"}
              </p>
              <p>
                <strong>Loading:</strong> {availabilityLoading ? "Yes" : "No"}
              </p>
              <p>
                <strong>Error:</strong> {availabilityError ? "Yes" : "No"}
              </p>
              <p>
                <strong>Total Time Slots:</strong>{" "}
                {availability ? availability.length : 0}
              </p>
              <p>
                <strong>Available Time Slots:</strong>{" "}
                {getAvailableTimeSlots().length}
              </p>
              <p>
                <strong>All Time Slots:</strong>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {availability ? (
                  availability.map((slot: TimeSlot) => (
                    <div
                      key={slot.time}
                      className={`p-2 text-xs rounded-xl ${
                        slot.available
                          ? "bg-green-100 dark:bg-green-900"
                          : "bg-red-100 dark:bg-red-900"
                      }`}
                    >
                      <div className="truncate">{slot.time}</div>
                      <div className="text-xs opacity-75">
                        {slot.available ? "Available" : "Booked"}
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No availability data</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="mt-4 sm:mt-6 rounded-xl">
        <CardHeader className="rounded-t-xl pb-4">
          <CardTitle className="text-lg">Booking Instructions</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <h4 className="font-medium mb-2 text-sm sm:text-base">
                Before Your Appointment
              </h4>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                <li>• Arrive 2 minutes early</li>
                <li>
                  • <strong>Scan QR code at reception to confirm</strong>
                </li>
                <li>• Bring any relevant medical records</li>
                <li>• Prepare a list of symptoms</li>
                <li>• Wear comfortable clothing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-sm sm:text-base">
                What to Expect
              </h4>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                <li>• Consultation duration: 5 minutes</li>
                <li>• Digital remedy prescription</li>
                <li>• Follow-up appointment scheduling</li>
                <li>• Health recommendations</li>
              </ul>
            </div>
          </div>
          <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl">
            <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
              <strong>Important:</strong> Your appointment is not confirmed
              until you scan the QR code at the ashram. You can reschedule or
              cancel up to 24 hours before the scheduled time. For urgent
              changes, please contact reception.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <span>Booking Confirmed</span>
            </DialogTitle>
            <DialogDescription>{modalMessage}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-xl">
              <div className="space-y-2">
                <p className="text-sm font-medium">Appointment Details:</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <strong>Date:</strong>{" "}
                    {selectedDate ? selectedDate.toLocaleDateString() : "N/A"}
                  </p>
                  <p>
                    <strong>Time:</strong> {selectedTime}
                  </p>
                  <p>
                    <strong>Guruji:</strong>{" "}
                    {gurujis.find((g) => g.id === selectedGuruji)?.name ||
                      "Unknown"}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-xl">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">
                📍 Important: To confirm your appointment and join the queue
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                You must scan the QR code at the ashram reception when you
                arrive. Without scanning the QR code, you won&apos;t be added to
                the consultation queue.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              You will be redirected to your appointments page where you can
              view and manage this appointment.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSuccessModalClose}
              className="w-full rounded-xl"
            >
              View My Appointments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <XCircle className="h-6 w-6 text-red-600" />
              <span>Booking Failed</span>
            </DialogTitle>
            <DialogDescription>{modalMessage}</DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-300">
              Please check your selection and try again. If the problem
              persists, contact support.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={handleErrorModalClose}
              variant="outline"
              className="w-full rounded-xl"
            >
              Try Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
