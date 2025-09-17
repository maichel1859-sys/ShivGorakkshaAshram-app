'use server';

import { cancelAppointment } from '@/lib/actions/appointment-actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';

export async function cancelAppointmentAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  const appointmentId = formData.get("appointmentId") as string;
  const reason = formData.get("reason") as string || "Cancelled by user";
  
  if (appointmentId) {
    try {
      await cancelAppointment(appointmentId, reason);
      return { success: true, message: 'Appointment cancelled successfully' };
    } catch (error) {
      console.error('Cancel appointment action error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel appointment' };
    }
  }
  
  return { success: false, error: 'Appointment ID is required' };
}