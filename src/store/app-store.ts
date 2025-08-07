import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppUIState {
  // UI State Only
  sidebarCollapsed: boolean;
  currentPage: string;
  isLoading: boolean;
  error: string | null;
  
  // UI Preferences (local only)
  compactMode: boolean;
  showWelcomeMessage: boolean;
  
  // PWA State
  pwaState: {
    canInstall: boolean;
    installPrompt: Event | null;
    isInstalled: boolean;
  };
  
  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentPage: (page: string) => void;
  setLoading: (loading: boolean) => void;
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
      setLoading: (loading) => set({ isLoading: loading }),
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
export const useAppError = () => useAppStore((state) => state.error);
export const useCompactMode = () => useAppStore((state) => state.compactMode);
export const useShowWelcomeMessage = () => useAppStore((state) => state.showWelcomeMessage);
export const usePWAState = () => useAppStore((state) => state.pwaState);