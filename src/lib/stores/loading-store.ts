import { create } from 'zustand';

export interface LoadingState {
  // Global loading states
  globalLoading: boolean;
  authLoading: boolean;
  
  // Page-specific loading states
  dashboardLoading: boolean;
  appointmentsLoading: boolean;
  queueLoading: boolean;
  profileLoading: boolean;
  
  // Action-specific loading states
  bookingLoading: boolean;
  checkinLoading: boolean;
  qrScanLoading: boolean;
  
  // Admin loading states
  adminUsersLoading: boolean;
  adminStatsLoading: boolean;
  
  // Guruji loading states
  gurujiQueueLoading: boolean;
  consultationLoading: boolean;
  
  // Actions
  setGlobalLoading: (loading: boolean) => void;
  setAuthLoading: (loading: boolean) => void;
  setDashboardLoading: (loading: boolean) => void;
  setAppointmentsLoading: (loading: boolean) => void;
  setQueueLoading: (loading: boolean) => void;
  setProfileLoading: (loading: boolean) => void;
  setBookingLoading: (loading: boolean) => void;
  setCheckinLoading: (loading: boolean) => void;
  setQrScanLoading: (loading: boolean) => void;
  setAdminUsersLoading: (loading: boolean) => void;
  setAdminStatsLoading: (loading: boolean) => void;
  setGurujiQueueLoading: (loading: boolean) => void;
  setConsultationLoading: (loading: boolean) => void;
  
  // Utility actions
  setLoading: (key: keyof Omit<LoadingState, 'setGlobalLoading' | 'setAuthLoading' | 'setDashboardLoading' | 'setAppointmentsLoading' | 'setQueueLoading' | 'setProfileLoading' | 'setBookingLoading' | 'setCheckinLoading' | 'setQrScanLoading' | 'setAdminUsersLoading' | 'setAdminStatsLoading' | 'setGurujiQueueLoading' | 'setConsultationLoading' | 'setLoading' | 'clearAllLoading'>, loading: boolean) => void;
  clearAllLoading: () => void;
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
  // Initial states
  globalLoading: false,
  authLoading: false,
  dashboardLoading: false,
  appointmentsLoading: false,
  queueLoading: false,
  profileLoading: false,
  bookingLoading: false,
  checkinLoading: false,
  qrScanLoading: false,
  adminUsersLoading: false,
  adminStatsLoading: false,
  gurujiQueueLoading: false,
  consultationLoading: false,

  // Individual setters
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
  setAuthLoading: (loading) => set({ authLoading: loading }),
  setDashboardLoading: (loading) => set({ dashboardLoading: loading }),
  setAppointmentsLoading: (loading) => set({ appointmentsLoading: loading }),
  setQueueLoading: (loading) => set({ queueLoading: loading }),
  setProfileLoading: (loading) => set({ profileLoading: loading }),
  setBookingLoading: (loading) => set({ bookingLoading: loading }),
  setCheckinLoading: (loading) => set({ checkinLoading: loading }),
  setQrScanLoading: (loading) => set({ qrScanLoading: loading }),
  setAdminUsersLoading: (loading) => set({ adminUsersLoading: loading }),
  setAdminStatsLoading: (loading) => set({ adminStatsLoading: loading }),
  setGurujiQueueLoading: (loading) => set({ gurujiQueueLoading: loading }),
  setConsultationLoading: (loading) => set({ consultationLoading: loading }),

  // Generic setter
  setLoading: (key, loading) => {
    set({ [key]: loading });
  },

  // Clear all loading states
  clearAllLoading: () => set({
    globalLoading: false,
    authLoading: false,
    dashboardLoading: false,
    appointmentsLoading: false,
    queueLoading: false,
    profileLoading: false,
    bookingLoading: false,
    checkinLoading: false,
    qrScanLoading: false,
    adminUsersLoading: false,
    adminStatsLoading: false,
    gurujiQueueLoading: false,
    consultationLoading: false,
  }),
}));
