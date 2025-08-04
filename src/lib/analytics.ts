// Analytics and performance monitoring for Ashram Management System

import { logMessage } from './sentry';

// Types for analytics events
export interface AnalyticsEvent {
  name: string;
  category: 'user' | 'system' | 'performance' | 'error' | 'business';
  properties?: Record<string, unknown>;
  value?: number;
  userId?: string;
  sessionId?: string;
}

// Performance API types
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
  processingEnd: number;
  cancelable: boolean;
}

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  category: 'navigation' | 'resource' | 'paint' | 'interaction' | 'custom';
  timestamp: number;
}

// Analytics service class
class AnalyticsService {
  private isEnabled: boolean;
  private queue: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;

  constructor() {
    this.isEnabled = typeof window !== 'undefined' && process.env.NODE_ENV === 'production';
    this.sessionId = this.generateSessionId();
    this.initializeWebVitals();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Set user context
  setUser(userId: string, properties?: Record<string, unknown>) {
    this.userId = userId;
    this.track('user_identified', 'user', { userId, ...properties });
  }

  // Clear user context
  clearUser() {
    this.userId = undefined;
    this.track('user_signed_out', 'user');
  }

  // Track custom events
  track(name: string, category: AnalyticsEvent['category'], properties?: Record<string, unknown>, value?: number) {
    const event: AnalyticsEvent = {
      name,
      category,
      properties: {
        ...properties,
        timestamp: Date.now(),
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      },
      value,
      userId: this.userId,
      sessionId: this.sessionId,
    };

    this.queue.push(event);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', event);
    }

    // Send to analytics service (if enabled)
    if (this.isEnabled) {
      this.sendEvent(event);
    }
  }

  // Track page views
  page(path: string, title?: string, properties?: Record<string, unknown>) {
    this.track('page_view', 'user', {
      path,
      title,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      ...properties,
    });
  }

  // Track business metrics specific to ashram management
  trackAppointment(action: 'booked' | 'confirmed' | 'completed' | 'cancelled', properties?: Record<string, unknown>) {
    this.track(`appointment_${action}`, 'business', {
      ...properties,
      timestamp: Date.now(),
    });
  }

  trackConsultation(action: 'started' | 'completed', duration?: number, properties?: Record<string, unknown>) {
    this.track(`consultation_${action}`, 'business', {
      duration,
      ...properties,
      timestamp: Date.now(),
    });
  }

  trackQueue(action: 'joined' | 'left' | 'position_updated', position?: number, properties?: Record<string, unknown>) {
    this.track(`queue_${action}`, 'business', {
      position,
      ...properties,
      timestamp: Date.now(),
    });
  }

  trackRemedy(action: 'prescribed' | 'viewed' | 'downloaded', properties?: Record<string, unknown>) {
    this.track(`remedy_${action}`, 'business', {
      ...properties,
      timestamp: Date.now(),
    });
  }

  // Track performance metrics
  trackPerformance(metric: PerformanceMetric) {
    this.track('performance_metric', 'performance', {
      metricName: metric.name,
      value: metric.value,
      unit: metric.unit,
      category: metric.category,
    }, metric.value);
  }

  // Track errors
  trackError(error: Error, context?: Record<string, unknown>) {
    this.track('error_occurred', 'error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context,
    });
  }

  // Initialize Web Vitals monitoring
  private initializeWebVitals() {
    if (typeof window === 'undefined') return;

    // Core Web Vitals
    this.observeWebVitals();
    
    // Custom performance observers
    this.observeNavigationTiming();
    this.observeResourceTiming();
  }

  private observeWebVitals() {
    // First Contentful Paint (FCP)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.trackPerformance({
            name: 'first_contentful_paint',
            value: entry.startTime,
            unit: 'ms',
            category: 'paint',
            timestamp: Date.now(),
          });
        }
      }
    }).observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.trackPerformance({
        name: 'largest_contentful_paint',
        value: lastEntry.startTime,
        unit: 'ms',
        category: 'paint',
        timestamp: Date.now(),
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID) - approximated with event timing
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const eventEntry = entry as PerformanceEventTiming;
        if (eventEntry.processingStart && eventEntry.startTime) {
          const delay = eventEntry.processingStart - eventEntry.startTime;
          this.trackPerformance({
            name: 'first_input_delay',
            value: delay,
            unit: 'ms',
            category: 'interaction',
            timestamp: Date.now(),
          });
        }
      }
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutEntry = entry as LayoutShift;
        if (!layoutEntry.hadRecentInput) {
          clsValue += layoutEntry.value;
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });

    // Report CLS on page unload
    window.addEventListener('beforeunload', () => {
      this.trackPerformance({
        name: 'cumulative_layout_shift',
        value: clsValue,
        unit: 'count',
        category: 'paint',
        timestamp: Date.now(),
      });
    });
  }

  private observeNavigationTiming() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          // Time to First Byte
          this.trackPerformance({
            name: 'time_to_first_byte',
            value: navigation.responseStart - navigation.requestStart,
            unit: 'ms',
            category: 'navigation',
            timestamp: Date.now(),
          });

          // DOM Content Loaded
          this.trackPerformance({
            name: 'dom_content_loaded',
            value: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            unit: 'ms',
            category: 'navigation',
            timestamp: Date.now(),
          });

          // Page Load Complete
          this.trackPerformance({
            name: 'page_load_complete',
            value: navigation.loadEventEnd - navigation.fetchStart,
            unit: 'ms',
            category: 'navigation',
            timestamp: Date.now(),
          });
        }
      }, 0);
    });
  }

  private observeResourceTiming() {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming;
        
        // Track slow resources
        if (resource.duration > 1000) { // Slower than 1 second
          this.trackPerformance({
            name: 'slow_resource',
            value: resource.duration,
            unit: 'ms',
            category: 'resource',
            timestamp: Date.now(),
          });
        }
      }
    }).observe({ entryTypes: ['resource'] });
  }

  // Send events to analytics service
  private async sendEvent(event: AnalyticsEvent) {
    try {
      // In a real implementation, you would send this to your analytics service
      // For now, we'll log it and optionally send to a simple endpoint
      
      if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });
      }

      // Also log to Sentry for debugging
      logMessage(`Analytics: ${event.name}`, 'info', {
        category: event.category,
        properties: event.properties,
      });

    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }

  // Get session analytics summary
  getSessionSummary() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      eventCount: this.queue.length,
      events: this.queue,
    };
  }

  // Flush queued events
  flush() {
    const events = [...this.queue];
    this.queue = [];
    return events;
  }
}

// Create singleton instance
export const analytics = new AnalyticsService();

// Convenience functions
export const trackEvent = (name: string, category: AnalyticsEvent['category'], properties?: Record<string, unknown>) => {
  analytics.track(name, category, properties);
};

export const trackPageView = (path: string, title?: string) => {
  analytics.page(path, title);
};

export const trackAppointmentEvent = (action: 'booked' | 'confirmed' | 'completed' | 'cancelled', properties?: Record<string, unknown>) => {
  analytics.trackAppointment(action, properties);
};

export const trackConsultationEvent = (action: 'started' | 'completed', duration?: number, properties?: Record<string, unknown>) => {
  analytics.trackConsultation(action, duration, properties);
};

export const trackQueueEvent = (action: 'joined' | 'left' | 'position_updated', position?: number, properties?: Record<string, unknown>) => {
  analytics.trackQueue(action, position, properties);
};

export const trackRemedyEvent = (action: 'prescribed' | 'viewed' | 'downloaded', properties?: Record<string, unknown>) => {
  analytics.trackRemedy(action, properties);
};

export const setAnalyticsUser = (userId: string, properties?: Record<string, unknown>) => {
  analytics.setUser(userId, properties);
};

export const clearAnalyticsUser = () => {
  analytics.clearUser();
};

export default analytics;