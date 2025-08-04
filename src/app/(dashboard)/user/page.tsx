"use client";

import { DashboardLayout } from "@/components/dashboard/layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Heart,
  Plus,
  QrCode,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function UserDashboard() {
  const { data: session } = useSession();

  return (
    <DashboardLayout title="My Dashboard" allowedRoles={["USER"]}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back, {session?.user.name?.split(" ")[0]}!
            </h2>
            <p className="text-muted-foreground">
              Here&apos;s what&apos;s happening with your appointments today.
            </p>
          </div>
          <Button asChild>
            <Link href="/user/appointments/book">
              <Plus className="mr-2 h-4 w-4" />
              Book Appointment
            </Link>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Next Appointment
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Today</div>
              <p className="text-xs text-muted-foreground">
                2:30 PM with Guruji Ravi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Queue Position
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3rd</div>
              <p className="text-xs text-muted-foreground">
                ~15 mins estimated wait
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Remedies
              </CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">
                Ready for download
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Consultations
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks you might want to perform
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto p-4" asChild>
              <Link
                href="/user/appointments/book"
                className="flex flex-col items-center space-y-2"
              >
                <Calendar className="h-6 w-6" />
                <span>Book Appointment</span>
              </Link>
            </Button>

            <Button variant="outline" className="h-auto p-4" asChild>
              <Link
                href="/user/checkin"
                className="flex flex-col items-center space-y-2"
              >
                <QrCode className="h-6 w-6" />
                <span>Check In</span>
              </Link>
            </Button>

            <Button variant="outline" className="h-auto p-4" asChild>
              <Link
                href="/user/queue"
                className="flex flex-col items-center space-y-2"
              >
                <Clock className="h-6 w-6" />
                <span>View Queue</span>
              </Link>
            </Button>

            <Button variant="outline" className="h-auto p-4" asChild>
              <Link
                href="/user/remedies"
                className="flex flex-col items-center space-y-2"
              >
                <Heart className="h-6 w-6" />
                <span>My Remedies</span>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity & Upcoming */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>Your scheduled consultations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Consultation with Guruji Ravi
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Today at 2:30 PM
                  </p>
                </div>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>

              <Separator />

              <div className="flex items-center space-x-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Follow-up with Guruji Priya
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tomorrow at 10:00 AM
                  </p>
                </div>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </div>

              <Separator />

              <Button variant="ghost" className="w-full" asChild>
                <Link href="/user/appointments">View All Appointments</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Remedies */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Remedies</CardTitle>
              <CardDescription>Your latest prescribed remedies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <Heart className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Meditation & Breathing Exercises
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ready for download
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  Download
                </Button>
              </div>

              <Separator />

              <div className="flex items-center space-x-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Heart className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Herbal Tea Preparation
                  </p>
                  <p className="text-sm text-muted-foreground">2 days ago</p>
                </div>
                <Button size="sm" variant="outline">
                  View
                </Button>
              </div>

              <Separator />

              <Button variant="ghost" className="w-full" asChild>
                <Link href="/user/remedies">View All Remedies</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Progress Tracking */}
        <Card>
          <CardHeader>
            <CardTitle>Your Spiritual Journey Progress</CardTitle>
            <CardDescription>
              Track your progress with personalized insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Meditation Practice</span>
                <span>75%</span>
              </div>
              <Progress value={75} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Remedy Adherence</span>
                <span>90%</span>
              </div>
              <Progress value={90} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Regular Consultations</span>
                <span>60%</span>
              </div>
              <Progress value={60} />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
