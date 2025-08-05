'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

interface OfflineData {
  appointments: any[];
  queueEntries: any[];
  userProfile: any;
  lastSync: string;
}

interface PendingAction {
  id: string;
  type: 'appointment' | 'checkin' | 'profile_update';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  retryCount: number;
}

export function useOfflineSync() {
  const { data: session } = useSession();
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null);

  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      if (online && pendingActions.length > 0) {
        syncPendingActions();
      }
    };

    // Set initial status
    updateOnlineStatus();

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [pendingActions.length]);

  // Load offline data from localStorage
  useEffect(() => {
    if (session?.user?.id) {
      const stored = localStorage.getItem(`offline_data_${session.user.id}`);
      if (stored) {
        try {
          setOfflineData(JSON.parse(stored));
        } catch (error) {
          console.error('Failed to parse offline data:', error);
        }
      }

      const storedActions = localStorage.getItem(`pending_actions_${session.user.id}`);
      if (storedActions) {
        try {
          setPendingActions(JSON.parse(storedActions));
        } catch (error) {
          console.error('Failed to parse pending actions:', error);
        }
      }
    }
  }, [session?.user?.id]);

  // Save offline data to localStorage
  const saveOfflineData = useCallback((data: OfflineData) => {
    if (session?.user?.id) {
      localStorage.setItem(`offline_data_${session.user.id}`, JSON.stringify(data));
      setOfflineData(data);
    }
  }, [session?.user?.id]);

  // Save pending actions to localStorage
  const savePendingActions = useCallback((actions: PendingAction[]) => {
    if (session?.user?.id) {
      localStorage.setItem(`pending_actions_${session.user.id}`, JSON.stringify(actions));
      setPendingActions(actions);
    }
  }, [session?.user?.id]);

  // Add pending action when offline
  const addPendingAction = useCallback((
    type: PendingAction['type'],
    action: PendingAction['action'],
    data: any
  ) => {
    const pendingAction: PendingAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      action,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    const updatedActions = [...pendingActions, pendingAction];
    savePendingActions(updatedActions);

    toast.success('Action saved for when you\'re back online', {
      icon: '📱',
      duration: 3000,
    });
  }, [pendingActions, savePendingActions]);

  // Sync pending actions when back online
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || pendingActions.length === 0 || isSyncing) return;

    setIsSyncing(true);
    toast.loading('Syncing offline changes...', { id: 'offline-sync' });

    const failedActions: PendingAction[] = [];
    const successfulActions: string[] = [];

    for (const action of pendingActions) {
      try {
        let success = false;

        switch (action.type) {
          case 'appointment':
            success = await syncAppointmentAction(action);
            break;
          case 'checkin':
            success = await syncCheckinAction(action);
            break;
          case 'profile_update':
            success = await syncProfileAction(action);
            break;
        }

        if (success) {
          successfulActions.push(action.id);
        } else {
          failedActions.push({ ...action, retryCount: action.retryCount + 1 });
        }
      } catch (error) {
        console.error('Sync error for action:', action, error);
        failedActions.push({ ...action, retryCount: action.retryCount + 1 });
      }
    }

    // Update pending actions (remove successful ones, keep failed ones)
    const remainingActions = failedActions.filter(action => action.retryCount < 3);
    savePendingActions(remainingActions);

    setIsSyncing(false);

    if (successfulActions.length > 0) {
      toast.success(`Synced ${successfulActions.length} offline changes`, { id: 'offline-sync' });
    }

    if (remainingActions.length > 0) {
      toast.error(`${remainingActions.length} actions failed to sync. Will retry later.`, { id: 'offline-sync' });
    } else {
      toast.dismiss('offline-sync');
    }
  }, [isOnline, pendingActions, isSyncing, savePendingActions]);

  // Sync specific action types
  const syncAppointmentAction = async (action: PendingAction): Promise<boolean> => {
    try {
      const response = await fetch('/api/appointments', {
        method: action.action === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const syncCheckinAction = async (action: PendingAction): Promise<boolean> => {
    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const syncProfileAction = async (action: PendingAction): Promise<boolean> => {
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Cache data for offline use
  const cacheData = useCallback(async () => {
    if (!isOnline || !session?.user?.id) return;

    try {
      const [appointmentsRes, queueRes, profileRes] = await Promise.all([
        fetch('/api/appointments').catch(() => null),
        fetch('/api/queue').catch(() => null),
        fetch('/api/users/profile').catch(() => null),
      ]);

      const data: OfflineData = {
        appointments: appointmentsRes?.ok ? await appointmentsRes.json() : [],
        queueEntries: queueRes?.ok ? await queueRes.json() : [],
        userProfile: profileRes?.ok ? await profileRes.json() : null,
        lastSync: new Date().toISOString(),
      };

      saveOfflineData(data);
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }, [isOnline, session?.user?.id, saveOfflineData]);

  // Auto-cache data periodically when online
  useEffect(() => {
    if (isOnline && session?.user?.id) {
      cacheData();
      
      // Cache data every 5 minutes when online
      const interval = setInterval(cacheData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isOnline, session?.user?.id, cacheData]);

  // Clear offline data
  const clearOfflineData = useCallback(() => {
    if (session?.user?.id) {
      localStorage.removeItem(`offline_data_${session.user.id}`);
      localStorage.removeItem(`pending_actions_${session.user.id}`);
      setOfflineData(null);
      setPendingActions([]);
    }
  }, [session?.user?.id]);

  // Get cached data when offline
  const getCachedData = useCallback((type: keyof OfflineData) => {
    return offlineData?.[type] || null;
  }, [offlineData]);

  return {
    isOnline,
    isSyncing,
    pendingActions: pendingActions.length,
    lastSync: offlineData?.lastSync,
    addPendingAction,
    syncPendingActions,
    cacheData,
    clearOfflineData,
    getCachedData,
  };
}