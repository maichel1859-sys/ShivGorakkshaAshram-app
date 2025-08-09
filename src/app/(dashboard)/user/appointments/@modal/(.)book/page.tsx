import { Suspense } from "react";
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function BookAppointmentModal() {
  return (
    <Dialog open>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Book New Appointment</DialogTitle>
        </DialogHeader>
        <Suspense fallback={<div>Loading...</div>}>
          <AppointmentForm />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}
