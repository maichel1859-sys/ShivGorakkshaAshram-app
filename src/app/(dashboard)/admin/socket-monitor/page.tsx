"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ExternalLink,
  Monitor,
  AlertCircle,
  Wifi,
  Server,
  Users,
  MessageSquare,
} from "lucide-react";
import { useSocket } from "@/hooks/use-socket";

export default function SocketMonitorPage() {
  const { data: session, status } = useSession();
  const { isConnected } = useSocket();

  // Redirect if not admin
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      redirect("/signin");
    }
  }, [session, status]);

  const openSocketAdmin = () => {
    const baseUrl = window.location.origin;
    const socketAdminUrl = `${baseUrl}/admin/socket.io`;
    window.open(socketAdminUrl, "_blank", "width=1400,height=900");
  };

  const openAPIDocsInNewTab = () => {
    window.open("/admin/api-docs", "_blank");
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Socket.IO Monitoring</h1>
          <p className="text-muted-foreground mt-2">
            Real-time WebSocket connection monitoring using Socket.IO Admin UI
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={isConnected ? "default" : "destructive"}
            className="flex items-center gap-1"
          >
            <Wifi className="h-3 w-3" />
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </div>

      {/* Main Action Card */}
      <Card className="border-2 border-dashed border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Socket.IO Admin Interface</CardTitle>
          <CardDescription className="text-lg">
            Use the built-in Socket.IO Admin UI for comprehensive WebSocket
            monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            The Socket.IO Admin UI provides real-time monitoring, debugging
            tools, and connection management for all WebSocket connections in
            the Shivgoraksha Ashram Management System.
          </p>
          <Button
            onClick={openSocketAdmin}
            size="lg"
            className="text-lg px-8 py-6 h-auto"
          >
            <ExternalLink className="h-5 w-5 mr-2" />
            Open Socket.IO Admin UI
          </Button>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Connection Monitoring</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Monitor all active WebSocket connections, user sessions, and
              connection health in real-time.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg">Event Debugging</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Debug Socket.IO events, inspect message payloads, and track
              real-time communication.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-lg">Room Management</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage Socket.IO rooms, monitor room memberships, and control
              message broadcasting.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Access</CardTitle>
            <CardDescription>
              Direct links to monitoring and documentation tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={openSocketAdmin}
              variant="outline"
              className="w-full justify-start"
            >
              <Activity className="h-4 w-4 mr-2" />
              Socket.IO Admin UI (/admin/socket.io)
            </Button>
            <Button
              onClick={openAPIDocsInNewTab}
              variant="outline"
              className="w-full justify-start"
            >
              <Monitor className="h-4 w-4 mr-2" />
              API Documentation
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Connection Status</CardTitle>
            <CardDescription>
              Current WebSocket connection status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">WebSocket Status:</span>
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Admin Interface:</span>
              <Badge variant="default">Available</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Real-time Monitoring:</span>
              <Badge variant="default">Active</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">
                About Socket.IO Admin Interface
              </p>
              <p>
                The Socket.IO Admin UI is a built-in web-based interface that
                provides comprehensive monitoring and debugging capabilities for
                WebSocket connections. It offers real-time insights into:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Active connections and their details</li>
                <li>Socket.IO rooms and namespaces</li>
                <li>Real-time event streaming and debugging</li>
                <li>Connection performance metrics</li>
                <li>Message broadcasting and room management</li>
              </ul>
              <p className="mt-2">
                Access the admin interface at{" "}
                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                  /admin/socket.io
                </code>
                for detailed WebSocket monitoring and management capabilities.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
