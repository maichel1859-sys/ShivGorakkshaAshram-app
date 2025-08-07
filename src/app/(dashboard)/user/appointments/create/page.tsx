import { redirect } from 'next/navigation';

export default function CreateAppointmentPage() {
  redirect('/user/appointments');
}