import { redirect } from 'next/navigation';

interface EditAppointmentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditAppointmentPage({ params }: EditAppointmentPageProps) {
  await params;
  redirect(`/admin/appointments`);
}