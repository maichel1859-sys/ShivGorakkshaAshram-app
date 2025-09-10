import { redirect } from 'next/navigation';

interface EditAppointmentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditAppointmentPage({ params }: EditAppointmentPageProps) {
  const resolvedParams = await params;
  console.log('Redirecting from appointment edit:', resolvedParams.id);
  redirect(`/admin/appointments`);
}