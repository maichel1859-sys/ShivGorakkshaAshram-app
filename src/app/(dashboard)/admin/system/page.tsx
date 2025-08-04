"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  MemoryStick
} from "lucide-react";

interface SystemStatus {
  status: "healthy" | "warning" | "critical";
  uptime: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
  databaseStatus: "connected" | "disconnected" | "error";
  lastBackup: string;
  errors: string[];
  warnings: string[];
}

export default function AdminSystemPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: "healthy",
    uptime: "5 days, 12 hours",
    cpuUsage: 45,
    memoryUsage: 62,
    diskUsage: 78,
    activeConnections: 23,
    databaseStatus: "connected",
    lastBackup: "2 hours ago",
    errors: [],
    warnings: ["High disk usage detected"],
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch("/api/admin/system/status");
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data);
      }
    } catch (error) {
      console.error("Error fetching system status:", error);
    } finally {
      setIsLoading(false);
    }
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Monitor</h1>
            <p className="text-muted-foreground">
              Monitor system health and performance
            </p>
          </div>
          <Button onClick={fetchSystemStatus}>
            <RefreshCw className="mr-2 h-4 w-4" />
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
            <CardDescription>
              Overall system health and uptime
            </CardDescription>
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
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStatus.memoryUsage}%</div>
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
              <div className="text-2xl font-bold">{systemStatus.diskUsage}%</div>
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
                <Badge className={getDatabaseStatusColor(systemStatus.databaseStatus)}>
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
                  <p className="text-sm text-muted-foreground mt-2">No errors detected</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {systemStatus.errors.map((error, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm text-red-600">
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
                  <p className="text-sm text-muted-foreground mt-2">No warnings</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {systemStatus.warnings.map((warning, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm text-yellow-600">
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