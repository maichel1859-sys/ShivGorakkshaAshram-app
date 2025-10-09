import { CoordinatorAppointmentsServer } from '@/components/server/coordinator-appointments-server';

interface Props {
  searchParams: Promise<{
    search?: string;
    status?: string;
    date?: string;
    page?: string;
  }>;
}

// Disable caching to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CoordinatorAppointmentsPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  return <CoordinatorAppointmentsServer searchParams={resolvedSearchParams} />;
} 