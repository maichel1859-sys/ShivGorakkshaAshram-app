// Centralized store exports
export { 
  useAppStore, 
  useSidebarCollapsed as useAppSidebarCollapsed, 
  useCurrentPage, 
  useAppLoading, 
  useLoadingState,
  useAuthLoading,
  useRouteLoading,
  useDataLoading,
  useAppError, 
  useCompactMode, 
  useShowWelcomeMessage,
  useModalState,
  useDrawerState,
  useTheme,
  useLanguage,
  useToasts
} from './app-store';

export { 
  useAuthStore,
  useAuthUIStore,
  useUser,
  useUserRole,
  useIsAuthenticated,
  useIsAdmin,
  useIsGuruji,
  useIsCoordinator,
  useIsUser,
  useShowLoginModal,
  useShowSignupModal,
  useAuthError,
  useSessionStatus,
  useHasRole,
  useHasAnyRole,
  useUserRedirect
} from './auth-store';

// Notification store is now in lib/stores/notification-store.ts
export { 
  useNotificationStore,
  useNotificationSubscription,
  useRealtimeNotifications
} from './notification-store';

export { 
  useQueueStore,
  useQueue,
  useQueuePosition,
  useQueueStatus,
  useJoinQueue,
  useLeaveQueue,
  useUpdateQueueStatus
} from './queue-store';

// UI store functionality is now consolidated in app-store.ts

export {
  useOfflineStore,
  useOfflineData,
  usePendingActions,
  useOfflineStatus,
  useOfflineConfig
} from './offline-store'; 