// PWA Metadata and Configuration Helper
export const PWA_CONFIG = {
  name: 'Shivgoraksha Ashram Management System',
  shortName: 'Shivgoraksha Ashram',
  description: 'Complete management system for Shivgoraksha Ashram - Appointments, Queue Management, and Spiritual Consultations',
  themeColor: '#0f172a',
  backgroundColor: '#ffffff',
  version: '1.1.0',
  scope: '/',
  startUrl: '/',
  display: 'standalone' as const,
  orientation: 'portrait-primary' as const,
} as const;

export const PWA_FEATURES = {
  offlineSupport: true,
  pushNotifications: true,
  backgroundSync: true,
  installPrompt: true,
  shortcuts: true,
  shareTarget: true,
  fileHandling: true,
} as const;

export const PWA_ICONS = {
  sizes: [72, 96, 128, 144, 152, 192, 384, 512] as const,
  format: 'svg' as const, // Change to 'png' for production
  basePath: '/icons/',
} as const;

// Check PWA support and capabilities
export function checkPWASupport() {
  if (typeof window === 'undefined') return null;

  const support = {
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notifications: 'Notification' in window,
    backgroundSync: 'sync' in window.ServiceWorkerRegistration.prototype,
    periodicBackgroundSync: 'periodicSync' in window.ServiceWorkerRegistration.prototype,
    badgeAPI: 'setAppBadge' in navigator,
    shareAPI: 'share' in navigator,
    installPrompt: 'BeforeInstallPromptEvent' in window || 'beforeinstallprompt' in window,
    displayMode: window.matchMedia('(display-mode: standalone)').matches,
  };

  return support;
}

// Get PWA install status
export function getPWAStatus() {
  if (typeof window === 'undefined') return null;

  return {
    isInstalled: window.matchMedia('(display-mode: standalone)').matches ||
                 (window.navigator as { standalone?: boolean }).standalone === true,
    isIOSDevice: /iPad|iPhone|iPod/.test(navigator.userAgent),
    isAndroid: /Android/.test(navigator.userAgent),
    supportLevel: checkPWASupport(),
  };
}

// PWA Installation Analytics
export function logPWAEvent(event: string, data?: Record<string, unknown>) {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') {
    console.log(`PWA Event: ${event}`, data);
    return;
  }

  // Send to analytics service (implement based on your analytics provider)
  if (window.gtag) {
    window.gtag('event', event, {
      event_category: 'PWA',
      event_label: data ? JSON.stringify(data) : undefined,
      ...data,
    });
  }
}

// PWA Performance Metrics
export function getPWAMetrics() {
  if (typeof window === 'undefined') return null;

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  return {
    loadTime: navigation.loadEventEnd - navigation.loadEventStart,
    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
    firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
    firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
    serviceWorkerReady: 'serviceWorker' in navigator ? 
      navigator.serviceWorker.ready.then(() => performance.now()) : null,
  };
}

// Declare global gtag function
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}