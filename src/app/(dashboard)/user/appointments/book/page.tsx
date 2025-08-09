"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Calendar, Clock, User, AlertCircle } from "lucide-react";
import {
  bookAppointment,
  getAppointmentAvailability,
} from "@/lib/actions/appointment-actions";
import { getAvailableGurujis } from "@/lib/actions/user-actions";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

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
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [booking, setBooking] = useState(false);
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

  const loadAvailability = useCallback(async () => {
    if (!selectedDate) return;

    try {
      const result = await getAppointmentAvailability({ date: selectedDate });
      if (result.success && result.availability) {
        setTimeSlots(result.availability);
      }
    } catch (error) {
      console.error("Failed to load availability:", error);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate) {
      loadAvailability();
    }
  }, [selectedDate, loadAvailability]);

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime || !selectedGuruji || !reason.trim()) {
      alert("Please fill in all required fields");
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
      alert("Appointment booked successfully!");
      router.push("/user/appointments");
    } catch (error) {
      console.error("Booking error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to book appointment. Please try again.";
      alert(errorMessage);
    } finally {
      setBooking(false);
    }
  };

  const getAvailableGurujisList = () => {
    return gurujis.filter((guruji) => guruji.isAvailable);
  };

  const getAvailableTimeSlots = () => {
    return timeSlots.filter((slot) => slot.available);
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
                onChange={(e) => setSelectedDate(e.target.value)}
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
                  {getAvailableTimeSlots().map((slot) => (
                    <SelectItem key={slot.time} value={slot.time}>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>{slot.time}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </div>
  );
}
