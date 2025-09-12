"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Calendar, Clock, User, AlertCircle, CheckCircle } from "lucide-react";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useAppointmentAvailability } from "@/hooks/queries";
import { createAppointment } from "@/lib/actions/appointment-actions";
import { toast } from "sonner";

// Validation schema
const appointmentSchema = z.object({
  date: z.string().min(1, "Please select a date"),
  time: z.string().min(1, "Please select a time"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  onSuccess?: () => void;
  isLoading?: boolean;
}

// Available time slots for appointments
const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
];

export function AppointmentForm({
  onSuccess,
  isLoading = false,
}: AppointmentFormProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      priority: "NORMAL",
    },
  });

  const watchedDate = watch("date");
  const watchedTime = watch("time");

  // Use React Query for availability data
  const { data: availability } = useAppointmentAvailability(selectedDate);

  // Filter available time slots
  const availableTimeSlots = TIME_SLOTS.filter((slot) => {
    if (!availability) return true;
    const slotData = availability.find(
      (item: { time: string; available: boolean }) => item.time === slot
    );
    return slotData?.available !== false;
  });

  const handleFormSubmit = async (data: AppointmentFormData) => {
    try {
      // Convert data to FormData for Server Action
      const formData = new FormData();
      formData.append("date", data.date);
      formData.append("time", data.time);
      formData.append("reason", data.reason);
      formData.append("priority", data.priority);
      if (data.notes) formData.append("notes", data.notes);

      const result = await createAppointment(formData);

      if (result.success) {
        toast.success("Appointment booked successfully!");
        reset();
        setSelectedDate("");
        onSuccess?.();
      }
    } catch (error) {
      console.error("Appointment booking error:", error);
      toast.error("Failed to book appointment. Please try again.");
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setValue("date", date);
    setValue("time", ""); // Reset time slot when date changes
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Book Appointment with ShivGoraksha Guruji
          </CardTitle>
          <CardDescription>
            Select your preferred date and time for your spiritual consultation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Guruji Info */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">ShivGoraksha Guruji</h3>
                  <p className="text-sm text-muted-foreground">
                    Spiritual Guide and Healer
                  </p>
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="date">Select Date</Label>
              <Input
                type="date"
                {...register("date")}
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
              {errors.date && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.date.message}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Time Slot Selection */}
            {watchedDate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="time">Select Time Slot</Label>
                {availableTimeSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {availableTimeSlots.map((slot) => (
                      <Button
                        key={slot}
                        type="button"
                        variant={watchedTime === slot ? "default" : "outline"}
                        onClick={() => setValue("time", slot)}
                        className="h-12"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        {slot}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No available time slots for this date. Please select
                      another date.
                    </AlertDescription>
                  </Alert>
                )}
                {errors.time && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.time.message}</AlertDescription>
                  </Alert>
                )}
              </motion.div>
            )}

            {/* Priority Selection */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level</Label>
              <Select
                value={watch("priority")}
                onValueChange={(value) =>
                  setValue(
                    "priority",
                    value as "LOW" | "NORMAL" | "HIGH" | "URGENT"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">
                    <div className="flex items-center gap-2">
                      <StatusBadge value="LOW" type="priority" />
                      Low Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="NORMAL">
                    <div className="flex items-center gap-2">
                      <StatusBadge value="NORMAL" type="priority" />
                      Normal Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="HIGH">
                    <div className="flex items-center gap-2">
                      <StatusBadge value="HIGH" type="priority" />
                      High Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="URGENT">
                    <div className="flex items-center gap-2">
                      <StatusBadge value="URGENT" type="priority" />
                      Urgent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Consultation Reason</Label>
              <Textarea
                {...register("reason")}
                placeholder="Please describe the reason for your consultation..."
                rows={3}
              />
              {errors.reason && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.reason.message}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                {...register("notes")}
                placeholder="Any additional information you'd like to share..."
                rows={2}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Booking Appointment...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Book Appointment
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
