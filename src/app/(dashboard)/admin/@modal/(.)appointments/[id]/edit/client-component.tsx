"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { updateAppointment } from "@/lib/actions";
import { useAppointment } from "@/hooks/queries/use-appointments";
import { toast } from "sonner";

const editAppointmentSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"], {
    required_error: "Please select a status",
  }),
  notes: z.string().optional(),
});

type EditAppointmentForm = z.infer<typeof editAppointmentSchema>;

interface AppointmentEditModalClientProps {
  appointmentId: string;
}

export default function AppointmentEditModalClient({
  appointmentId,
}: AppointmentEditModalClientProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Use React Query to fetch appointment data
  const { data: appointment, isLoading, error } = useAppointment(appointmentId);

  const form = useForm<EditAppointmentForm>({
    resolver: zodResolver(editAppointmentSchema),
  });

  // Update form when appointment data is loaded
  useEffect(() => {
    if (appointment) {
      const appointmentDate = new Date(appointment.date);
      const startTime = new Date(appointment.startTime);
      form.reset({
        date: appointmentDate.toISOString().split("T")[0],
        time: startTime.toTimeString().slice(0, 5),
        status: appointment.status as
          | "PENDING"
          | "CONFIRMED"
          | "COMPLETED"
          | "CANCELLED",
        notes: appointment.notes || "",
      });
    }
  }, [appointment, form]);

  const handleClose = () => {
    setIsOpen(false);
    router.back();
  };

  const onSubmit = (data: EditAppointmentForm) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("id", appointmentId);
        formData.append("date", data.date);
        formData.append("time", data.time);
        formData.append("status", data.status);
        if (data.notes) {
          formData.append("notes", data.notes);
        }

        const result = await updateAppointment(appointmentId, formData);
        if (result.success) {
          toast.success("Appointment updated successfully");
          handleClose();
        } else {
          toast.error(result.error || "Failed to update appointment");
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update appointment"
        );
      }
    });
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading appointment...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !appointment) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="text-center p-6">
            <p className="text-muted-foreground">
              {error?.message || "Appointment not found"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
          <DialogDescription>
            Update appointment details for{" "}
            {appointment.user?.name || "Unknown User"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Appointment
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
