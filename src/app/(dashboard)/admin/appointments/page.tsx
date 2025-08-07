import { AppointmentsServer } from '@/components/server/appointments-server';

interface Props {
  searchParams: Promise<{
    search?: string;
    status?: string;
    date?: string;
    page?: string;
  }>;
}

export default async function AppointmentsPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  return <AppointmentsServer searchParams={resolvedSearchParams} />;
}
