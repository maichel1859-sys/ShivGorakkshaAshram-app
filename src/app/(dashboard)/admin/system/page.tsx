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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  Database,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  HardDrive,
  Cpu,
  MemoryStick,
} from "lucide-react";
import { useAdminSystemStatus } from "@/hooks/queries";



export default function AdminSystemPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use React Query for data fetching
  const {
    data: systemStatus,
    isLoading,
    error,
    refetch,
  } = useAdminSystemStatus();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDatabaseStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800";
      case "disconnected":
        return "bg-red-100 text-red-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !systemStatus) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-600">
              Error loading system status
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
            <Button onClick={handleRefresh} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              System Monitor
            </h1>
            <p className="text-muted-foreground">
              Monitor system health and performance
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Overall Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>Overall system health and uptime</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(systemStatus.status)}>
                  {systemStatus.status.toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Uptime: {systemStatus.uptime}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Active Connections: {systemStatus.activeConnections}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStatus.cpuUsage}%</div>
              <Progress value={systemStatus.cpuUsage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Current CPU utilization
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Memory Usage
              </CardTitle>
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {systemStatus.memoryUsage}%
              </div>
              <Progress value={systemStatus.memoryUsage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                RAM utilization
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {systemStatus.diskUsage}%
              </div>
              <Progress value={systemStatus.diskUsage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Storage utilization
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Database Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Status
            </CardTitle>
            <CardDescription>
              Database connection and backup status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge
                  className={getDatabaseStatusColor(
                    systemStatus.databaseStatus
                  )}
                >
                  {systemStatus.databaseStatus.toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Last backup: {systemStatus.lastBackup}
                </span>
              </div>
              <Button variant="outline" size="sm">
                Backup Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alerts and Errors */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Errors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Errors
              </CardTitle>
              <CardDescription>
                System errors and critical issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              {systemStatus.errors.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
                  <p className="text-sm text-muted-foreground mt-2">
                    No errors detected
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {systemStatus.errors.map((error, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 text-sm text-red-600"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warnings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Warnings
              </CardTitle>
              <CardDescription>
                System warnings and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {systemStatus.warnings.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
                  <p className="text-sm text-muted-foreground mt-2">
                    No warnings
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {systemStatus.warnings.map((warning, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 text-sm text-yellow-600"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* System Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Actions
            </CardTitle>
            <CardDescription>
              Administrative actions and maintenance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline">
                <Database className="mr-2 h-4 w-4" />
                Backup Database
              </Button>
              <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Restart Services
              </Button>
              <Button variant="outline">
                <Activity className="mr-2 h-4 w-4" />
                Clear Cache
              </Button>
              <Button variant="outline">
                <Server className="mr-2 h-4 w-4" />
                System Maintenance
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
