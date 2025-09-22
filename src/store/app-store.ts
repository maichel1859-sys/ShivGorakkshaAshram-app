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
  
  // Modal and Drawer states
  modals: {
    [key: string]: boolean;
  };
  
  drawers: {
    [key: string]: boolean;
  };
  
  // Toast notifications
  toasts: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
  }>;
  
  // Theme and appearance
  theme: 'light' | 'dark' | 'system';
  language: string;
  
  // PWA State
  pwaState: {
    canInstall: boolean;
    installPrompt: BeforeInstallPromptEvent | null;
    isInstalled: boolean;
  };
  
  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setCurrentPage: (page: string) => void;
  
  // Loading actions
  setLoading: (loading: boolean) => void;
  setLoadingState: (key: string, loading: boolean) => void;
  setAuthLoading: (loading: boolean) => void;
  setRouteLoading: (loading: boolean) => void;
  setDataLoading: (loading: boolean) => void;
  clearLoadingState: (key: string) => void;
  clearAllLoading: () => void;
  
  // Modal actions
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  closeAllModals: () => void;
  
  // Drawer actions
  openDrawer: (drawerId: string) => void;
  closeDrawer: (drawerId: string) => void;
  closeAllDrawers: () => void;
  
  // Toast actions
  addToast: (toast: Omit<AppUIState['toasts'][0], 'id'>) => void;
  removeToast: (toastId: string) => void;
  clearToasts: () => void;
  
  // Theme actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: string) => void;
  
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
  modals: {},
  drawers: {},
  toasts: [],
  theme: 'system' as const,
  language: 'en',
  pwaState: {
    canInstall: false,
    installPrompt: null,
    isInstalled: false,
  },
};

export const useAppStore = create<AppUIState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
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
      
      // Modal actions
      openModal: (modalId) => set((state) => ({
        modals: { ...state.modals, [modalId]: true }
      })),
      closeModal: (modalId) => set((state) => ({
        modals: { ...state.modals, [modalId]: false }
      })),
      closeAllModals: () => set({ modals: {} }),
      
      // Drawer actions
      openDrawer: (drawerId) => set((state) => ({
        drawers: { ...state.drawers, [drawerId]: true }
      })),
      closeDrawer: (drawerId) => set((state) => ({
        drawers: { ...state.drawers, [drawerId]: false }
      })),
      closeAllDrawers: () => set({ drawers: {} }),
      
      // Toast actions
      addToast: (toast) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast = { ...toast, id };
        set((state) => ({ toasts: [...state.toasts, newToast] }));
        
        // Auto-remove toast after duration
        if (toast.duration !== 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, toast.duration || 5000);
        }
      },
      removeToast: (toastId) => set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== toastId)
      })),
      clearToasts: () => set({ toasts: [] }),
      
      // Theme actions
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      
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
        theme: state.theme,
        language: state.language,
        pwaState: state.pwaState,
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

// UI selector hooks
export const useModalState = (modalId: string) => useAppStore((state) => state.modals[modalId] || false);
export const useDrawerState = (drawerId: string) => useAppStore((state) => state.drawers[drawerId] || false);
export const useTheme = () => useAppStore((state) => state.theme);
export const useLanguage = () => useAppStore((state) => state.language);
export const useToasts = () => useAppStore((state) => state.toasts);