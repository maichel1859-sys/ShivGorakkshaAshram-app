// Cross-platform PWA validation and testing utilities

export interface PWAValidationResult {
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  browser: string;
  isValid: boolean;
  score: number; // 0-100
  issues: PWAIssue[];
  recommendations: PWARecommendation[];
  features: PWAFeatureSupport;
}

export interface PWAIssue {
  type: 'error' | 'warning' | 'info';
  category: 'manifest' | 'icons' | 'service-worker' | 'offline' | 'installation' | 'compatibility';
  message: string;
  fix?: string;
}

export interface PWARecommendation {
  priority: 'high' | 'medium' | 'low';
  platform: 'all' | 'ios' | 'android' | 'desktop';
  title: string;
  description: string;
  action?: string;
}

export interface PWAFeatureSupport {
  manifest: boolean;
  serviceWorker: boolean;
  offline: boolean;
  installable: boolean;
  pushNotifications: boolean;
  backgroundSync: boolean;
  webShare: boolean;
  badgeAPI: boolean;
  shortcuts: boolean;
  fileHandling: boolean;
}

export class PWAValidator {
  private manifestCache: Record<string, unknown> | null = null;
  
  async validatePWA(): Promise<PWAValidationResult> {
    const platform = this.detectPlatform();
    const browser = this.detectBrowser();
    
    const issues: PWAIssue[] = [];
    const recommendations: PWARecommendation[] = [];
    
    // Test manifest
    const manifestResult = await this.validateManifest();
    issues.push(...manifestResult.issues);
    
    // Test service worker
    const swResult = await this.validateServiceWorker();
    issues.push(...swResult.issues);
    
    // Test icons
    const iconsResult = await this.validateIcons();
    issues.push(...iconsResult.issues);
    
    // Test offline capability
    const offlineResult = await this.validateOfflineCapability();
    issues.push(...offlineResult.issues);
    
    // Test installation
    const installResult = await this.validateInstallation();
    issues.push(...installResult.issues);
    
    // Platform-specific validation
    const platformResult = await this.validatePlatformCompatibility(platform);
    issues.push(...platformResult.issues);
    recommendations.push(...platformResult.recommendations);
    
    // Calculate score
    const score = this.calculatePWAScore(issues);
    
    // Feature support
    const features = await this.checkFeatureSupport();
    
    return {
      platform,
      browser,
      isValid: score >= 70,
      score,
      issues,
      recommendations,
      features,
    };
  }

  private detectPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
    if (typeof window === 'undefined') return 'unknown';
    
    const userAgent = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(userAgent)) return 'ios';
    if (/Android/.test(userAgent)) return 'android';
    if (/Windows|Mac|Linux/.test(userAgent)) return 'desktop';
    return 'unknown';
  }

  private detectBrowser(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const userAgent = navigator.userAgent;
    if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) return 'Safari';
    if (/Chrome/.test(userAgent)) return 'Chrome';
    if (/Firefox/.test(userAgent)) return 'Firefox';
    if (/Edg/.test(userAgent)) return 'Edge';
    return 'Unknown';
  }

  private async validateManifest(): Promise<{ issues: PWAIssue[] }> {
    const issues: PWAIssue[] = [];
    
    try {
      const response = await fetch('/manifest.json');
      if (!response.ok) {
        issues.push({
          type: 'error',
          category: 'manifest',
          message: 'Manifest file not found or not accessible',
          fix: 'Ensure manifest.json exists in the public directory'
        });
        return { issues };
      }
      
      const manifest = await response.json();
      this.manifestCache = manifest;
      
      // Required fields
      if (!manifest.name) {
        issues.push({
          type: 'error',
          category: 'manifest',
          message: 'Manifest is missing required "name" field',
          fix: 'Add a "name" field to your manifest.json'
        });
      }
      
      if (!manifest.start_url) {
        issues.push({
          type: 'error',
          category: 'manifest',
          message: 'Manifest is missing required "start_url" field',
          fix: 'Add a "start_url" field to your manifest.json'
        });
      }
      
      if (!manifest.display) {
        issues.push({
          type: 'warning',
          category: 'manifest',
          message: 'Manifest is missing "display" field',
          fix: 'Add "display": "standalone" to your manifest.json'
        });
      }
      
      if (!manifest.icons || manifest.icons.length === 0) {
        issues.push({
          type: 'error',
          category: 'manifest',
          message: 'Manifest is missing icons',
          fix: 'Add an "icons" array with at least 192x192 and 512x512 icons'
        });
      }
      
      // Check for recommended fields
      if (!manifest.theme_color) {
        issues.push({
          type: 'info',
          category: 'manifest',
          message: 'Consider adding theme_color for better integration',
          fix: 'Add "theme_color" field to your manifest.json'
        });
      }
      
      if (!manifest.background_color) {
        issues.push({
          type: 'info',
          category: 'manifest',
          message: 'Consider adding background_color for splash screens',
          fix: 'Add "background_color" field to your manifest.json'
        });
      }
      
    } catch {
      issues.push({
        type: 'error',
        category: 'manifest',
        message: 'Failed to fetch or parse manifest.json',
        fix: 'Check that manifest.json is valid JSON and accessible'
      });
    }
    
    return { issues };
  }

  private async validateServiceWorker(): Promise<{ issues: PWAIssue[] }> {
    const issues: PWAIssue[] = [];
    
    if (!('serviceWorker' in navigator)) {
      issues.push({
        type: 'error',
        category: 'service-worker',
        message: 'Service Worker not supported in this browser',
        fix: 'Use a modern browser that supports Service Workers'
      });
      return { issues };
    }
    
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        issues.push({
          type: 'warning',
          category: 'service-worker',
          message: 'Service Worker not registered',
          fix: 'Register your service worker in your application'
        });
      } else {
        // Check if SW is active
        if (!registration.active) {
          issues.push({
            type: 'warning',
            category: 'service-worker',
            message: 'Service Worker is not active',
            fix: 'Ensure service worker activates properly'
          });
        }
        
        // Test offline capability by checking cache
        const cacheNames = await caches.keys();
        if (cacheNames.length === 0) {
          issues.push({
            type: 'warning',
            category: 'service-worker',
            message: 'No caches found - offline functionality may be limited',
            fix: 'Implement caching strategy in your service worker'
          });
        }
      }
    } catch {
      issues.push({
        type: 'error',
        category: 'service-worker',
        message: 'Error checking service worker registration',
        fix: 'Check browser console for service worker errors'
      });
    }
    
    return { issues };
  }

  private async validateIcons(): Promise<{ issues: PWAIssue[] }> {
    const issues: PWAIssue[] = [];
    
    if (!this.manifestCache?.icons) {
      return { issues };
    }
    
    const icons = this.manifestCache.icons as Array<Record<string, unknown>> | undefined;
    const requiredSizes = ['192x192', '512x512'];
    const foundSizes: string[] = [];
    
    if (!icons || !Array.isArray(icons)) {
      issues.push({
        type: 'error',
        category: 'icons',
        message: 'No icons defined in web app manifest',
        fix: 'Add icons array to your web app manifest',
      });
      return { issues };
    }
    
    for (const icon of icons) {
      foundSizes.push(icon.sizes as string);
      
      // Test if icon exists
      try {
        const response = await fetch(icon.src as string);
        if (!response.ok) {
          issues.push({
            type: 'error',
            category: 'icons',
            message: `Icon not found: ${icon.src}`,
            fix: 'Ensure all manifest icons exist and are accessible'
          });
        }
      } catch {
        issues.push({
          type: 'error',
          category: 'icons',
          message: `Failed to load icon: ${icon.src}`,
          fix: 'Check icon URL and file accessibility'
        });
      }
    }
    
    // Check for required sizes
    for (const size of requiredSizes) {
      if (!foundSizes.includes(size)) {
        issues.push({
          type: 'warning',
          category: 'icons',
          message: `Missing recommended icon size: ${size}`,
          fix: `Add a ${size} icon to your manifest`
        });
      }
    }
    
    return { issues };
  }

  private async validateOfflineCapability(): Promise<{ issues: PWAIssue[] }> {
    const issues: PWAIssue[] = [];
    
    try {
      // Test if offline page exists
      const response = await fetch('/offline.html');
      if (!response.ok) {
        issues.push({
          type: 'info',
          category: 'offline',
          message: 'No offline fallback page found',
          fix: 'Consider adding an offline.html page'
        });
      }
    } catch {
      issues.push({
        type: 'info',
        category: 'offline',
        message: 'Could not test offline capability',
        fix: 'Ensure offline functionality is implemented'
      });
    }
    
    return { issues };
  }

  private async validateInstallation(): Promise<{ issues: PWAIssue[] }> {
    const issues: PWAIssue[] = [];
    const platform = this.detectPlatform();
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      issues.push({
        type: 'info',
        category: 'installation',
        message: 'App is currently running in standalone mode',
        fix: ''
      });
      return { issues };
    }
    
    // Platform-specific installation checks
    if (platform === 'android') {
      // Check for beforeinstallprompt
      let hasInstallPrompt = false;
      
      window.addEventListener('beforeinstallprompt', () => {
        hasInstallPrompt = true;
      });
      
      setTimeout(() => {
        if (!hasInstallPrompt) {
          issues.push({
            type: 'warning',
            category: 'installation',
            message: 'Install prompt may not be available',
            fix: 'Ensure PWA criteria are met for install prompt'
          });
        }
      }, 1000);
    }
    
    return { issues };
  }

  private async validatePlatformCompatibility(platform: string): Promise<{ 
    issues: PWAIssue[]; 
    recommendations: PWARecommendation[]; 
  }> {
    const issues: PWAIssue[] = [];
    const recommendations: PWARecommendation[] = [];
    
    if (platform === 'ios') {
      // iOS-specific checks
      if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
        recommendations.push({
          priority: 'medium',
          platform: 'ios',
          title: 'Add iOS web app capability',
          description: 'Add apple-mobile-web-app-capable meta tag',
          action: 'Add <meta name="apple-mobile-web-app-capable" content="yes">'
        });
      }
      
      if (!document.querySelector('link[rel="apple-touch-icon"]')) {
        recommendations.push({
          priority: 'high',
          platform: 'ios',
          title: 'Add iOS touch icon',
          description: 'Add apple-touch-icon for home screen',
          action: 'Add <link rel="apple-touch-icon" href="/icons/icon-180x180.png">'
        });
      }
    }
    
    if (platform === 'android') {
      // Android-specific checks
      if (!(this.manifestCache?.icons as Array<Record<string, unknown>>)?.some((icon: Record<string, unknown>) => (icon.purpose as string)?.includes('maskable'))) {
        recommendations.push({
          priority: 'medium',
          platform: 'android',
          title: 'Add maskable icons',
          description: 'Add maskable icons for better Android integration',
          action: 'Add icons with "purpose": "maskable" to manifest'
        });
      }
    }
    
    return { issues, recommendations };
  }

  private calculatePWAScore(issues: PWAIssue[]): number {
    let score = 100;
    
    for (const issue of issues) {
      switch (issue.type) {
        case 'error':
          score -= 20;
          break;
        case 'warning':
          score -= 10;
          break;
        case 'info':
          score -= 2;
          break;
      }
    }
    
    return Math.max(0, score);
  }

  private async checkFeatureSupport(): Promise<PWAFeatureSupport> {
    return {
      manifest: !!this.manifestCache,
      serviceWorker: 'serviceWorker' in navigator,
      offline: 'serviceWorker' in navigator && (await caches.keys()).length > 0,
      installable: 'BeforeInstallPromptEvent' in window,
      pushNotifications: 'PushManager' in window && 'Notification' in window,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      webShare: 'share' in navigator,
      badgeAPI: 'setAppBadge' in navigator,
      shortcuts: !!this.manifestCache?.shortcuts,
      fileHandling: !!this.manifestCache?.file_handlers,
    };
  }

  // Generate PWA report
  generateReport(result: PWAValidationResult): string {
    let report = `PWA Validation Report\n`;
    report += `===================\n\n`;
    report += `Platform: ${result.platform}\n`;
    report += `Browser: ${result.browser}\n`;
    report += `Score: ${result.score}/100\n`;
    report += `Status: ${result.isValid ? 'VALID' : 'NEEDS IMPROVEMENT'}\n\n`;
    
    if (result.issues.length > 0) {
      report += `Issues Found:\n`;
      for (const issue of result.issues) {
        report += `- [${issue.type.toUpperCase()}] ${issue.message}\n`;
        if (issue.fix) {
          report += `  Fix: ${issue.fix}\n`;
        }
      }
      report += `\n`;
    }
    
    if (result.recommendations.length > 0) {
      report += `Recommendations:\n`;
      for (const rec of result.recommendations) {
        report += `- [${rec.priority.toUpperCase()}] ${rec.title}\n`;
        report += `  ${rec.description}\n`;
        if (rec.action) {
          report += `  Action: ${rec.action}\n`;
        }
      }
    }
    
    return report;
  }
}

// Export singleton validator
export const pwaValidator = new PWAValidator();