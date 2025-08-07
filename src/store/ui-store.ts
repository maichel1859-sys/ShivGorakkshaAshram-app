import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Sidebar state
  sidebarCollapsed: boolean;
  
  // Modal states
  modals: {
    [key: string]: boolean;
  };
  
  // Drawer states
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
  
  // Loading states
  loadingStates: {
    [key: string]: boolean;
  };
  
  // Theme and appearance
  theme: 'light' | 'dark' | 'system';
  language: string;
  
  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  
  // Modal actions
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  closeAllModals: () => void;
  
  // Drawer actions
  openDrawer: (drawerId: string) => void;
  closeDrawer: (drawerId: string) => void;
  closeAllDrawers: () => void;
  
  // Toast actions
  addToast: (toast: Omit<UIState['toasts'][0], 'id'>) => void;
  removeToast: (toastId: string) => void;
  clearToasts: () => void;
  
  // Loading actions
  setLoading: (key: string, loading: boolean) => void;
  clearLoading: (key: string) => void;
  clearAllLoading: () => void;
  
  // Theme actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: string) => void;
  
  // Utility actions
  reset: () => void;
}

const initialState = {
  sidebarCollapsed: false,
  modals: {},
  drawers: {},
  toasts: [],
  loadingStates: {},
  theme: 'system' as const,
  language: 'en',
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Sidebar actions
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      
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
      
      // Loading actions
      setLoading: (key, loading) => set((state) => ({
        loadingStates: { ...state.loadingStates, [key]: loading }
      })),
      clearLoading: (key) => set((state) => {
        const newLoadingStates = { ...state.loadingStates };
        delete newLoadingStates[key];
        return { loadingStates: newLoadingStates };
      }),
      clearAllLoading: () => set({ loadingStates: {} }),
      
      // Theme actions
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      
      // Utility actions
      reset: () => set(initialState),
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        language: state.language,
      }),
    }
  )
);

// Selector hooks for better performance
export const useSidebarCollapsed = () => useUIStore((state) => state.sidebarCollapsed);
export const useModalState = (modalId: string) => useUIStore((state) => state.modals[modalId] || false);
export const useDrawerState = (drawerId: string) => useUIStore((state) => state.drawers[drawerId] || false);
export const useLoadingState = (key: string) => useUIStore((state) => state.loadingStates[key] || false);
export const useTheme = () => useUIStore((state) => state.theme);
export const useLanguage = () => useUIStore((state) => state.language); 