// Cross-platform PWA Detection and Management

export interface PlatformInfo {
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  browser: 'safari' | 'chrome' | 'firefox' | 'edge' | 'samsung' | 'unknown';
  isStandalone: boolean;
  canInstall: boolean;
  supports: {
    pwa: boolean;
    serviceWorker: boolean;
    pushNotifications: boolean;
    backgroundSync: boolean;
    webShare: boolean;
    badgeAPI: boolean;
    installPrompt: boolean;
  };
  installation: {
    method: 'native' | 'manual' | 'unsupported';
    instructions: string[];
  };
}

// Detect user's platform and browser
export function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined') {
    return getDefaultPlatformInfo();
  }

  const userAgent = navigator.userAgent;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as { standalone?: boolean }).standalone === true;

  // Platform detection
  let platform: PlatformInfo['platform'] = 'unknown';
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    platform = 'ios';
  } else if (/Android/.test(userAgent)) {
    platform = 'android';
  } else if (/Windows|Mac|Linux/.test(userAgent)) {
    platform = 'desktop';
  }

  // Browser detection
  let browser: PlatformInfo['browser'] = 'unknown';
  if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
    browser = 'safari';
  } else if (/Chrome/.test(userAgent) && !/Edg/.test(userAgent)) {
    browser = 'chrome';
  } else if (/Firefox/.test(userAgent)) {
    browser = 'firefox';
  } else if (/Edg/.test(userAgent)) {
    browser = 'edge';
  } else if (/SamsungBrowser/.test(userAgent)) {
    browser = 'samsung';
  }

  // Feature support detection
  const supports = {
    pwa: 'serviceWorker' in navigator && 'PushManager' in window,
    serviceWorker: 'serviceWorker' in navigator,
    pushNotifications: 'PushManager' in window && 'Notification' in window,
    backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
    webShare: 'share' in navigator,
    badgeAPI: 'setAppBadge' in navigator,
    installPrompt: 'BeforeInstallPromptEvent' in window || platform === 'android',
  };

  // Installation method and instructions
  const installation = getInstallationInfo(platform, browser);

  return {
    platform,
    browser,
    isStandalone,
    canInstall: !isStandalone && supports.pwa,
    supports,
    installation,
  };
}

function getInstallationInfo(
  platform: PlatformInfo['platform'], 
  browser: PlatformInfo['browser']
): PlatformInfo['installation'] {
  // iOS Safari
  if (platform === 'ios' && browser === 'safari') {
    return {
      method: 'manual',
      instructions: [
        'Tap the Share button (square with arrow up) at the bottom of the screen',
        'Scroll down and tap "Add to Home Screen"',
        'Tap "Add" to confirm',
        'The app will appear on your home screen'
      ]
    };
  }

  // iOS Chrome (limited PWA support)
  if (platform === 'ios' && browser === 'chrome') {
    return {
      method: 'manual',
      instructions: [
        'Tap the Share button in Chrome',
        'Select "Add to Home Screen"',
        'Note: For best PWA experience, use Safari on iOS'
      ]
    };
  }

  // Android Chrome
  if (platform === 'android' && browser === 'chrome') {
    return {
      method: 'native',
      instructions: [
        'Look for the "Add to Home Screen" banner',
        'Or tap the menu (three dots) and select "Add to Home Screen"',
        'Or use the install button in the address bar'
      ]
    };
  }

  // Android Samsung Browser
  if (platform === 'android' && browser === 'samsung') {
    return {
      method: 'native',
      instructions: [
        'Tap the menu button',
        'Select "Add page to" then "Home screen"',
        'Confirm to install'
      ]
    };
  }

  // Desktop Chrome
  if (platform === 'desktop' && browser === 'chrome') {
    return {
      method: 'native',
      instructions: [
        'Click the install button in the address bar',
        'Or go to Chrome menu > More tools > Create shortcut',
        'Check "Open as window" for app-like experience'
      ]
    };
  }

  // Desktop Edge
  if (platform === 'desktop' && browser === 'edge') {
    return {
      method: 'native',
      instructions: [
        'Click the install button in the address bar',
        'Or go to Settings menu > Apps > Install this site as an app'
      ]
    };
  }

  // Fallback for unsupported browsers
  return {
    method: 'unsupported',
    instructions: [
      'PWA installation is not fully supported in this browser',
      'For best experience, use Chrome on Android or Safari on iOS'
    ]
  };
}

function getDefaultPlatformInfo(): PlatformInfo {
  return {
    platform: 'unknown',
    browser: 'unknown',
    isStandalone: false,
    canInstall: false,
    supports: {
      pwa: false,
      serviceWorker: false,
      pushNotifications: false,
      backgroundSync: false,
      webShare: false,
      badgeAPI: false,
      installPrompt: false,
    },
    installation: {
      method: 'unsupported',
      instructions: []
    }
  };
}

// Platform-specific configurations
export const PLATFORM_CONFIGS = {
  ios: {
    statusBarStyle: 'black-translucent',
    themeColor: '#0f172a',
    splashScreens: true,
    homeScreenIcon: '/icons/icon-180x180.svg',
    touchIcon: '/icons/icon-180x180.svg',
  },
  android: {
    themeColor: '#0f172a',
    backgroundColor: '#ffffff',
    maskableIcon: '/icons/maskable-512x512.svg',
    shortcuts: true,
    webShare: true,
  },
  desktop: {
    themeColor: '#0f172a',
    minWidth: '320px',
    shortcuts: true,
  }
} as const;

// Get platform-specific CSS classes
export function getPlatformClasses(platformInfo: PlatformInfo): string {
  const classes = [];
  
  classes.push(`platform-${platformInfo.platform}`);
  classes.push(`browser-${platformInfo.browser}`);
  
  if (platformInfo.isStandalone) {
    classes.push('standalone');
  }
  
  if (platformInfo.canInstall) {
    classes.push('installable');
  }

  return classes.join(' ');
}

// Check if platform supports specific PWA features
export function supportsPWAFeature(feature: keyof PlatformInfo['supports']): boolean {
  const platformInfo = detectPlatform();
  return platformInfo.supports[feature];
}

// Get installation prompt text based on platform
export function getInstallPromptText(platformInfo: PlatformInfo): string {
  const { platform } = platformInfo;
  
  if (platform === 'ios') {
    return 'Add to Home Screen for the best experience';
  }
  
  if (platform === 'android') {
    return 'Install app for offline access and notifications';
  }
  
  if (platform === 'desktop') {
    return 'Install for quick access from your desktop';
  }
  
  return 'Install this app for a better experience';
}