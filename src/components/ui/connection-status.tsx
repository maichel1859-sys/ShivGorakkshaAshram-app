"use client";

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  WifiOff,
  Zap,
  ZapOff,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useSocket } from '@/lib/socket/socket-client';
import { useOfflineStore } from '@/store/offline-store';
import { toast } from 'sonner';

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function ConnectionStatus({ 
  className = "", 
  showDetails = true,
  compact = false 
}: ConnectionStatusProps) {
  const { connectionStatus } = useSocket();
  const { 
    isOnline, 
    lastOnline, 
    lastSync, 
    pendingActions,
    enableOfflineMode,
    setOnlineStatus 
  } = useOfflineStore();
  
  const [networkOnline, setNetworkOnline] = useState(true);

  // Monitor network connectivity
  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setNetworkOnline(online);
      setOnlineStatus(online);
    };

    // Initial check
    updateOnlineStatus();

    // Listen for network changes
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [setOnlineStatus]);

  const getConnectionState = () => {
    if (!networkOnline) {
      return {
        status: 'offline',
        color: 'bg-red-500',
        icon: WifiOff,
        label: 'Offline',
        description: 'No internet connection'
      };
    }

    if (connectionStatus.connected) {
      return {
        status: 'connected',
        color: 'bg-green-500',
        icon: Zap,
        label: 'Real-time',
        description: 'Socket connected - instant updates active'
      };
    }

    if (isOnline) {
      return {
        status: 'fallback',
        color: 'bg-yellow-500',
        icon: Clock,
        label: 'Fallback',
        description: 'Using automatic fallback - polling for updates'
      };
    }

    return {
      status: 'unknown',
      color: 'bg-gray-500',
      icon: AlertTriangle,
      label: 'Unknown',
      description: 'Connection status unclear'
    };
  };

  const connectionState = getConnectionState();
  const Icon = connectionState.icon;
  const hasPendingActions = pendingActions.length > 0;

  const formatLastSeen = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const handleRetryConnection = () => {
    toast.info('Attempting to reconnect...');
    // Force a reload to re-initialize socket connection
    window.location.reload();
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${connectionState.color} 
          ${connectionState.status === 'connected' ? 'animate-pulse' : ''}`} />
        {hasPendingActions && (
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" />
        )}
      </div>
    );
  }

  if (!showDetails) {
    return (
      <Badge 
        variant="outline" 
        className={`${className} ${connectionState.color} text-white border-0`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {connectionState.label}
        {hasPendingActions && (
          <span className="ml-1 px-1 py-0.5 text-xs bg-orange-500 rounded-full">
            {pendingActions.length}
          </span>
        )}
      </Badge>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`${className} relative`}
        >
          <Icon className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">{connectionState.label}</span>
          <div className={`w-2 h-2 rounded-full ${connectionState.color} ml-2`} />
          
          {hasPendingActions && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">
                {pendingActions.length}
              </span>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Icon className="w-4 h-4" />
              Connection Status
            </CardTitle>
            <CardDescription className="text-xs">
              {connectionState.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Connection Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-medium">Network</div>
                <div className="flex items-center gap-1">
                  {networkOnline ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-red-500" />
                  )}
                  <span>{networkOnline ? 'Online' : 'Offline'}</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="font-medium">Real-time</div>
                <div className="flex items-center gap-1">
                  {connectionStatus.connected ? (
                    <Zap className="w-3 h-3 text-green-500" />
                  ) : (
                    <ZapOff className="w-3 h-3 text-gray-500" />
                  )}
                  <span>
                    {connectionStatus.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>

            {/* Timing Information */}
            {(lastOnline || lastSync) && (
              <div className="space-y-2 text-xs border-t pt-3">
                {lastOnline && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last online:</span>
                    <span>{formatLastSeen(lastOnline)}</span>
                  </div>
                )}
                
                {lastSync && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last sync:</span>
                    <span>{formatLastSeen(lastSync)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Pending Actions */}
            {hasPendingActions && (
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-3 h-3 text-orange-500" />
                  <span className="font-medium">Pending Actions</span>
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    {pendingActions.length}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Actions will sync automatically when connection is restored.
                </div>
              </div>
            )}

            {/* Offline Mode Status */}
            {enableOfflineMode && (
              <div className="flex items-center gap-2 text-xs border-t pt-3">
                <CheckCircle className="w-3 h-3 text-blue-500" />
                <span>Offline mode enabled</span>
              </div>
            )}

            {/* Reconnect Button */}
            {!connectionStatus.connected && networkOnline && (
              <div className="border-t pt-3">
                <Button 
                  onClick={handleRetryConnection}
                  size="sm" 
                  variant="outline" 
                  className="w-full text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry Connection
                </Button>
              </div>
            )}
            
            {/* Socket Connection Info */}
            {connectionStatus.socketId && (
              <div className="text-xs text-muted-foreground border-t pt-2">
                Socket ID: {connectionStatus.socketId.substring(0, 8)}...
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

// Simple connection indicator for header/nav use
export function ConnectionIndicator({ className = "" }: { className?: string }) {
  return <ConnectionStatus className={className} showDetails={false} />;
}

// Minimal dot indicator
export function ConnectionDot({ className = "" }: { className?: string }) {
  return <ConnectionStatus className={className} compact showDetails={false} />;
}