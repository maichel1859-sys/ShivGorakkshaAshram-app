import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { getCoordinatorAppointments } from "@/lib/actions/appointment-actions";
import { CoordinatorAppointmentsClient } from "@/components/client/coordinator-appointments-client";
import { AppointmentsSkeleton } from "./appointments-skeleton";
import { unstable_noStore as noStore } from 'next/cache';

interface CoordinatorAppointmentsServerProps {
  searchParams?: {
    search?: string;
    status?: string;
    date?: string;
    page?: string;
  };
}

async function CoordinatorAppointmentsContent({
  searchParams,
}: CoordinatorAppointmentsServerProps) {
  noStore(); // Opt out of caching for this component
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <div>Authentication required</div>;
  }

  // Only coordinators and admins can access
  if (!["COORDINATOR", "ADMIN"].includes(session.user.role)) {
    return <div>Access denied</div>;
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

  const result = await getCoordinatorAppointments();

  if (!result.success) {
    return (
      <div className="text-center text-red-600 p-6">
        <p>Failed to load appointments: {result.error}</p>
      </div>
    );
  }

  // Transform appointments to match the expected interface
  const transformedAppointments = (result.appointments || []).map(
    (appointment) => {
      // Safely parse dates with fallback handling
      const parseDate = (dateValue: unknown): Date => {
        if (dateValue instanceof Date) return dateValue;
        if (typeof dateValue === "string" && dateValue) {
          const parsed = new Date(dateValue);
          return isNaN(parsed.getTime()) ? new Date() : parsed;
        }
        return new Date();
      };

      const parseStringDate = (dateValue: unknown): string => {
        if (dateValue instanceof Date)
          return dateValue.toISOString().split("T")[0];
        if (typeof dateValue === "string" && dateValue) {
          const parsed = new Date(dateValue);
          return isNaN(parsed.getTime())
            ? new Date().toISOString().split("T")[0]
            : parsed.toISOString().split("T")[0];
        }
        return new Date().toISOString().split("T")[0];
      };

      const parseISOString = (dateValue: unknown): string => {
        if (dateValue instanceof Date) return dateValue.toISOString();
        if (typeof dateValue === "string" && dateValue) {
          const parsed = new Date(dateValue);
          return isNaN(parsed.getTime())
            ? new Date().toISOString()
            : parsed.toISOString();
        }
        return new Date().toISOString();
      };

      return {
        id: appointment.id,
        date: parseStringDate(appointment.date),
        status: appointment.status,
        priority: appointment.priority || "NORMAL",
        reason: appointment.reason || undefined,
        startTime: parseDate(appointment.startTime),
        endTime: parseDate(appointment.endTime),
        notes: appointment.notes || undefined,
        checkedInAt: appointment.checkedInAt,
        createdAt: parseISOString(appointment.createdAt),
        updatedAt: parseISOString(appointment.updatedAt),
        user: {
          id: appointment.user.id,
          name: appointment.user.name || "",
          email: appointment.user.email || "",
          phone: appointment.user.phone || "",
        },
        guruji: appointment.guruji
          ? {
              id: appointment.guruji.id,
              name: appointment.guruji.name || "",
            }
          : undefined,
      };
    }
  );

  // Filter appointments based on search params (server-side filtering)
  let filteredAppointments = transformedAppointments;

  if (search) {
    filteredAppointments = filteredAppointments.filter(
      (apt) =>
        apt.user.name.toLowerCase().includes(search.toLowerCase()) ||
        apt.user.email.toLowerCase().includes(search.toLowerCase()) ||
        (apt.user.phone && apt.user.phone.includes(search))
    );
  }

  if (status && status !== "all") {
    filteredAppointments = filteredAppointments.filter(
      (apt) => apt.status === status
    );
  }

  if (date === "today") {
    const today = new Date().toISOString().split("T")[0];
    filteredAppointments = filteredAppointments.filter(
      (apt) => apt.date === today
    );
  }

  // Ensure we have the correct data structure
  const appointmentsData = {
    appointments: filteredAppointments,
    total: filteredAppointments.length,
    hasMore: false, // Since we're loading all appointments for coordinator
  };

  return (
    <CoordinatorAppointmentsClient
      initialData={appointmentsData}
      initialSearchParams={searchParams || {}}
    />
  );
}

export function CoordinatorAppointmentsServer(
  props: CoordinatorAppointmentsServerProps
) {
  return (
    <Suspense fallback={<AppointmentsSkeleton />}>
      <CoordinatorAppointmentsContent {...props} />
    </Suspense>
  );
}
