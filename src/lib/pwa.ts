// PWA Service Worker Registration
export async function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully:', registration);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              showUpdateNotification();
            }
          });
        }
      });
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

// Show update notification
function showUpdateNotification() {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('sw-update-available');
    window.dispatchEvent(event);
  }
}

// Request notification permission
export async function requestNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

// Subscribe to push notifications
export async function subscribeToPushNotifications() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });
      
      // Send subscription to server using Server Action
      const formData = new FormData();
      formData.append('subscription', JSON.stringify(subscription));
      // Note: This would need to be implemented as a Server Action
      // await subscribeToNotifications(formData);
      
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  }
}

// Check if app is installed
export function isAppInstalled(): boolean {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as { standalone?: boolean }).standalone === true;
  }
  return false;
}

// Show install prompt
export function showInstallPrompt() {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('show-install-prompt');
    window.dispatchEvent(event);
  }
}

// Background sync registration
export async function registerBackgroundSync(tag: string) {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      // Type assertion for sync property which exists in browsers that support background sync
      await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(tag);
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }
} 