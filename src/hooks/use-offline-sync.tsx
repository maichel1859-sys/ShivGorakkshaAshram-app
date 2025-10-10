"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "@/lib/actions/appointment-actions";
import { checkInWithQR } from "@/lib/actions/checkin-actions";
import { manualCheckIn } from "@/lib/actions/coordinator-actions";
import { updateUserProfile } from "@/lib/actions/user-actions";
import { Appointment, QueueEntry } from "@/types";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  updatedAt: Date;
}

interface OfflineData {
  appointments: Appointment[];
  queueEntries: QueueEntry[];
  userProfile: UserProfile | null;
  lastSync: string;
}

interface AppointmentActionData {
  id?: string;
  userId: string;
  gurujiId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
  priority?: string;
  status?: string;
}

interface CheckinActionData {
  qrCode?: string;
  appointmentId?: string;
  userId?: string;
  locationId?: string;
}

interface ProfileUpdateData {
  name?: string;
  phone?: string;
  email?: string;
}

type ActionData = AppointmentActionData | CheckinActionData | ProfileUpdateData;

interface PendingAction {
  id: string;
  type: "appointment" | "checkin" | "profile_update";
  action: "create" | "update" | "delete";
  data: ActionData;
  timestamp: string;
  retryCount: number;
}

export function useOfflineSync() {
  const { data: session } = useSession();
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null);
  const syncPendingActionsRef = useRef<(() => Promise<void>) | null>(null);

  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);

      if (online && pendingActions.length > 0) {
        syncPendingActionsRef.current?.();
      }
    };

    // Set initial status
    updateOnlineStatus();

    // Listen for online/offline events
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, [pendingActions.length]);

  // Load offline data from localStorage
  useEffect(() => {
    if (session?.user?.id) {
      const stored = localStorage.getItem(`offline_data_${session.user.id}`);
      if (stored) {
        try {
          setOfflineData(JSON.parse(stored));
        } catch (_error) {
          console.error("Failed to parse offline data:", _error);
        }
      }

      const storedActions = localStorage.getItem(
        `pending_actions_${session.user.id}`
      );
      if (storedActions) {
        try {
          setPendingActions(JSON.parse(storedActions));
        } catch (_error) {
          console.error("Failed to parse pending actions:", _error);
        }
      }
    }
  }, [session?.user?.id]);

  // Save offline data to localStorage
  const saveOfflineData = useCallback(
    (data: OfflineData) => {
      if (session?.user?.id) {
        localStorage.setItem(
          `offline_data_${session.user.id}`,
          JSON.stringify(data)
        );
        setOfflineData(data);
      }
    },
    [session?.user?.id]
  );

  // Save pending actions to localStorage
  const savePendingActions = useCallback(
    (actions: PendingAction[]) => {
      if (session?.user?.id) {
        localStorage.setItem(
          `pending_actions_${session.user.id}`,
          JSON.stringify(actions)
        );
        setPendingActions(actions);
      }
    },
    [session?.user?.id]
  );

  // Add pending action when offline
  const addPendingAction = useCallback(
    (
      type: PendingAction["type"],
      action: PendingAction["action"],
      data: ActionData
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

      toast.success("Action saved for when you're back online", {
        icon: "📱",
        duration: 3000,
      });
    },
    [pendingActions, savePendingActions]
  );

  // Sync pending actions when back online
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || pendingActions.length === 0 || isSyncing) return;

    setIsSyncing(true);
    toast.loading("Syncing offline changes...", { id: "offline-sync" });

    const failedActions: PendingAction[] = [];
    const successfulActions: string[] = [];

    for (const action of pendingActions) {
      try {
        let success = false;

        switch (action.type) {
          case "appointment":
            success = await syncAppointmentAction(action);
            break;
          case "checkin":
            success = await syncCheckinAction(action);
            break;
          case "profile_update":
            success = await syncProfileAction(action);
            break;
        }

        if (success) {
          successfulActions.push(action.id);
        } else {
          failedActions.push({ ...action, retryCount: action.retryCount + 1 });
        }
      } catch (_error) {
        console.error("Sync error for action:", action, _error);
        failedActions.push({ ...action, retryCount: action.retryCount + 1 });
      }
    }

    // Update pending actions (remove successful ones, keep failed ones)
    const remainingActions = failedActions.filter(
      (action) => action.retryCount < 3
    );
    savePendingActions(remainingActions);

    setIsSyncing(false);

    if (successfulActions.length > 0) {
      toast.success(`Synced ${successfulActions.length} offline changes`, {
        id: "offline-sync",
      });
    }

    if (remainingActions.length > 0) {
      toast.error(
        `${remainingActions.length} actions failed to sync. Will retry later.`,
        { id: "offline-sync" }
      );
    } else {
      toast.dismiss("offline-sync");
    }
  }, [isOnline, pendingActions, isSyncing, savePendingActions]);

  // Assign to ref for stable reference
  syncPendingActionsRef.current = syncPendingActions;

  // Sync specific action types using Server Actions
  const syncAppointmentAction = async (
    action: PendingAction
  ): Promise<boolean> => {
    try {
      let result;

      switch (action.action) {
        case "create":
          result = await createAppointment(action.data as FormData);
          break;
        case "update":
          result = await updateAppointment(action.id!, action.data as FormData);
          break;
        case "delete":
          result = await deleteAppointment(action.id!);
          break;
        default:
          return false;
      }

      return result?.success || false;
    } catch {
      return false;
    }
  };

  const syncCheckinAction = async (action: PendingAction): Promise<boolean> => {
    try {
      let result;

      // Determine which checkin action to use based on data structure
      const data = action.data as CheckinActionData;

      // Convert data to FormData for Server Actions
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });

      if (data.qrCode) {
        result = await checkInWithQR(formData);
      } else if (data.appointmentId) {
        result = await manualCheckIn(data.appointmentId, data.locationId || 'ASHRAM_MAIN');
      } else {
        return false;
      }

      return result?.success || false;
    } catch {
      return false;
    }
  };

  const syncProfileAction = async (action: PendingAction): Promise<boolean> => {
    try {
      const result = await updateUserProfile(action.data as FormData);
      return result?.success || false;
    } catch {
      return false;
    }
  };

  // Cache data for offline use - Note: This would need Server Actions for data fetching
  const cacheData = useCallback(async () => {
    if (!isOnline || !session?.user?.id) return;

    try {
      // For now, we'll skip caching since we need to create Server Actions for data fetching
      // This would require creating Server Actions like getAppointments, getQueueEntries, getUserProfile
      // For now, we'll just update the last sync timestamp
      const data: OfflineData = {
        appointments: [],
        queueEntries: [],
        userProfile: null,
        lastSync: new Date().toISOString(),
      };

      saveOfflineData(data);
    } catch (_error) {
      console.error("Failed to cache data:", _error);
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
  const getCachedData = useCallback(
    (type: keyof OfflineData) => {
      return offlineData?.[type] || null;
    },
    [offlineData]
  );

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
