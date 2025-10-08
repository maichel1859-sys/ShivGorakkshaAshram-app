// iOS-specific PWA enhancements and compatibility

export interface iOSPWAFeatures {
  homeScreenApp: boolean;
  safariPWA: boolean;
  statusBarSupport: boolean;
  safeAreaSupport: boolean;
  touchIconSupport: boolean;
  splashScreenSupport: boolean;
}

// Check iOS PWA capabilities
export function getiOSPWASupport(): iOSPWAFeatures | null {
  if (typeof window === 'undefined' || !/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    return null;
  }

  const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  return {
    homeScreenApp: isStandalone,
    safariPWA: isSafari,
    statusBarSupport: true, // iOS supports status bar styling
    safeAreaSupport: checkSafeAreaSupport(),
    touchIconSupport: true, // iOS supports apple-touch-icon
    splashScreenSupport: checkSplashScreenSupport(),
  };
}

function checkSafeAreaSupport(): boolean {
  // Check if device has safe area (notched devices)
  return window.innerHeight !== window.screen.height;
}

function checkSplashScreenSupport(): boolean {
  // Check iOS version - splash screens supported in iOS 12.2+
  const match = navigator.userAgent.match(/OS (\d+)_/);
  if (match) {
    const version = parseInt(match[1], 10);
    return version >= 12;
  }
  return false;
}

// iOS PWA Manager
export class iOSPWAManager {
  private static instance: iOSPWAManager;

  static getInstance(): iOSPWAManager {
    if (!iOSPWAManager.instance) {
      iOSPWAManager.instance = new iOSPWAManager();
    }
    return iOSPWAManager.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupiOSSpecificStyles();
      this.handleiOSViewport();
    }
  }

  // Check if running as home screen app
  isHomeScreenApp(): boolean {
    return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  }

  // Check if iOS device
  isiOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  // Get iOS version
  getiOSVersion(): number | null {
    const match = navigator.userAgent.match(/OS (\d+)_/);
    return match ? parseInt(match[1], 10) : null;
  }

  // Check if device has notch (safe area required)
  hasNotch(): boolean {
    if (!this.isiOS()) return false;
    
    // Check for safe area support
    return CSS.supports('padding-top: env(safe-area-inset-top)') &&
           window.innerHeight !== window.screen.height;
  }

  // Apply iOS-specific styles
  private setupiOSSpecificStyles() {
    if (!this.isiOS()) return;

    const style = document.createElement('style');
    style.textContent = `
      /* iOS PWA specific styles */
      @supports (-webkit-touch-callout: none) {
        .ios-pwa-app {
          /* Disable iOS bounce effect */
          overscroll-behavior: none;
          -webkit-overflow-scrolling: touch;
        }
        
        /* Handle safe areas */
        .ios-safe-area-top {
          padding-top: env(safe-area-inset-top);
        }
        
        .ios-safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
        
        .ios-safe-area-left {
          padding-left: env(safe-area-inset-left);
        }
        
        .ios-safe-area-right {
          padding-right: env(safe-area-inset-right);
        }
        
        /* iOS status bar styling */
        .ios-status-bar-light {
          -webkit-appearance: none;
        }
        
        /* Improve touch targets for iOS */
        button, [role="button"], input[type="submit"] {
          -webkit-appearance: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          min-height: 44px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Handle iOS viewport and scaling issues
  private handleiOSViewport() {
    if (!this.isiOS()) return;

    // Prevent zoom on input focus
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
      );
    }

    // Handle iOS keyboard appearance
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((input) => {
      // Prevent zoom on focus by ensuring font-size is at least 16px
      const computedStyle = window.getComputedStyle(input);
      const fontSize = parseFloat(computedStyle.fontSize);
      if (fontSize < 16) {
        (input as HTMLElement).style.fontSize = '16px';
      }
    });
  }

  // Check if user should be prompted to install
  shouldShowInstallPrompt(): boolean {
    if (!this.isiOS()) return false;
    if (this.isHomeScreenApp()) return false;
    
    // Check if user has dismissed the prompt recently
    const dismissed = localStorage.getItem('ios-pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return false; // Don't show for 7 days
    }
    
    return true;
  }

  // Show install instructions
  showInstallInstructions(): string[] {
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    if (isSafari) {
      return [
        'Tap the Share button at the bottom of the screen',
        'Scroll down and tap "Add to Home Screen"',
        'Tap "Add" to confirm installation',
        'The app will appear on your home screen'
      ];
    } else {
      return [
        'For the best experience, open this site in Safari',
        'Then tap the Share button',
        'Select "Add to Home Screen"'
      ];
    }
  }

  // Track iOS PWA usage
  trackiOSPWAUsage() {
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as { gtag: (event: string, name: string, params?: object) => void }).gtag('event', 'ios_pwa_usage', {
        event_category: 'PWA',
        is_standalone: this.isHomeScreenApp(),
        ios_version: this.getiOSVersion(),
        has_notch: this.hasNotch(),
        platform: 'ios'
      });
    }
  }

  // Handle iOS PWA navigation
  setupiOSNavigation() {
    if (!this.isHomeScreenApp()) return;

    // Prevent external links from opening in Safari
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.hostname !== location.hostname) {
        e.preventDefault();
        // Open external links in the same window for PWA
        window.location.href = link.href;
      }
    });
  }

  // Generate iOS splash screens configuration
  generateSplashScreens(): Array<{
    href: string;
    sizes: string;
    media: string;
  }> {
    const baseUrl = '/icons/splash/';
    
    return [
      // iPhone SE, 5s, 5c, 5 (640x1136)
      {
        href: `${baseUrl}iphone-se-640x1136.png`,
        sizes: '640x1136',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)'
      },
      // iPhone 6, 7, 8 (750x1334)
      {
        href: `${baseUrl}iphone-6-750x1334.png`,
        sizes: '750x1334',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)'
      },
      // iPhone 6+, 7+, 8+ (1242x2208)
      {
        href: `${baseUrl}iphone-6-plus-1242x2208.png`,
        sizes: '1242x2208',
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)'
      },
      // iPhone X, XS (1125x2436)
      {
        href: `${baseUrl}iphone-x-1125x2436.png`,
        sizes: '1125x2436',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)'
      },
      // iPhone XR (828x1792)
      {
        href: `${baseUrl}iphone-xr-828x1792.png`,
        sizes: '828x1792',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)'
      },
      // iPhone XS Max (1242x2688)
      {
        href: `${baseUrl}iphone-xs-max-1242x2688.png`,
        sizes: '1242x2688',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)'
      },
      // iPad (1536x2048)
      {
        href: `${baseUrl}ipad-1536x2048.png`,
        sizes: '1536x2048',
        media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)'
      },
      // iPad Pro 10.5" (1668x2224)
      {
        href: `${baseUrl}ipad-pro-10.5-1668x2224.png`,
        sizes: '1668x2224',
        media: '(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)'
      },
      // iPad Pro 12.9" (2048x2732)
      {
        href: `${baseUrl}ipad-pro-12.9-2048x2732.png`,
        sizes: '2048x2732',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)'
      }
    ];
  }
}

// Export singleton instance
export const iOSPWA = iOSPWAManager.getInstance();