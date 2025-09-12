// Android-specific PWA enhancements

export interface AndroidPWAFeatures {
  webAPK: boolean;
  shortcuts: boolean;
  maskableIcons: boolean;
  shareTarget: boolean;
  badgeAPI: boolean;
  trustedWebActivity: boolean;
}

// Check Android PWA capabilities
export function getAndroidPWASupport(): AndroidPWAFeatures | null {
  if (typeof window === 'undefined' || !/Android/.test(navigator.userAgent)) {
    return null;
  }

  return {
    webAPK: checkWebAPKSupport(),
    shortcuts: 'getInstalledRelatedApps' in navigator,
    maskableIcons: true, // Supported in modern Android Chrome
    shareTarget: 'share' in navigator,
    badgeAPI: 'setAppBadge' in navigator,
    trustedWebActivity: checkTrustedWebActivitySupport(),
  };
}

function checkWebAPKSupport(): boolean {
  // Check if running as WebAPK (Android Chrome's native app wrapper)
  return (
    window.matchMedia('(display-mode: standalone)').matches &&
    /Android/.test(navigator.userAgent) &&
    /Chrome/.test(navigator.userAgent)
  );
}

function checkTrustedWebActivitySupport(): boolean {
  // Check for TWA-specific features
  return 'getInstalledRelatedApps' in navigator;
}

// Android-specific PWA installation helpers
export class AndroidPWAManager {
  private static instance: AndroidPWAManager;
  private installPrompt: any = null;

  static getInstance(): AndroidPWAManager {
    if (!AndroidPWAManager.instance) {
      AndroidPWAManager.instance = new AndroidPWAManager();
    }
    return AndroidPWAManager.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupEventListeners();
    }
  }

  private setupEventListeners() {
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e;
      this.dispatchInstallAvailable();
    });

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      this.installPrompt = null;
      this.dispatchInstallCompleted();
      this.trackInstallation();
    });
  }

  async canInstall(): Promise<boolean> {
    return this.installPrompt !== null;
  }

  async install(): Promise<{ outcome: 'accepted' | 'dismissed' }> {
    if (!this.installPrompt) {
      throw new Error('No install prompt available');
    }

    try {
      await this.installPrompt.prompt();
      const { outcome } = await this.installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        this.trackInstallation();
      }

      return { outcome };
    } catch (error) {
      console.error('Failed to show install prompt:', error);
      throw error;
    }
  }

  // Set app badge (Android Chrome 81+)
  async setBadge(count?: number): Promise<void> {
    if ('setAppBadge' in navigator) {
      try {
        if (count && count > 0) {
          await (navigator as any).setAppBadge(count);
        } else {
          await (navigator as any).setAppBadge();
        }
      } catch (error) {
        console.warn('Failed to set app badge:', error);
      }
    }
  }

  // Clear app badge
  async clearBadge(): Promise<void> {
    if ('clearAppBadge' in navigator) {
      try {
        await (navigator as any).clearAppBadge();
      } catch (error) {
        console.warn('Failed to clear app badge:', error);
      }
    }
  }

  // Share content (Android Web Share API)
  async share(data: {
    title?: string;
    text?: string;
    url?: string;
    files?: File[];
  }): Promise<void> {
    if ('share' in navigator) {
      try {
        await navigator.share(data);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Failed to share:', error);
          throw error;
        }
      }
    } else {
      throw new Error('Web Share API not supported');
    }
  }

  // Check if app is installed
  async isInstalled(): Promise<boolean> {
    // Check display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }

    // Check for related apps (if available)
    if ('getInstalledRelatedApps' in navigator) {
      try {
        const relatedApps = await (navigator as any).getInstalledRelatedApps();
        return relatedApps.length > 0;
      } catch (error) {
        console.warn('Failed to check installed related apps:', error);
      }
    }

    return false;
  }

  private dispatchInstallAvailable() {
    const event = new CustomEvent('android-pwa-install-available');
    window.dispatchEvent(event);
  }

  private dispatchInstallCompleted() {
    const event = new CustomEvent('android-pwa-install-completed');
    window.dispatchEvent(event);
  }

  private trackInstallation() {
    // Analytics tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'pwa_install', {
        event_category: 'PWA',
        event_label: 'Android',
        platform: 'android',
        browser: navigator.userAgent.includes('Chrome') ? 'chrome' : 'other'
      });
    }
  }
}

// Android PWA shortcuts management
export interface AndroidShortcut {
  name: string;
  short_name?: string;
  description?: string;
  url: string;
  icons: Array<{
    src: string;
    sizes: string;
    type?: string;
  }>;
}

export function createAndroidShortcuts(): AndroidShortcut[] {
  return [
    {
      name: "Book Appointment",
      short_name: "Book",
      description: "Quickly book a new appointment",
      url: "/user/appointments/book?source=shortcut",
      icons: [
        {
          src: "/icons/calendar-96x96.svg",
          sizes: "96x96",
          type: "image/svg+xml"
        }
      ]
    },
    {
      name: "Check Queue",
      short_name: "Queue",
      description: "Check your current queue position",
      url: "/user/queue?source=shortcut",
      icons: [
        {
          src: "/icons/queue-96x96.svg",
          sizes: "96x96",
          type: "image/svg+xml"
        }
      ]
    },
    {
      name: "Check In",
      short_name: "Check In",
      description: "Check in for your appointment",
      url: "/user/checkin?source=shortcut",
      icons: [
        {
          src: "/icons/checkin-96x96.svg",
          sizes: "96x96",
          type: "image/svg+xml"
        }
      ]
    }
  ];
}

// Export singleton instance
export const androidPWA = AndroidPWAManager.getInstance();