import { Suspense } from 'react';
import NotificationViewModalClient from './client-component';

interface NotificationViewModalProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NotificationViewModal({ params }: NotificationViewModalProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotificationViewModalClient notificationId={id} />
    </Suspense>
  );
}