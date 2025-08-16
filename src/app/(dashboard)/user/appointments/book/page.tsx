"use client";

import { useState } from "react";
// import { useEffect, useCallback } from "react"; // Temporarily unused
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar, Clock, User, AlertCircle, Loader2, CheckCircle, XCircle } from "lucide-react";
import {
  bookAppointment,
} from "@/lib/actions/appointment-actions";
import { getAvailableGurujis } from "@/lib/actions/user-actions";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAppointmentAvailability } from "@/hooks/queries/use-appointments";

interface TimeSlot {
  time: string;
  available: boolean;
  gurujiId?: string;
}

export default function BookAppointmentPage() {
  const [selectedDate, setSelectedDate] = useState("");
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
  const { data: availability, isLoading: availabilityLoading, error: availabilityError } = useAppointmentAvailability(selectedDate);
  
  // Debug logging
  console.log('Booking page state:', {
    selectedDate,
    availability,
    availabilityLoading,
    availabilityError,
    gurujis: gurujis.length
  });

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime || !selectedGuruji || !reason.trim()) {
      setModalMessage("Please fill in all required fields");
      setShowErrorModal(true);
      return;
    }

    setBooking(true);
    try {
      const formData = new FormData();
      formData.append("date", selectedDate);
      formData.append("time", selectedTime);
      formData.append("gurujiId", selectedGuruji);
      formData.append("reason", reason);

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
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Book Appointment</h1>
        <p className="text-muted-foreground">
          Schedule your consultation with our experienced gurujis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Appointment Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
                             <Input
                 id="date"
                 type="date"
                 value={selectedDate}
                 onChange={(e) => {
                   console.log('Date selected:', e.target.value);
                   setSelectedDate(e.target.value);
                 }}
                 min={new Date().toISOString().split("T")[0]}
               />
            </div>

            {/* Guruji Selection */}
            <div className="space-y-2">
              <Label htmlFor="guruji">Select Guruji</Label>
              <Select value={selectedGuruji} onValueChange={setSelectedGuruji}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a guruji" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableGurujisList().map((guruji) => (
                    <SelectItem key={guruji.id} value={guruji.id}>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{guruji.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {typeof guruji.specialization === "string"
                              ? guruji.specialization
                              : "General Consultation"}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

                        {/* Time Selection */}
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a time slot" />
                </SelectTrigger>
                <SelectContent>
                  {availabilityLoading ? (
                    <SelectItem value="loading" disabled>
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading time slots...</span>
                      </div>
                    </SelectItem>
                  ) : availabilityError ? (
                    <SelectItem value="error" disabled>
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>Error loading time slots</span>
                      </div>
                    </SelectItem>
                  ) : getAvailableTimeSlots().length === 0 ? (
                    <SelectItem value="no-slots" disabled>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>No available slots</span>
                      </div>
                    </SelectItem>
                  ) : (
                    getAvailableTimeSlots().map((slot) => (
                      <SelectItem key={slot.time} value={slot.time}>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>{slot.time}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedDate && !availabilityLoading && (
                <p className="text-xs text-muted-foreground">
                  {getAvailableTimeSlots().length} available slots for {selectedDate}
                </p>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Visit</Label>
              <Textarea
                id="reason"
                placeholder="Describe your symptoms or reason for consultation"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            {/* Book Button */}
            <Button
              onClick={handleBookAppointment}
              disabled={
                booking ||
                !selectedDate ||
                !selectedTime ||
                !selectedGuruji ||
                !reason.trim()
              }
              className="w-full"
            >
              {booking ? "Booking..." : "Book Appointment"}
            </Button>
          </CardContent>
        </Card>

        {/* Available Gurujis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Available Gurujis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gurujisLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading gurujis...</p>
              </div>
            ) : getAvailableGurujisList().length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No gurujis available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getAvailableGurujisList().map((guruji) => (
                  <div
                    key={guruji.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedGuruji === guruji.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedGuruji(guruji.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{guruji.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {typeof guruji.specialization === "string"
                            ? guruji.specialization
                            : "General Consultation"}
                        </p>
                      </div>
                      {selectedGuruji === guruji.id && (
                        <div className="w-4 h-4 bg-primary rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Debug Info */}
      {selectedDate && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Selected Date:</strong> {selectedDate}</p>
              <p><strong>Loading:</strong> {availabilityLoading ? 'Yes' : 'No'}</p>
              <p><strong>Error:</strong> {availabilityError ? 'Yes' : 'No'}</p>
              <p><strong>Total Time Slots:</strong> {availability ? availability.length : 0}</p>
              <p><strong>Available Time Slots:</strong> {getAvailableTimeSlots().length}</p>
              <p><strong>All Time Slots:</strong></p>
              <div className="grid grid-cols-4 gap-2">
                {availability ? availability.map((slot: TimeSlot) => (
                  <div key={slot.time} className={`p-2 text-xs rounded ${slot.available ? 'bg-green-100' : 'bg-red-100'}`}>
                    {slot.time} ({slot.available ? 'Available' : 'Booked'})
                  </div>
                )) : (
                  <p>No availability data</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Booking Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Before Your Appointment</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Arrive 10 minutes early</li>
                <li>• Bring any relevant medical records</li>
                <li>• Prepare a list of symptoms</li>
                <li>• Wear comfortable clothing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">What to Expect</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Consultation duration: 30-45 minutes</li>
                <li>• Digital remedy prescription</li>
                <li>• Follow-up appointment scheduling</li>
                <li>• Health recommendations</li>
              </ul>
            </div>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> You can reschedule or cancel your
              appointment up to 24 hours before the scheduled time. For urgent
              changes, please contact the reception.
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
              <span>Booking Confirmed</span>
            </DialogTitle>
            <DialogDescription>
              {modalMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
              <div className="space-y-2">
                <p className="text-sm font-medium">Appointment Details:</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Date:</strong> {selectedDate}</p>
                  <p><strong>Time:</strong> {selectedTime}</p>
                  <p><strong>Guruji:</strong> {gurujis.find(g => g.id === selectedGuruji)?.name}</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              You will be redirected to your appointments page where you can view and manage this appointment.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleSuccessModalClose} className="w-full">
              View My Appointments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <XCircle className="h-6 w-6 text-red-600" />
              <span>Booking Failed</span>
            </DialogTitle>
            <DialogDescription>
              {modalMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">
              Please check your selection and try again. If the problem persists, contact support.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleErrorModalClose} variant="outline" className="w-full">
              Try Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
