'use server';

import { cancelAppointment } from '@/lib/actions/appointment-actions';

export async function cancelAppointmentAction(formData: FormData) {
  const appointmentId = formData.get("appointmentId") as string;
  if (appointmentId) {
    await cancelAppointment(appointmentId, "Cancelled by user");
  }
}