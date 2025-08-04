import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface NetworkState {
  isOnline: boolean;
  lastOnline: number | null;
  connectionType: 'wifi' | '4g' | '3g' | '2g' | 'unknown';
}

interface PWAState {
  isInstalled: boolean;
  canInstall: boolean;
  installPrompt: unknown | null;
  isUpdateAvailable: boolean;
}

interface SystemSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    enabled: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  preferences: {
    autoRefresh: boolean;
    refreshInterval: number; // in seconds
    compactMode: boolean;
    showWelcomeMessage: boolean;
  };
}

interface AppState {
  // Network & PWA
  network: NetworkState;
  pwa: PWAState;
  
  // Settings
  settings: SystemSettings;
  
  // UI State
  sidebarCollapsed: boolean;
  currentPage: string;
  isLoading: boolean;
  error: string | null;
  
  // Cache management
  lastDataSync: number | null;
  cacheVersion: string;
  
  // Cleanup functions
  cleanupListeners?: () => void;
  cleanupPWA?: () => void;
  
  // Actions
  setNetworkStatus: (isOnline: boolean, connectionType?: string) => void;
  setPWAState: (updates: Partial<PWAState>) => void;
  updateSettings: (updates: Partial<SystemSettings>) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentPage: (page: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastDataSync: (timestamp: number) => void;
  clearCache: () => void;
  initializeApp: () => void;
  cleanup: () => void;
}

const defaultSettings: SystemSettings = {
  theme: 'system',
  language: 'en',
  notifications: {
    enabled: true,
    email: true,
    sms: false,
    push: true,
  },
  preferences: {
    autoRefresh: true,
    refreshInterval: 30,
    compactMode: false,
    showWelcomeMessage: true,
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      network: {
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        lastOnline: null,
        connectionType: 'unknown',
      },
      
      pwa: {
        isInstalled: false,
        canInstall: false,
        installPrompt: null,
        isUpdateAvailable: false,
      },
      
      settings: defaultSettings,
      sidebarCollapsed: false,
      currentPage: '/',
      isLoading: false,
      error: null,
      lastDataSync: null,
      cacheVersion: '1.0.0',

      // Actions
      setNetworkStatus: (isOnline, connectionType = 'unknown') => {
        const now = Date.now();
        set(state => ({
          network: {
            ...state.network,
            isOnline,
            connectionType: connectionType as 'wifi' | '4g' | '3g' | '2g' | 'unknown',
            lastOnline: isOnline ? now : state.network.lastOnline || now,
          },
        }));
      },

      setPWAState: (updates) => {
        set(state => ({
          pwa: { ...state.pwa, ...updates },
        }));
      },

      updateSettings: (updates) => {
        set(state => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      setCurrentPage: (page) => set({ currentPage: page }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      setLastDataSync: (timestamp) => set({ lastDataSync: timestamp }),

      clearCache: () => {
        set({
          lastDataSync: null,
          cacheVersion: Date.now().toString(),
        });
      },

      initializeApp: () => {
        const state = get();
        
        // Set up network listeners
        if (typeof window !== 'undefined') {
          const handleOnline = () => state.setNetworkStatus(true);
          const handleOffline = () => state.setNetworkStatus(false);
          
          window.addEventListener('online', handleOnline);
          window.addEventListener('offline', handleOffline);
          
          // Store cleanup functions for later removal
          state.cleanupListeners = () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
          };
          
          // Detect connection type
          if ('connection' in navigator) {
            const connection = (navigator as Record<string, unknown>).connection;
            if (connection) {
              state.setNetworkStatus(navigator.onLine, (connection as Record<string, string>).effectiveType);
            }
          }
        }

        // Initialize PWA detection
        if (typeof window !== 'undefined') {
          // Check if app is installed
          const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
          
          // Listen for beforeinstallprompt
          const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            state.setPWAState({
              canInstall: true,
              installPrompt: e,
            });
          };
          
          window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

          // Check for updates
          if ('serviceWorker' in navigator) {
            const handleControllerChange = () => {
              state.setPWAState({ isUpdateAvailable: true });
            };
            
            navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
            
            // Store PWA cleanup functions
            state.cleanupPWA = () => {
              window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
              navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
            };
          }

          state.setPWAState({ isInstalled });
        }
      },

      cleanup: () => {
        const state = get();
        if (state.cleanupListeners) {
          state.cleanupListeners();
        }
        if (state.cleanupPWA) {
          state.cleanupPWA();
        }
      },
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        sidebarCollapsed: state.sidebarCollapsed,
        cacheVersion: state.cacheVersion,
      }),
    }
  )
);

// Selectors for better performance
export const useNetworkStatus = () => useAppStore(state => state.network);
export const usePWAState = () => useAppStore(state => state.pwa);
export const useAppSettings = () => useAppStore(state => state.settings);
export const useUIState = () => useAppStore(state => ({
  sidebarCollapsed: state.sidebarCollapsed,
  currentPage: state.currentPage,
  isLoading: state.isLoading,
  error: state.error,
}));