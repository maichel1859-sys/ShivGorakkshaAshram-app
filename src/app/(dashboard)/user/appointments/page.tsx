import { Metadata } from 'next';
import { Suspense } from 'react';
import { AppointmentList } from '@/components/server/appointment-list';
import { DashboardStats } from '@/components/server/dashboard-stats';
import { AppointmentManager } from '@/components/client/appointment-manager';
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
          <h1 className="text-3xl font-bold tracking-tight">My Appointments</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your spiritual consultation appointments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/user/qr-scanner">
              <QrCode className="h-4 w-4 mr-2" />
              QR Scanner
            </Link>
          </Button>
          <Button asChild>
            <Link href="/user/appointments/book">
              <Plus className="h-4 w-4 mr-2" />
              Book New Appointment
            </Link>
          </Button>
        </div>
      </div>

      {/* Dashboard Stats - Server Component with Suspense */}
      <Suspense fallback={<div>Loading dashboard stats...</div>}>
        <DashboardStats />
      </Suspense>

      {/* Main Content - Combining Server and Client Components */}
      <div className="grid gap-8">
        {/* Server-side rendered appointments with Suspense for streaming */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Recent Appointments</h2>
          </div>
          
          <Suspense fallback={<div>Loading appointments...</div>}>
            <AppointmentList limit={5} showActions={true} />
          </Suspense>
        </div>

        {/* Client-side interactive appointment manager with React Query */}
        <div className="mt-8">
          <AppointmentManager />
        </div>
      </div>
    </div>
  );
}
