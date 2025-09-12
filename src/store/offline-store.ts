import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types for offline data
interface OfflineAppointment {
  id: string;
  userId: string;
  gurujiId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  lastModified: string;
}

interface OfflineQueueEntry {
  id: string;
  userId: string;
  position: number;
  status: string;
  checkedInAt?: string;
  estimatedWaitTime?: number;
  lastModified: string;
}

interface OfflineRemedy {
  id: string;
  patientId: string;
  templateId: string;
  gurujiId: string;
  title: string;
  description: string;
  instructions: string[];
  createdAt: string;
  lastModified: string;
}

interface OfflineUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  lastModified: string;
}

interface PendingAction {
  id: string;
  type: 'appointment' | 'queue' | 'remedy' | 'profile' | 'checkin';
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
  priority: 'low' | 'medium' | 'high';
  userId?: string;
}

interface OfflineState {
  // Online/Offline status
  isOnline: boolean;
  lastOnline: Date | null;
  lastOffline: Date | null;
  lastSync: Date | null;
  
  // Cached data
  appointments: OfflineAppointment[];
  queueEntries: OfflineQueueEntry[];
  remedies: OfflineRemedy[];
  userProfile: OfflineUser | null;
  
  // Pending actions
  pendingActions: PendingAction[];
  syncProgress: number;
  
  // Configuration
  enableOfflineMode: boolean;
  autoSync: boolean;
  syncInterval: number; // in minutes
  
  // Actions
  setOnlineStatus: (isOnline: boolean) => void;
  setLastOnline: (date: Date) => void;
  setLastOffline: (date: Date) => void;
  setLastSync: (date: Date) => void;
  
  // Data caching
  cacheAppointments: (appointments: OfflineAppointment[]) => void;
  cacheQueueEntries: (entries: OfflineQueueEntry[]) => void;
  cacheRemedies: (remedies: OfflineRemedy[]) => void;
  cacheUserProfile: (user: OfflineUser) => void;
  
  // Pending actions management
  addPendingAction: (action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>) => void;
  removePendingAction: (id: string) => void;
  updatePendingAction: (id: string, updates: Partial<PendingAction>) => void;
  clearPendingActions: () => void;
  
  // Sync management
  setSyncProgress: (progress: number) => void;
  
  // Configuration
  setEnableOfflineMode: (enabled: boolean) => void;
  setAutoSync: (enabled: boolean) => void;
  setSyncInterval: (minutes: number) => void;
  
  // Data retrieval
  getAppointmentById: (id: string) => OfflineAppointment | null;
  getQueueEntryById: (id: string) => OfflineQueueEntry | null;
  getRemedyById: (id: string) => OfflineRemedy | null;
  
  // Data update (optimistic updates)
  updateAppointmentLocally: (id: string, updates: Partial<OfflineAppointment>) => void;
  updateQueueEntryLocally: (id: string, updates: Partial<OfflineQueueEntry>) => void;
  updateRemedyLocally: (id: string, updates: Partial<OfflineRemedy>) => void;
  
  // Cleanup
  clearCache: () => void;
  clearExpiredData: () => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOnline: true,
      lastOnline: null,
      lastOffline: null,
      lastSync: null,
      
      appointments: [],
      queueEntries: [],
      remedies: [],
      userProfile: null,
      
      pendingActions: [],
      syncProgress: 0,
      
      enableOfflineMode: true,
      autoSync: true,
      syncInterval: 5, // 5 minutes
      
      // Status actions
      setOnlineStatus: (isOnline) => {
        set({ 
          isOnline,
          lastOnline: isOnline ? new Date() : get().lastOnline,
          lastOffline: !isOnline ? new Date() : get().lastOffline
        });
      },
      
      setLastOnline: (date) => set({ lastOnline: date }),
      setLastOffline: (date) => set({ lastOffline: date }),
      setLastSync: (date) => set({ lastSync: date }),
      
      // Data caching actions
      cacheAppointments: (appointments) => {
        set({ 
          appointments: appointments.map(apt => ({
            ...apt,
            lastModified: new Date().toISOString()
          }))
        });
      },
      
      cacheQueueEntries: (queueEntries) => {
        set({ 
          queueEntries: queueEntries.map(entry => ({
            ...entry,
            lastModified: new Date().toISOString()
          }))
        });
      },
      
      cacheRemedies: (remedies) => {
        set({ 
          remedies: remedies.map(remedy => ({
            ...remedy,
            lastModified: new Date().toISOString()
          }))
        });
      },
      
      cacheUserProfile: (userProfile) => {
        set({ 
          userProfile: {
            ...userProfile,
            lastModified: new Date().toISOString()
          }
        });
      },
      
      // Pending actions management
      addPendingAction: (actionData) => {
        const action: PendingAction = {
          ...actionData,
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          retryCount: 0
        };
        
        set((state) => ({
          pendingActions: [...state.pendingActions, action]
        }));
      },
      
      removePendingAction: (id) => {
        set((state) => ({
          pendingActions: state.pendingActions.filter(action => action.id !== id)
        }));
      },
      
      updatePendingAction: (id, updates) => {
        set((state) => ({
          pendingActions: state.pendingActions.map(action =>
            action.id === id ? { ...action, ...updates } : action
          )
        }));
      },
      
      clearPendingActions: () => set({ pendingActions: [] }),
      
      // Sync management
      setSyncProgress: (syncProgress) => set({ syncProgress }),
      
      // Configuration
      setEnableOfflineMode: (enableOfflineMode) => set({ enableOfflineMode }),
      setAutoSync: (autoSync) => set({ autoSync }),
      setSyncInterval: (syncInterval) => set({ syncInterval }),
      
      // Data retrieval
      getAppointmentById: (id) => {
        const { appointments } = get();
        return appointments.find(apt => apt.id === id) || null;
      },
      
      getQueueEntryById: (id) => {
        const { queueEntries } = get();
        return queueEntries.find(entry => entry.id === id) || null;
      },
      
      getRemedyById: (id) => {
        const { remedies } = get();
        return remedies.find(remedy => remedy.id === id) || null;
      },
      
      // Local updates (optimistic updates)
      updateAppointmentLocally: (id, updates) => {
        set((state) => ({
          appointments: state.appointments.map(apt =>
            apt.id === id ? { 
              ...apt, 
              ...updates, 
              lastModified: new Date().toISOString() 
            } : apt
          )
        }));
      },
      
      updateQueueEntryLocally: (id, updates) => {
        set((state) => ({
          queueEntries: state.queueEntries.map(entry =>
            entry.id === id ? { 
              ...entry, 
              ...updates, 
              lastModified: new Date().toISOString() 
            } : entry
          )
        }));
      },
      
      updateRemedyLocally: (id, updates) => {
        set((state) => ({
          remedies: state.remedies.map(remedy =>
            remedy.id === id ? { 
              ...remedy, 
              ...updates, 
              lastModified: new Date().toISOString() 
            } : remedy
          )
        }));
      },
      
      // Cleanup
      clearCache: () => {
        set({
          appointments: [],
          queueEntries: [],
          remedies: [],
          userProfile: null,
          lastSync: null
        });
      },
      
      clearExpiredData: () => {
        const now = new Date();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        set((state) => ({
          appointments: state.appointments.filter(apt => 
            now.getTime() - new Date(apt.lastModified).getTime() < maxAge
          ),
          queueEntries: state.queueEntries.filter(entry => 
            now.getTime() - new Date(entry.lastModified).getTime() < maxAge
          ),
          remedies: state.remedies.filter(remedy => 
            now.getTime() - new Date(remedy.lastModified).getTime() < maxAge
          )
        }));
      }
    }),
    {
      name: 'ashram-offline-store',
      version: 1,
      partialize: (state) => ({
        // Only persist necessary data
        appointments: state.appointments,
        queueEntries: state.queueEntries,
        remedies: state.remedies,
        userProfile: state.userProfile,
        pendingActions: state.pendingActions,
        lastSync: state.lastSync,
        enableOfflineMode: state.enableOfflineMode,
        autoSync: state.autoSync,
        syncInterval: state.syncInterval
      })
    }
  )
);

// Selector hooks for better performance
export const useOfflineData = () => useOfflineStore((state) => ({
  appointments: state.appointments,
  queueEntries: state.queueEntries,
  remedies: state.remedies,
  userProfile: state.userProfile
}));

export const usePendingActions = () => useOfflineStore((state) => state.pendingActions);
export const useOfflineStatus = () => useOfflineStore((state) => ({
  isOnline: state.isOnline,
  lastOnline: state.lastOnline,
  lastOffline: state.lastOffline,
  lastSync: state.lastSync,
  syncProgress: state.syncProgress
}));

export const useOfflineConfig = () => useOfflineStore((state) => ({
  enableOfflineMode: state.enableOfflineMode,
  autoSync: state.autoSync,
  syncInterval: state.syncInterval
}));