"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  Smartphone,
  Shield,
  Activity,
} from "lucide-react";
import { SystemSetupChecker, type SystemHealth } from "@/lib/setup-check";

interface SystemDashboardProps {
  className?: string;
}

export function SystemDashboard({ className = "" }: SystemDashboardProps) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checker = useMemo(() => new SystemSetupChecker(), []);

  const runHealthCheck = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await checker.runAllChecks();
      setHealth(result);
      setLastCheck(new Date());
    } catch (error) {
      console.error("Health check failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [checker]);

  useEffect(() => {
    runHealthCheck();

    // Auto-refresh every 5 minutes
    const interval = setInterval(runHealthCheck, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [runHealthCheck]);

  const getStatusIcon = (status: "pass" | "fail" | "warning") => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "fail":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: "pass" | "fail" | "warning") => {
    switch (status) {
      case "pass":
        return "bg-green-100 text-green-800 border-green-200";
      case "fail":
        return "bg-red-100 text-red-800 border-red-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getOverallStatusColor = (
    overall: "healthy" | "warning" | "critical"
  ) => {
    switch (overall) {
      case "healthy":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
    }
  };

  const groupedChecks =
    health?.checks.reduce(
      (acc, check) => {
        let category = "Other";

        if (check.name.includes("Environment Variable"))
          category = "Environment";
        else if (check.name.includes("Database")) category = "Database";
        else if (
          check.name.includes("Twilio") ||
          check.name.includes("Resend") ||
          check.name.includes("Sentry")
        )
          category = "External Services";
        else if (
          check.name.includes("Camera") ||
          check.name.includes("Speech") ||
          check.name.includes("Storage") ||
          check.name.includes("WebSocket") ||
          check.name.includes("Service Worker") ||
          check.name.includes("Push")
        )
          category = "Browser Capabilities";
        else if (check.name.includes("Directory")) category = "File System";

        if (!acc[category]) acc[category] = [];
        acc[category].push(check);
        return acc;
      },
      {} as Record<string, typeof health.checks>
    ) || {};

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Environment":
        return <Server className="h-5 w-5" />;
      case "Database":
        return <Database className="h-5 w-5" />;
      case "External Services":
        return <Shield className="h-5 w-5" />;
      case "Browser Capabilities":
        return <Smartphone className="h-5 w-5" />;
      case "File System":
        return <Activity className="h-5 w-5" />;
      default:
        return <CheckCircle className="h-5 w-5" />;
    }
  };

  if (isLoading && !health) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-6 w-6" />
              <span>System Health Dashboard</span>
            </CardTitle>
            <CardDescription>Checking system health...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-6 w-6" />
              <span>System Health Dashboard</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={runHealthCheck}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            Last checked: {lastCheck?.toLocaleString() || "Never"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {health && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`text-2xl font-bold ${getOverallStatusColor(health.overall)}`}
                >
                  {health.overall.charAt(0).toUpperCase() +
                    health.overall.slice(1)}
                </div>
                <Badge
                  variant={
                    health.overall === "healthy" ? "default" : "destructive"
                  }
                >
                  {health.checks.filter((c) => c.status === "pass").length} /{" "}
                  {health.checks.length} checks passed
                </Badge>
              </div>

              {health.overall !== "healthy" && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {health.overall === "critical"
                      ? "Critical issues detected. Some features may not work properly."
                      : "Some optional features are not configured or available."}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Checks by Category */}
      {Object.entries(groupedChecks).map(([category, checks]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getCategoryIcon(category)}
              <span>{category}</span>
              <Badge variant="outline">
                {checks.filter((c) => c.status === "pass").length} /{" "}
                {checks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checks.map((check, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${getStatusColor(check.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(check.status)}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">
                          {check.name.replace(/^[^:]+:\s*/, "")}
                        </p>
                        <p className="text-xs mt-1 opacity-90">
                          {check.message}
                        </p>
                      </div>
                    </div>
                    {check.critical && (
                      <Badge variant="destructive" className="text-xs">
                        Critical
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Setup Instructions */}
      {health && health.overall !== "healthy" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Setup Instructions</span>
            </CardTitle>
            <CardDescription>
              Follow these steps to resolve issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checker.getSetupInstructions().map((instruction, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{instruction}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Stats */}
      <Card>
        <CardHeader>
          <CardTitle>System Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {health?.checks.filter((c) => c.status === "pass").length || 0}
              </div>
              <div className="text-sm text-gray-600">Passing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {health?.checks.filter((c) => c.status === "warning").length ||
                  0}
              </div>
              <div className="text-sm text-gray-600">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {health?.checks.filter((c) => c.status === "fail").length || 0}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {health?.checks.filter((c) => c.critical).length || 0}
              </div>
              <div className="text-sm text-gray-600">Critical</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
