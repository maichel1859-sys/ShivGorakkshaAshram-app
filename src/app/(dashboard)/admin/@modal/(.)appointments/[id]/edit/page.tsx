import { Suspense } from 'react';
import AppointmentEditModalClient from './client-component';

interface AppointmentEditModalProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AppointmentEditModal({ params }: AppointmentEditModalProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AppointmentEditModalClient appointmentId={id} />
    </Suspense>
  );
}