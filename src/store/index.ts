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
  useShowWelcomeMessage 
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

export { 
  useNotificationStore,
  useNotifications,
  useUnreadCount,
  useUnreadNotificationCount,
  useMarkAsRead,
  useAddNotification,
  useClearNotifications
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

export { 
  useUIStore,
  useSidebarCollapsed,
  useModalState,
  useDrawerState,
  useTheme,
  useLanguage
} from './ui-store';

export {
  useOfflineStore,
  useOfflineData,
  usePendingActions,
  useOfflineStatus,
  useOfflineConfig
} from './offline-store'; 