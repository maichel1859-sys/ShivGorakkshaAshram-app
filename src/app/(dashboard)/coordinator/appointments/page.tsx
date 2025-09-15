import { CoordinatorAppointmentsServer } from '@/components/server/coordinator-appointments-server';

interface Props {
  searchParams: Promise<{
    search?: string;
    status?: string;
    date?: string;
    page?: string;
  }>;
}

export default async function CoordinatorAppointmentsPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  return <CoordinatorAppointmentsServer searchParams={resolvedSearchParams} />;
} 