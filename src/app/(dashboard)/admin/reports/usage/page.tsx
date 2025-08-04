"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  TrendingUp,
  Users,
  Calendar,
  Heart,
  Clock,
  Download,
  RefreshCw,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";

interface UsageStats {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalRemedies: number;
  averageWaitTime: number;
  systemUptime: number;
  userGrowth: number;
  appointmentGrowth: number;
  remedyGrowth: number;
}

interface DailyUsage {
  date: string;
  users: number;
  appointments: number;
  remedies: number;
  avgWaitTime: number;
}

interface UserTypeStats {
  type: string;
  count: number;
  percentage: number;
  growth: number;
}

interface GurujiPerformance {
  id: string;
  name: string;
  totalConsultations: number;
  averageRating: number;
  averageSessionTime: number;
  totalRemediesPrescribed: number;
}

export default function UsageAnalyticsPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [userTypeStats, setUserTypeStats] = useState<UserTypeStats[]>([]);
  const [gurujiPerformance, setGurujiPerformance] = useState<
    GurujiPerformance[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [reportType, setReportType] = useState<string>("summary");
  const router = useRouter();

  const fetchUsageData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        ...(dateRange?.from && { from: format(dateRange.from, "yyyy-MM-dd") }),
        ...(dateRange?.to && { to: format(dateRange.to, "yyyy-MM-dd") }),
      });

      const response = await fetch(`/api/admin/reports/usage?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setDailyUsage(data.dailyUsage || []);
        setUserTypeStats(data.userTypeStats || []);
        setGurujiPerformance(data.gurujiPerformance || []);
      }
    } catch (error) {
      console.error("Failed to fetch usage data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [reportType, dateRange]);

  useEffect(() => {
    fetchUsageData();
  }, [dateRange, reportType, fetchUsageData]);

  const exportReport = async () => {
    try {
      const params = new URLSearchParams({
        type: reportType,
        format: "csv",
        ...(dateRange?.from && { from: format(dateRange.from, "yyyy-MM-dd") }),
        ...(dateRange?.to && { to: format(dateRange.to, "yyyy-MM-dd") }),
      });

      const response = await fetch(`/api/admin/reports/usage/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `usage-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to export report:", error);
    }
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (growth < 0) return <ArrowDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return "text-green-600";
    if (growth < 0) return "text-red-600";
    return "text-gray-600";
  };

  const setQuickDateRange = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date(),
    });
  };

  const setMonthRange = () => {
    const now = new Date();
    setDateRange({
      from: startOfMonth(now),
      to: endOfMonth(now),
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Usage Analytics" allowedRoles={["ADMIN"]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Usage Analytics" allowedRoles={["ADMIN"]}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Usage Analytics
              </h2>
              <p className="text-muted-foreground">
                System usage patterns and performance metrics
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={fetchUsageData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportReport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Date Range
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">
                      From
                    </label>
                    <Input
                      type="date"
                      value={
                        dateRange?.from
                          ? format(dateRange.from, "yyyy-MM-dd")
                          : ""
                      }
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const from = e.target.value
                          ? new Date(e.target.value)
                          : undefined;
                        setDateRange((prev: DateRange | undefined) => ({
                          from: from || new Date(),
                          to: prev?.to || new Date(),
                        }));
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">To</label>
                    <Input
                      type="date"
                      value={
                        dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : ""
                      }
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const to = e.target.value
                          ? new Date(e.target.value)
                          : undefined;
                        setDateRange((prev: DateRange | undefined) => ({
                          from: prev?.from || new Date(),
                          to: to || new Date(),
                        }));
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-2 block">
                  Quick Filters
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateRange(7)}
                  >
                    Last 7 days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateRange(30)}
                  >
                    Last 30 days
                  </Button>
                  <Button variant="outline" size="sm" onClick={setMonthRange}>
                    This Month
                  </Button>
                </div>
              </div>
              <div className="w-full md:w-48">
                <label className="text-sm font-medium mb-2 block">
                  Report Type
                </label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="trends">Trends</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {getGrowthIcon(stats?.userGrowth || 0)}
                <span
                  className={`ml-1 ${getGrowthColor(stats?.userGrowth || 0)}`}
                >
                  {Math.abs(stats?.userGrowth || 0)}% from last period
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Appointments
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalAppointments || 0}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                {getGrowthIcon(stats?.appointmentGrowth || 0)}
                <span
                  className={`ml-1 ${getGrowthColor(
                    stats?.appointmentGrowth || 0
                  )}`}
                >
                  {Math.abs(stats?.appointmentGrowth || 0)}% from last period
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Remedies Prescribed
              </CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalRemedies || 0}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                {getGrowthIcon(stats?.remedyGrowth || 0)}
                <span
                  className={`ml-1 ${getGrowthColor(stats?.remedyGrowth || 0)}`}
                >
                  {Math.abs(stats?.remedyGrowth || 0)}% from last period
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Wait Time
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.averageWaitTime || 0}m
              </div>
              <p className="text-xs text-muted-foreground">
                Average consultation wait
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Breakdown */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* User Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>User Distribution</CardTitle>
              <CardDescription>Breakdown by user types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userTypeStats.map((userType, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 bg-primary rounded-full"
                        style={{
                          backgroundColor: `hsl(${index * 60}, 70%, 50%)`,
                        }}
                      ></div>
                      <span className="font-medium">{userType.type}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold">
                        {userType.count}
                      </span>
                      <Badge variant="outline">{userType.percentage}%</Badge>
                      <div className="flex items-center">
                        {getGrowthIcon(userType.growth)}
                        <span
                          className={`ml-1 text-xs ${getGrowthColor(
                            userType.growth
                          )}`}
                        >
                          {Math.abs(userType.growth)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Performance */}
          <Card>
            <CardHeader>
              <CardTitle>System Performance</CardTitle>
              <CardDescription>Key performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">System Uptime</span>
                  <Badge className="bg-green-100 text-green-700">
                    {stats?.systemUptime || 99.9}%
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Active Users</span>
                  <span className="text-2xl font-bold">
                    {stats?.activeUsers || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Completion Rate</span>
                  <Badge className="bg-blue-100 text-blue-700">
                    {stats?.totalAppointments
                      ? Math.round(
                          (stats.completedAppointments /
                            stats.totalAppointments) *
                            100
                        )
                      : 0}
                    %
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Cancellation Rate</span>
                  <Badge className="bg-red-100 text-red-700">
                    {stats?.totalAppointments
                      ? Math.round(
                          (stats.cancelledAppointments /
                            stats.totalAppointments) *
                            100
                        )
                      : 0}
                    %
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Guruji Performance */}
        {gurujiPerformance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Guruji Performance</CardTitle>
              <CardDescription>Individual performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Name</th>
                      <th className="text-center py-2">Consultations</th>
                      <th className="text-center py-2">Avg Session Time</th>
                      <th className="text-center py-2">Remedies Prescribed</th>
                      <th className="text-center py-2">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gurujiPerformance.map((guruji) => (
                      <tr key={guruji.id} className="border-b">
                        <td className="py-3 font-medium">{guruji.name}</td>
                        <td className="text-center py-3">
                          {guruji.totalConsultations}
                        </td>
                        <td className="text-center py-3">
                          {guruji.averageSessionTime}m
                        </td>
                        <td className="text-center py-3">
                          {guruji.totalRemediesPrescribed}
                        </td>
                        <td className="text-center py-3">
                          <Badge className="bg-green-100 text-green-700">
                            {guruji.averageRating.toFixed(1)}★
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Usage Chart Placeholder */}
        {dailyUsage.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Daily Usage Trends</CardTitle>
              <CardDescription>
                Usage patterns over the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border border-dashed border-muted-foreground/25 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Chart visualization would be displayed here
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Showing {dailyUsage.length} data points
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
