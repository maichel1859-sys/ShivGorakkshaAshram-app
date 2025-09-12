"use client";

import { useEffect, useState } from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw, Clock, Database } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

export function NetworkStatus() {
  const { isOnline, lastOnline, lastOffline } = useNetworkStatus();
  const { isSyncing, pendingActions, syncPendingActions, lastSync } = useOfflineSync();
  const [showDetails, setShowDetails] = useState(false);
  const [justWentOnline, setJustWentOnline] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track when user comes back online
  useEffect(() => {
    if (isOnline && lastOnline) {
      setJustWentOnline(true);
      const timer = setTimeout(() => setJustWentOnline(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, lastOnline]);

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const getStatusColor = () => {
    if (isOnline) {
      return justWentOnline ? "bg-green-500 animate-pulse" : "bg-green-500";
    }
    return "bg-red-500 animate-pulse";
  };

  const getStatusText = () => {
    if (isOnline) {
      if (justWentOnline) return "Back Online";
      if (isSyncing) return "Syncing...";
      if (pendingActions > 0) return `${pendingActions} pending`;
      return "Online";
    }
    return "Offline";
  };

  // Don't render on server-side or during initial hydration
  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={cn(
          "flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg text-white text-sm cursor-pointer transition-all duration-200",
          isOnline 
            ? justWentOnline 
              ? "bg-green-600 shadow-green-500/20" 
              : "bg-green-500 hover:bg-green-600 shadow-green-500/20"
            : "bg-red-500 hover:bg-red-600 shadow-red-500/20"
        )}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className={cn("w-2 h-2 rounded-full", getStatusColor())}></div>
        
        {isOnline ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        
        <span className="font-medium">{getStatusText()}</span>
        
        {isSyncing && (
          <RefreshCw className="h-3 w-3 animate-spin" />
        )}
      </div>

      {/* Detailed Status Panel */}
      {showDetails && (
        <div className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-lg shadow-xl border p-4 text-sm">
          <div className="space-y-3">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Connection:</span>
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? "Online" : "Offline"}
              </Badge>
            </div>

            {/* Last Online */}
            {lastOnline && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Last Online:</span>
                <span className="text-gray-900 font-mono text-xs">
                  {formatTime(lastOnline)}
                </span>
              </div>
            )}

            {/* Last Offline */}
            {lastOffline && !isOnline && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Went Offline:</span>
                <span className="text-gray-900 font-mono text-xs">
                  {formatTime(lastOffline)}
                </span>
              </div>
            )}

            {/* Pending Actions */}
            {pendingActions > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center">
                  <Database className="h-3 w-3 mr-1" />
                  Pending:
                </span>
                <Badge variant="outline">{pendingActions}</Badge>
              </div>
            )}

            {/* Last Sync */}
            {lastSync && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Last Sync:
                </span>
                <span className="text-gray-900 font-mono text-xs">
                  {formatTime(new Date(lastSync))}
                </span>
              </div>
            )}

            {/* Sync Button */}
            {isOnline && pendingActions > 0 && (
              <div className="pt-2 border-t">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={syncPendingActions}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Sync Now
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Offline Mode Info */}
            {!isOnline && (
              <div className="pt-2 border-t text-xs text-gray-500">
                <p>Working in offline mode.</p>
                <p>Changes will sync when online.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}