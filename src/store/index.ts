// Store exports - Organized by functionality
// Following the principle: Zustand for UI state, React Query for remote data

// UI State Stores (Zustand)
export { useUIStore, useSidebarCollapsed, useModalState, useDrawerState, useLoadingState, useTheme, useLanguage } from './ui-store';
export { useAppStore, useSidebarCollapsed as useAppSidebarCollapsed, useCurrentPage, useAppLoading, useAppError, useCompactMode, useShowWelcomeMessage } from './app-store';

// Authentication Store (UI state only) - Updated export names
export { useAuthUIStore, useShowLoginModal, useShowSignupModal, useIsAuthenticating, useAuthError } from './auth-store';

// Notification Store
export { useNotificationStore, useUnreadNotificationCount, useNotificationLoading } from './notification-store';

// Queue Store
export { useQueueStore } from './queue-store'; 