import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { getAppointments } from "@/lib/actions/appointment-actions";
import { AppointmentsClient } from "@/components/client/appointments-client";
import { AppointmentsSkeleton } from "./appointments-skeleton";

interface AppointmentsServerProps {
  searchParams?: {
    search?: string;
    status?: string;
    date?: string;
    page?: string;
  };
}

async function AppointmentsContent({ searchParams }: AppointmentsServerProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <div>Authentication required</div>;
  }

  const { search, status, date, page = "1" } = searchParams || {};

  const options: Record<string, unknown> = {
    limit: 20,
    offset: (parseInt(page) - 1) * 20,
  };

  if (status && status !== "all") options.status = status;
  if (search) options.search = search;
  if (date === "today") {
    const today = new Date();
    options.date = today.toISOString().split("T")[0];
  } else if (date === "week") {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    options.fromDate = weekAgo.toISOString().split("T")[0];
  }

  const result = await getAppointments(options);

  if (!result.success) {
    return (
      <div className="text-center text-red-600 p-6">
        <p>Failed to load appointments: {result.error}</p>
      </div>
    );
  }

  // Transform appointments to match the expected interface
  const transformedAppointments = (result.appointments || []).map(
    (appointment) => ({
      id: appointment.id,
      date:
        appointment.date instanceof Date
          ? appointment.date.toISOString().split("T")[0]
          : appointment.date,
      startTime:
        appointment.startTime instanceof Date
          ? appointment.startTime.toISOString()
          : appointment.startTime,
      endTime:
        appointment.endTime instanceof Date
          ? appointment.endTime.toISOString()
          : appointment.endTime,
      status: appointment.status,
      notes: appointment.notes || undefined,
      createdAt:
        appointment.createdAt instanceof Date
          ? appointment.createdAt.toISOString()
          : appointment.createdAt,
      updatedAt:
        appointment.updatedAt instanceof Date
          ? appointment.updatedAt.toISOString()
          : appointment.updatedAt,
      user: {
        id: appointment.user.id,
        name: appointment.user.name || "",
        email: appointment.user.email || "",
      },
    })
  );

  // Ensure we have the correct data structure
  const appointmentsData = {
    appointments: transformedAppointments,
    total: result.total || 0,
    hasMore: result.hasMore || false,
  };

  return (
    <AppointmentsClient
      initialData={appointmentsData}
      initialSearchParams={searchParams || {}}
    />
  );
}

export function AppointmentsServer(props: AppointmentsServerProps) {
  return (
    <Suspense fallback={<AppointmentsSkeleton />}>
      <AppointmentsContent {...props} />
    </Suspense>
  );
}
