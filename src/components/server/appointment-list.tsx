import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/core/auth";
import {
  getAppointments,
} from "@/lib/actions/appointment-actions";
import { cancelAppointmentAction } from "@/lib/actions/appointment-list-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/loading";
import { Calendar, Clock, User, MapPin, QrCode } from "lucide-react";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { AppointmentStatus } from "@prisma/client";

interface AppointmentListProps {
  userId?: string;
  limit?: number;
  showActions?: boolean;
  status?: AppointmentStatus;
}

async function AppointmentListContent({
  userId,
  status,
  limit = 10,
  showActions = true,
}: AppointmentListProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  try {
    // Use our Server Action to get appointments
    const result = await getAppointments({
      status,
      limit,
      userId: userId || session.user.id,
    });

    if (!result || !result.success) {
      return (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive">
              Failed to load appointments. Please refresh the page.
            </p>
          </CardContent>
        </Card>
      );
    }

    const { appointments } = result;

    if (!appointments || appointments.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No appointments found
            </h3>
            <p className="text-muted-foreground">
              {status
                ? `No ${status.toLowerCase()} appointments.`
                : "You haven't booked any appointments yet."}
            </p>
            {!userId && (
              <Button className="mt-4" asChild>
                <a href="/user/appointments/book">Book Appointment</a>
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {appointments.map((appointment) => (
          <Card
            key={appointment.id}
            className="hover:shadow-md transition-shadow"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {format(new Date(appointment.date), "MMM dd, yyyy")}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(new Date(appointment.startTime), "hh:mm a")} -
                        {format(new Date(appointment.endTime), "hh:mm a")}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={
                      appointment.status === "COMPLETED"
                        ? "default"
                        : appointment.status === "CANCELLED"
                          ? "destructive"
                          : appointment.status === "BOOKED"
                            ? "secondary"
                            : appointment.status === "CONFIRMED"
                              ? "default"
                              : appointment.status === "CHECKED_IN"
                                ? "outline"
                                : "outline"
                    }
                  >
                    {appointment.status}
                  </Badge>
                  {appointment.priority !== "NORMAL" && (
                    <Badge variant="outline" className="text-xs">
                      {appointment.priority}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>With {appointment.guruji?.name || "Unknown"}</span>
                </div>
                {appointment.reason && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{appointment.reason}</span>
                  </div>
                )}
                {appointment.queueEntry && (
                  <div className="flex items-center space-x-2">
                    <QrCode className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Queue Position: {appointment.queueEntry.position}
                    </span>
                  </div>
                )}
                {appointment.isRecurring && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Recurring
                    </span>
                  </div>
                )}
              </div>

              {showActions &&
                (appointment.status === "BOOKED" ||
                  appointment.status === "CONFIRMED") && (
                  <div className="flex flex-wrap gap-2">
                    <form action="/user/appointments/reschedule" method="GET">
                      <input type="hidden" name="id" value={appointment.id} />
                      <Button size="sm" variant="outline" type="submit">
                        Reschedule
                      </Button>
                    </form>
                    <form action={cancelAppointmentAction}>
                      <input
                        type="hidden"
                        name="appointmentId"
                        value={appointment.id}
                      />
                      <Button size="sm" variant="destructive" type="submit">
                        Cancel
                      </Button>
                    </form>
                    {appointment.qrCode && (
                      <Button size="sm" variant="secondary">
                        Show QR
                      </Button>
                    )}
                  </div>
                )}

              {appointment.status === "BOOKED" && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Your appointment is confirmed. Please arrive 10 minutes
                    early.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  } catch (error) {
    console.error("Error loading appointments:", error);
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-destructive">
            Failed to load appointments. Please refresh the page.
          </p>
        </CardContent>
      </Card>
    );
  }
}

function AppointmentListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-18" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AppointmentList(props: AppointmentListProps) {
  return (
    <Suspense fallback={<AppointmentListSkeleton count={props.limit} />}>
      <AppointmentListContent {...props} />
    </Suspense>
  );
}
