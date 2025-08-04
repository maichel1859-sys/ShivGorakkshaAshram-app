"use client";

import { useState, useEffect } from "react";
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
import {
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Bell,
  MapPin,
  User,
  Calendar,
  Timer,
} from "lucide-react";
import toast from "react-hot-toast";

interface QueueEntry {
  id: string;
  position: number;
  status: "WAITING" | "IN_PROGRESS" | "COMPLETED";
  estimatedWait: number;
  appointment: {
    id: string;
    date: string;
    startTime: string;
    guruji: {
      name: string;
    };
    user: {
      name: string;
    };
  };
}

interface QueueStats {
  totalWaiting: number;
  averageWaitTime: number;
  currentlyServing: string | null;
}

export default function QueuePage() {
  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchQueueData();

    if (autoRefresh) {
      const interval = setInterval(fetchQueueData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchQueueData = async () => {
    try {
      const response = await fetch("/api/queue/status");

      if (!response.ok) {
        throw new Error("Failed to fetch queue data");
      }

      const data = await response.json();
      setQueueEntry(data.queueEntry);
      setQueueStats(data.stats);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Queue fetch error:", error);
      toast.error("Failed to update queue status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRefresh = () => {
    setIsLoading(true);
    fetchQueueData();
    toast.success("Queue status updated");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "WAITING":
        return "text-yellow-600 bg-yellow-100";
      case "IN_PROGRESS":
        return "text-blue-600 bg-blue-100";
      case "COMPLETED":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "WAITING":
        return <Clock className="h-4 w-4" />;
      case "IN_PROGRESS":
        return <Timer className="h-4 w-4" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const calculateProgress = () => {
    if (!queueEntry || !queueStats) return 0;
    const totalAhead = queueEntry.position - 1;
    const totalWaiting = queueStats.totalWaiting;
    return totalWaiting > 0
      ? ((totalWaiting - totalAhead) / totalWaiting) * 100
      : 100;
  };

  if (isLoading && !queueEntry) {
    return (
      <DashboardLayout title="Queue Status" allowedRoles={["USER"]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading queue status...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!queueEntry) {
    return (
      <DashboardLayout title="Queue Status" allowedRoles={["USER"]}>
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <span>No Active Queue Entry</span>
              </CardTitle>
              <CardDescription>
                You don&apos;t have any active appointments in the queue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                To join the queue, you need to check in for an appointment
                first.
              </p>
              <Button onClick={() => (window.location.href = "/user/checkin")}>
                Check In for Appointment
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Queue Status" allowedRoles={["USER"]}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Live Queue Status
            </h2>
            <p className="text-muted-foreground">
              Real-time updates for your appointment queue
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Current Status */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div
                className={`p-2 rounded-full ${getStatusColor(
                  queueEntry.status
                )}`}
              >
                {getStatusIcon(queueEntry.status)}
              </div>
              <span>Your Queue Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  #{queueEntry.position}
                </div>
                <p className="text-sm text-muted-foreground">
                  Position in Queue
                </p>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">
                  {queueEntry.estimatedWait}m
                </div>
                <p className="text-sm text-muted-foreground">Estimated Wait</p>
              </div>

              <div className="text-center">
                <div
                  className={`text-3xl font-bold ${
                    queueEntry.status === "WAITING"
                      ? "text-yellow-500"
                      : queueEntry.status === "IN_PROGRESS"
                        ? "text-blue-500"
                        : "text-green-500"
                  }`}
                >
                  {queueEntry.status.replace("_", " ")}
                </div>
                <p className="text-sm text-muted-foreground">Current Status</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Queue Progress</span>
                <span>{Math.round(calculateProgress())}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>

            {/* Status Message */}
            <div className="text-center p-4 bg-muted rounded-lg">
              {queueEntry.status === "WAITING" && (
                <p className="text-muted-foreground">
                  You&apos;re currently waiting in the queue. Please stay nearby
                  and we&apos;ll notify you when it&apos;s your turn.
                </p>
              )}
              {queueEntry.status === "IN_PROGRESS" && (
                <p className="text-blue-600 font-medium">
                  🎉 It&apos;s your turn! Please proceed to the consultation
                  room now.
                </p>
              )}
              {queueEntry.status === "COMPLETED" && (
                <p className="text-green-600 font-medium">
                  ✅ Your consultation is complete. You can now leave or visit
                  reception for any follow-up.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Appointment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Appointment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Guruji</p>
                  <p className="font-medium">
                    {queueEntry.appointment.guruji.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Appointment Time
                  </p>
                  <p className="font-medium">
                    {new Date(
                      queueEntry.appointment.startTime
                    ).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">Consultation Room 1</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Notifications</p>
                  <p className="font-medium">Enabled</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queue Overview */}
        {queueStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Queue Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {queueStats.totalWaiting}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    People Waiting
                  </p>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {queueStats.averageWaitTime}m
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Wait Time</p>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {queueStats.currentlyServing ? "Active" : "Paused"}
                  </div>
                  <p className="text-sm text-muted-foreground">Queue Status</p>
                </div>
              </div>

              {queueStats.currentlyServing && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>Currently serving:</strong>{" "}
                    {queueStats.currentlyServing}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Settings & Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Queue Settings</CardTitle>
            <CardDescription>
              Manage your queue preferences and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto Refresh</p>
                <p className="text-sm text-muted-foreground">
                  Automatically update queue status every 30 seconds
                </p>
              </div>
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when it&apos;s almost your turn
                </p>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help & Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              <span>Need Help?</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              <strong>What if I miss my turn?</strong>
              <br />
              Don&apos;t worry! Visit the reception and they&apos;ll help you
              get back in the queue.
            </p>

            <p className="text-sm">
              <strong>Can I leave and come back?</strong>
              <br />
              Yes, but please check back at least 10 minutes before your
              estimated time.
            </p>

            <p className="text-sm">
              <strong>Emergency?</strong>
              <br />
              For urgent matters, please speak with the coordinator at
              reception.
            </p>

            <Button variant="outline" className="w-full">
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
