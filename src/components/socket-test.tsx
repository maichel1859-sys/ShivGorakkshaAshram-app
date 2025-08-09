"use client";

import { useSocket } from "@/hooks/use-socket";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Wifi, WifiOff } from "lucide-react";

export function SocketTest() {
  const {
    isConnected,
    connectionError,
    socket,
    connectSocket,
    disconnectSocket,
  } = useSocket();

  const handleTestConnection = async () => {
    try {
      await connectSocket();
    } catch (error) {
      console.error("Connection test failed:", error);
    }
  };

  const handleDisconnect = () => {
    disconnectSocket();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Socket.IO Connection Test
        </CardTitle>
        <CardDescription>
          Test real-time WebSocket connection status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Connection Status:</span>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <Badge variant="default" className="bg-green-500">
                  Connected
                </Badge>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <Badge variant="destructive">Disconnected</Badge>
              </>
            )}
          </div>
        </div>

        {/* Socket ID */}
        {isConnected && socket && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Socket ID:</span>
            <Badge variant="outline" className="font-mono text-xs">
              {socket.id}
            </Badge>
          </div>
        )}

        {/* Error Display */}
        {connectionError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-red-800">Connection Error</p>
              <p className="text-red-600">{connectionError}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleTestConnection}
            disabled={isConnected}
            className="flex-1"
          >
            {isConnected ? "Connected" : "Test Connection"}
          </Button>
          <Button
            onClick={handleDisconnect}
            disabled={!isConnected}
            variant="outline"
            className="flex-1"
          >
            Disconnect
          </Button>
        </div>

        {/* Connection Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• WebSocket transport preferred</p>
          <p>• Automatic reconnection enabled</p>
          <p>• Room-based communication</p>
          <p>• Type-safe event handling</p>
        </div>
      </CardContent>
    </Card>
  );
}
