import { useState, useEffect } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  lastOnline: Date | null;
  lastOffline: Date | null;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastOnline: null,
    lastOffline: null,
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const isOnline = navigator.onLine;
      setNetworkStatus(prev => ({
        ...prev,
        isOnline,
        lastOnline: isOnline ? new Date() : prev.lastOnline,
        lastOffline: !isOnline ? new Date() : prev.lastOffline,
      }));
    };

    // Set initial status
    updateNetworkStatus();

    // Add event listeners
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  return networkStatus;
} 