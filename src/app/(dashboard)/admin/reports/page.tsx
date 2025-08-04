"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Users,
  Calendar,
  Clock,
  Heart,
  Download,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export default function AdminReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string>("overview");

  const reports = [
    {
      id: "overview",
      title: "System Overview",
      description: "General system statistics and performance metrics",
      icon: BarChart3,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      id: "users",
      title: "User Analytics",
      description: "User registration, activity, and engagement reports",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      id: "appointments",
      title: "Appointment Reports",
      description:
        "Appointment booking, completion, and cancellation statistics",
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      id: "queue",
      title: "Queue Analytics",
      description: "Queue management and wait time analysis",
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      id: "remedies",
      title: "Remedy Reports",
      description: "Remedy prescription and delivery statistics",
      icon: Heart,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground">
              Generate and view comprehensive system reports
            </p>
          </div>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export All Reports
          </Button>
        </div>

        {/* Report Categories */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card
              key={report.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedReport === report.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedReport(report.id)}
            >
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${report.bgColor}`}>
                    <report.icon className={`h-6 w-6 ${report.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <CardDescription>{report.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Report Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {reports.find((r) => r.id === selectedReport)?.title}
                </CardTitle>
                <CardDescription>
                  {reports.find((r) => r.id === selectedReport)?.description}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedReport === "overview" && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Total Users</p>
                      <p className="text-2xl font-bold">1,234</p>
                      <p className="text-xs text-green-600 flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +12% from last month
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-green-50">
                      <Calendar className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Appointments</p>
                      <p className="text-2xl font-bold">567</p>
                      <p className="text-xs text-green-600 flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +8% from last month
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-purple-50">
                      <Clock className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Queue Length</p>
                      <p className="text-2xl font-bold">23</p>
                      <p className="text-xs text-red-600 flex items-center">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        -5% from last month
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-red-50">
                      <Heart className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Remedies</p>
                      <p className="text-2xl font-bold">89</p>
                      <p className="text-xs text-green-600 flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +15% from last month
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-center text-muted-foreground">
                  <p>Detailed charts and analytics will be displayed here</p>
                </div>
              </div>
            )}

            {selectedReport === "users" && (
              <div className="space-y-4">
                <div className="text-center text-muted-foreground">
                  <p>
                    User registration trends, activity patterns, and engagement
                    metrics
                  </p>
                </div>
              </div>
            )}

            {selectedReport === "appointments" && (
              <div className="space-y-4">
                <div className="text-center text-muted-foreground">
                  <p>
                    Appointment booking trends, completion rates, and
                    cancellation analysis
                  </p>
                </div>
              </div>
            )}

            {selectedReport === "queue" && (
              <div className="space-y-4">
                <div className="text-center text-muted-foreground">
                  <p>
                    Queue management statistics, wait time analysis, and
                    efficiency metrics
                  </p>
                </div>
              </div>
            )}

            {selectedReport === "remedies" && (
              <div className="space-y-4">
                <div className="text-center text-muted-foreground">
                  <p>
                    Remedy prescription trends, delivery statistics, and
                    effectiveness analysis
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
