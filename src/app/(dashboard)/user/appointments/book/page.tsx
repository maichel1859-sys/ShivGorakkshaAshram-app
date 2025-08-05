"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard/layout";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar as CalendarIcon,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

const appointmentSchema = z.object({
  gurujiId: z.string().min(1, "Please select a Guruji"),
  date: z.string().min(1, "Please select a date"),
  time: z.string().min(1, "Please select a time"),
  reason: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  isRecurring: z.boolean().default(false),
  recurringPattern: z
    .object({
      frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
      interval: z.number().min(1).max(12).optional(),
      endDate: z.string().optional(),
    })
    .optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

// Guruji data will be fetched from API
interface GurujiData {
  id: string;
  name: string;
  specialization?: string;
  isActive: boolean;
}

const timeSlots = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
];

export default function BookAppointmentPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [gurujis, setGurujis] = useState<GurujiData[]>([]);
  const [loadingGurujis, setLoadingGurujis] = useState(true);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      priority: "NORMAL",
      isRecurring: false,
    },
  });

  const isRecurring = watch("isRecurring");

  // Fetch Gurujis on component mount
  useEffect(() => {
    const fetchGurujis = async () => {
      try {
        setLoadingGurujis(true);
        const response = await fetch('/api/users?role=GURUJI&active=true');
        if (!response.ok) {
          throw new Error('Failed to fetch Gurujis');
        }
        const data = await response.json();
        setGurujis(data.users || []);
      } catch (error) {
        console.error('Error fetching Gurujis:', error);
        toast.error('Failed to load Gurujis. Please refresh the page.');
      } finally {
        setLoadingGurujis(false);
      }
    };

    fetchGurujis();
  }, []);

  const onSubmit = async (data: AppointmentFormData) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to book appointment");
      }

      toast.success("Appointment booked successfully!");
      router.push("/user/appointments");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to book appointment";
      toast.error(errorMessage);
      console.error("Booking error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout title="Book Appointment" allowedRoles={["USER"]}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Book New Appointment
          </h2>
          <p className="text-muted-foreground">
            Schedule your consultation with our experienced Gurujis
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Appointment Details</span>
            </CardTitle>
            <CardDescription>
              Fill in the details for your consultation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Guruji Selection */}
              <div className="space-y-2">
                <Label htmlFor="guruji">Select Guruji</Label>
                <Select onValueChange={(value) => setValue("gurujiId", value)} disabled={loadingGurujis}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingGurujis ? "Loading Gurujis..." : "Choose your preferred Guruji"} />
                  </SelectTrigger>
                  <SelectContent>
                    {gurujis.map((guruji) => (
                      <SelectItem
                        key={guruji.id}
                        value={guruji.id}
                        disabled={!guruji.isActive}
                      >
                        <div className="flex flex-col">
                          <span
                            className={
                              !guruji.isActive ? "text-muted-foreground" : ""
                            }
                          >
                            {guruji.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {guruji.specialization || 'Spiritual Guidance'}
                            {!guruji.isActive && " - Currently unavailable"}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.gurujiId && (
                  <p className="text-sm text-destructive">
                    {errors.gurujiId.message}
                  </p>
                )}
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Preferred Date</Label>
                  <Input
                    id="date"
                    type="date"
                    min={format(new Date(), "yyyy-MM-dd")}
                    {...register("date")}
                  />
                  {errors.date && (
                    <p className="text-sm text-destructive">
                      {errors.date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Preferred Time</Label>
                  <Select onValueChange={(value) => setValue("time", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.time && (
                    <p className="text-sm text-destructive">
                      {errors.time.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level</Label>
                <Select
                  defaultValue="NORMAL"
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
                      Low - General consultation
                    </SelectItem>
                    <SelectItem value="NORMAL">
                      Normal - Regular appointment
                    </SelectItem>
                    <SelectItem value="HIGH">
                      High - Important matter
                    </SelectItem>
                    <SelectItem value="URGENT">
                      Urgent - Immediate attention needed
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.priority && (
                  <p className="text-sm text-destructive">
                    {errors.priority.message}
                  </p>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">
                  Reason for Consultation (Optional)
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Briefly describe the purpose of your visit..."
                  className="min-h-[100px]"
                  {...register("reason")}
                />
                {errors.reason && (
                  <p className="text-sm text-destructive">
                    {errors.reason.message}
                  </p>
                )}
              </div>

              {/* Recurring Appointment */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recurring"
                    checked={isRecurring}
                    onCheckedChange={(checked) => {
                      setValue("isRecurring", checked as boolean);
                      setShowRecurring(checked as boolean);
                    }}
                  />
                  <Label htmlFor="recurring" className="text-sm font-medium">
                    Make this a recurring appointment
                  </Label>
                </div>

                {showRecurring && (
                  <Card className="p-4 border-dashed">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        <span>
                          Set up recurring pattern for regular consultations
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="frequency">Frequency</Label>
                          <Select
                            onValueChange={(value) =>
                              setValue(
                                "recurringPattern.frequency",
                                value as "weekly" | "monthly"
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="interval">Every</Label>
                          <Select
                            onValueChange={(value) =>
                              setValue(
                                "recurringPattern.interval",
                                parseInt(value)
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Interval" />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 6, 8, 12].map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num} {num === 1 ? "time" : "times"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="endDate">End Date</Label>
                          <Input
                            type="date"
                            min={format(new Date(), "yyyy-MM-dd")}
                            onChange={(e) =>
                              setValue(
                                "recurringPattern.endDate",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Book Appointment
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              <span>Important Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Please arrive 10 minutes before your scheduled appointment</p>
            <p>
              • You can reschedule or cancel up to 2 hours before the
              appointment
            </p>
            <p>
              • High priority appointments may be scheduled sooner based on
              availability
            </p>
            <p>
              • You will receive a confirmation email with QR code for check-in
            </p>
            <p>
              • Recurring appointments can be modified or cancelled individually
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
