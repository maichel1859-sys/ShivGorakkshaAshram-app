// Hooks exports - Organized by functionality
// Following the principle: Clear separation between UI state and remote data

// React Query Hooks (Remote Data)
export * from './queries';

// Server Action Hooks
export * from './use-server-action';

// Custom Hooks
export * from './use-socket';
export * from './use-mobile';
export * from './use-offline-sync';
export * from './use-network-status';
export * from './use-pwa';

// Utility Hooks (to be created as needed)
// export * from './use-debounce';
// export * from './use-local-storage';
// export * from './use-media-query'; 