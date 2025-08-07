import * as Sentry from '@sentry/nextjs';

// Initialize Sentry
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    
    // Custom tags
    initialScope: {
      tags: {
        component: 'ashram-management-system',
      },
    },
    
    // Error filtering
    beforeSend(event) {
      // Filter out non-critical errors in development
      if (process.env.NODE_ENV === 'development') {
        // Don't send certain development-only errors
        if (event.exception?.values?.[0]?.value?.includes('ChunkLoadError')) {
          return null;
        }
      }
      
      // Filter out privacy-sensitive information
      if (event.request?.data) {
        const data = event.request.data;
        // Filter out sensitive data
        const filteredData = { ...data };
        if (filteredData && typeof filteredData === 'object') {
          delete (filteredData as Record<string, unknown>).password;
          delete (filteredData as Record<string, unknown>).otp;
          delete (filteredData as Record<string, unknown>).token;
        }
        event.request.data = filteredData;
      }
      
      return event;
    },
  });
}

// Custom error logging utilities
export const logError = (error: Error, context?: Record<string, unknown>) => {
  console.error('Application Error:', error);
  
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value as Record<string, unknown>);
        });
      }
      Sentry.captureException(error);
    });
  }
};

export const logMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, unknown>) => {
  console.log(`[${level.toUpperCase()}] ${message}`, context);
  
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value as Record<string, unknown>);
        });
      }
      Sentry.captureMessage(message, level);
    });
  }
};

// User context tracking
export const setUserContext = (user: { id: string; email?: string; role?: string }) => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }
};

export const clearUserContext = () => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser(null);
  }
};

// Performance monitoring
export const startTransaction = (name: string, op: string) => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Use modern Sentry API - startTransaction is deprecated
    return Sentry.startSpan({ name, op }, (span) => {
      return span;
    });
  }
  return null;
};

// Custom breadcrumbs for debugging
export const addBreadcrumb = (message: string, category: string, level: 'info' | 'warning' | 'error' = 'info') => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      timestamp: Date.now() / 1000,
    });
  }
};

// Error boundary helper
export const captureReactError = (error: Error, errorInfo: { componentStack: string }) => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setContext('react', errorInfo);
      Sentry.captureException(error);
    });
  }
};

export default Sentry;