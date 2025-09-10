import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface AppUIState {
  // UI State Only
  sidebarCollapsed: boolean;
  currentPage: string;
  
  // Centralized Loading System
  isLoading: boolean; // Global loading state
  loadingStates: {
    [key: string]: boolean;
  };
  
  // Specific loading states for better UX
  authLoading: boolean;
  routeLoading: boolean;
  dataLoading: boolean;
  
  error: string | null;
  
  // UI Preferences (local only)
  compactMode: boolean;
  showWelcomeMessage: boolean;
  
  // PWA State
  pwaState: {
    canInstall: boolean;
    installPrompt: BeforeInstallPromptEvent | null;
    isInstalled: boolean;
  };
  
  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentPage: (page: string) => void;
  
  // Loading actions
  setLoading: (loading: boolean) => void;
  setLoadingState: (key: string, loading: boolean) => void;
  setAuthLoading: (loading: boolean) => void;
  setRouteLoading: (loading: boolean) => void;
  setDataLoading: (loading: boolean) => void;
  clearLoadingState: (key: string) => void;
  clearAllLoading: () => void;
  
  setError: (error: string | null) => void;
  setCompactMode: (compact: boolean) => void;
  setShowWelcomeMessage: (show: boolean) => void;
  setPWAState: (state: Partial<AppUIState['pwaState']>) => void;
  reset: () => void;
}

const initialState = {
  sidebarCollapsed: false,
  currentPage: '/',
  isLoading: false,
  loadingStates: {},
  authLoading: false,
  routeLoading: false,
  dataLoading: false,
  error: null,
  compactMode: false,
  showWelcomeMessage: true,
  pwaState: {
    canInstall: false,
    installPrompt: null,
    isInstalled: false,
  },
};

export const useAppStore = create<AppUIState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setCurrentPage: (page) => set({ currentPage: page }),
      
      // Loading actions
      setLoading: (loading) => set({ isLoading: loading }),
      setLoadingState: (key, loading) => set((state) => ({
        loadingStates: { ...state.loadingStates, [key]: loading }
      })),
      setAuthLoading: (loading) => set({ authLoading: loading }),
      setRouteLoading: (loading) => set({ routeLoading: loading }),
      setDataLoading: (loading) => set({ dataLoading: loading }),
      clearLoadingState: (key) => set((state) => {
        const newLoadingStates = { ...state.loadingStates };
        delete newLoadingStates[key];
        return { loadingStates: newLoadingStates };
      }),
      clearAllLoading: () => set({
        isLoading: false,
        loadingStates: {},
        authLoading: false,
        routeLoading: false,
        dataLoading: false,
      }),
      
      setError: (error) => set({ error }),
      setCompactMode: (compact) => set({ compactMode: compact }),
      setShowWelcomeMessage: (show) => set({ showWelcomeMessage: show }),
      setPWAState: (state) => set((prev) => ({ 
        pwaState: { ...prev.pwaState, ...state } 
      })),
      reset: () => set(initialState),
    }),
    {
      name: 'app-ui-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        compactMode: state.compactMode,
        showWelcomeMessage: state.showWelcomeMessage,
      }),
    }
  )
);

// Selector hooks for better performance
export const useSidebarCollapsed = () => useAppStore((state) => state.sidebarCollapsed);
export const useCurrentPage = () => useAppStore((state) => state.currentPage);
export const useAppLoading = () => useAppStore((state) => state.isLoading);
export const useLoadingState = (key: string) => useAppStore((state) => state.loadingStates[key] || false);
export const useAuthLoading = () => useAppStore((state) => state.authLoading);
export const useRouteLoading = () => useAppStore((state) => state.routeLoading);
export const useDataLoading = () => useAppStore((state) => state.dataLoading);
export const useAppError = () => useAppStore((state) => state.error);
export const useCompactMode = () => useAppStore((state) => state.compactMode);
export const useShowWelcomeMessage = () => useAppStore((state) => state.showWelcomeMessage);
export const usePWAState = () => useAppStore((state) => state.pwaState);