import { Metadata } from 'next';
import { Suspense } from 'react';
import { AppointmentList } from '@/components/server/appointment-list';
import { DashboardStats } from '@/components/server/dashboard-stats';
import { AppointmentManager } from '@/components/client/appointment-manager';
import { TranslatedText } from '@/components/client/translated-text';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, QrCode } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'My Appointments',
  description: 'View and manage your spiritual consultation appointments at Shivgoraksha Ashram',
  keywords: ['appointments', 'consultations', 'spiritual guidance', 'shivgoraksha ashram'],
  openGraph: {
    title: 'My Appointments - Shivgoraksha Ashram',
    description: 'View and manage your spiritual consultation appointments',
    type: 'website',
  },
};

export default function AppointmentsPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <TranslatedText
            as="h1"
            translationKey="nav.appointments"
            fallback="My Appointments"
            className="text-3xl font-bold tracking-tight"
          />
          <TranslatedText
            as="p"
            translationKey="appointments.manage"
            fallback="View and manage your spiritual consultation appointments"
            className="text-muted-foreground"
          />
        </div>

        <div className="flex gap-2">
          <Button asChild>
            <Link href="/user/appointments/book">
              <Plus className="mr-2 h-4 w-4" />
              <TranslatedText translationKey="appointments.bookNew" fallback="Book New" />
            </Link>
          </Button>

          <Button variant="outline" asChild>
            <Link href="/user/qr-scanner">
              <QrCode className="mr-2 h-4 w-4" />
              <TranslatedText translationKey="qr.scanToCheckIn" fallback="QR Check-in" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <Suspense fallback={<TranslatedText translationKey="common.loading" fallback="Loading stats..." />}>
        <DashboardStats />
      </Suspense>

      {/* Appointments List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <TranslatedText
            as="h2"
            translationKey="appointments.recent"
            fallback="Recent Appointments"
            className="text-2xl font-semibold"
          />
          <Button variant="outline" size="sm" asChild>
            <Link href="/user/appointments?view=all">
              <Calendar className="mr-2 h-4 w-4" />
              <TranslatedText translationKey="appointments.viewAll" fallback="View All" />
            </Link>
          </Button>
        </div>

        <Suspense fallback={<TranslatedText translationKey="appointments.loading" fallback="Loading appointments..." />}>
          <AppointmentList />
        </Suspense>
      </div>

      {/* Appointment Management */}
      <AppointmentManager />
    </div>
  );
}
