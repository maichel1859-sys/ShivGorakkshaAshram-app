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
import toast from "react-hot-toast";

// Validation schema
const appointmentSchema = z.object({
  gurujiId: z.string().min(1, "Please select a Guruji"),
  date: z.string().min(1, "Please select a date"),
  timeSlot: z.string().min(1, "Please select a time slot"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  notes: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface Guruji {
  id: string;
  name: string;
  specialization: string;
  availableSlots: string[];
}

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
  gurujiId: string;
}

interface AppointmentFormProps {
  gurujis: Guruji[];
  timeSlots: TimeSlot[];
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  isLoading?: boolean;
}

export function AppointmentForm({
  gurujis,
  timeSlots,
  onSubmit,
  isLoading = false,
}: AppointmentFormProps) {
  const [selectedGuruji, setSelectedGuruji] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isRecurring, setIsRecurring] = useState(false);

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
      isRecurring: false,
    },
  });

  const watchedGuruji = watch("gurujiId");
  const watchedDate = watch("date");

  // Filter time slots based on selected guruji and date
  const availableTimeSlots = timeSlots.filter(
    (slot) => slot.gurujiId === watchedGuruji && slot.available
  );

  const handleFormSubmit = async (data: AppointmentFormData) => {
    try {
      await onSubmit(data);
      toast.success("Appointment booked successfully!");
      reset();
      setSelectedGuruji("");
      setSelectedDate("");
      setIsRecurring(false);
    } catch {
      toast.error("Failed to book appointment. Please try again.");
    }
  };

  const handleGurujiChange = (gurujiId: string) => {
    setSelectedGuruji(gurujiId);
    setValue("gurujiId", gurujiId);
    setValue("timeSlot", ""); // Reset time slot when guruji changes
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setValue("date", date);
    setValue("timeSlot", ""); // Reset time slot when date changes
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
            Book Appointment
          </CardTitle>
          <CardDescription>
            Select your preferred Guruji, date, and time for your consultation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Guruji Selection */}
            <div className="space-y-2">
              <Label htmlFor="gurujiId">Select Guruji</Label>
              <Select value={selectedGuruji} onValueChange={handleGurujiChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a Guruji" />
                </SelectTrigger>
                <SelectContent>
                  {gurujis.map((guruji) => (
                    <SelectItem key={guruji.id} value={guruji.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{guruji.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {guruji.specialization}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.gurujiId && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.gurujiId.message}</AlertDescription>
                </Alert>
              )}
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
            {watchedGuruji && watchedDate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="timeSlot">Select Time Slot</Label>
                <div className="grid grid-cols-3 gap-2">
                  {availableTimeSlots.map((slot) => (
                    <Button
                      key={slot.id}
                      type="button"
                      variant={
                        watch("timeSlot") === slot.id ? "default" : "outline"
                      }
                      onClick={() => setValue("timeSlot", slot.id)}
                      className="h-12"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {slot.time}
                    </Button>
                  ))}
                </div>
                {errors.timeSlot && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {errors.timeSlot.message}
                    </AlertDescription>
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

            {/* Recurring Appointment */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isRecurring"
                {...register("isRecurring")}
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isRecurring">
                Make this a recurring appointment
              </Label>
            </div>

            {isRecurring && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="recurringPattern">Recurring Pattern</Label>
                <Select
                  value={watch("recurringPattern")}
                  onValueChange={(value) => setValue("recurringPattern", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>
            )}

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
