import { analytics } from './analytics';
import { logMessage } from './sentry';

// Monitoring configuration
interface MonitoringConfig {
  enableMetrics: boolean;
  enableHealthChecks: boolean;
  enablePerformanceTracking: boolean;
  metricsFlushInterval: number;
  healthCheckInterval: number;
}

const defaultConfig: MonitoringConfig = {
  enableMetrics: process.env.NODE_ENV === 'production',
  enableHealthChecks: true,
  enablePerformanceTracking: true,
  metricsFlushInterval: 60000, // 1 minute
  healthCheckInterval: 30000, // 30 seconds
};

// System metrics interface
export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    connectionCount: number;
    activeQueries: number;
    averageQueryTime: number;
  };
  api: {
    requestCount: number;
    errorRate: number;
    averageResponseTime: number;
  };
  users: {
    activeUsers: number;
    totalUsers: number;
    newRegistrations: number;
  };
}

// Health check status
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: number;
  checks: {
    database: boolean;
    redis?: boolean;
    externalAPIs: boolean;
    diskSpace: boolean;
    memory: boolean;
  };
  details: Record<string, unknown>;
}

// Performance metrics
export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: number;
  userAgent?: string;
  userId?: string;
}

class MonitoringService {
  private config: MonitoringConfig;
  private metrics: SystemMetrics | null = null;
  private healthStatus: HealthStatus | null = null;
  private performanceData: PerformanceMetrics[] = [];
  private isInitialized = false;

  constructor(config: MonitoringConfig = defaultConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('Initializing monitoring service...');

    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }

    if (this.config.enableHealthChecks) {
      this.startHealthChecks();
    }

    this.isInitialized = true;
    console.log('Monitoring service initialized');
  }

  private startMetricsCollection(): void {
    if (typeof window !== 'undefined') return; // Server-side only

    setInterval(async () => {
      try {
        this.metrics = await this.collectSystemMetrics();
        
        // Send metrics to analytics
        analytics.track('system_metrics', 'system', {
          ...this.metrics,
          environment: process.env.NODE_ENV,
        });

        // Log metrics to external service if configured
        if (process.env.MONITORING_ENDPOINT) {
          await this.sendMetricsToExternal(this.metrics);
        }
      } catch (error) {
        console.error('Failed to collect system metrics:', error);
        logMessage('Failed to collect system metrics', 'error', { error: error });
      }
    }, this.config.metricsFlushInterval);
  }

  private startHealthChecks(): void {
    if (typeof window !== 'undefined') return; // Server-side only

    setInterval(async () => {
      try {
        this.healthStatus = await this.performHealthCheck();
        
        // Log health status changes
        if (this.healthStatus.status !== 'healthy') {
          console.warn('System health check failed:', this.healthStatus);
          logMessage('System health check failed', 'warning', this.healthStatus as unknown as Record<string, unknown>);
          
          // Send alert for unhealthy status
          analytics.track('health_check_failed', 'system', {
            status: this.healthStatus.status,
            failedChecks: Object.entries(this.healthStatus.checks)
              .filter(([_, passed]) => !passed)
              .map(([check]) => check),
          });
        }
      } catch (error) {
        console.error('Health check failed:', error);
        logMessage('Health check failed', 'error', { error: error });
      }
    }, this.config.healthCheckInterval);
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    // In a real implementation, these would be actual system calls
    // For now, we'll simulate or use available Node.js APIs
    
    const timestamp = Date.now();
    
    // Memory usage (available in Node.js)
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
    const usedMemory = memoryUsage.heapUsed;

    return {
      timestamp,
      cpu: {
        usage: await this.getCPUUsage(),
        loadAverage: this.getLoadAverage(),
      },
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: (usedMemory / totalMemory) * 100,
      },
      database: await this.getDatabaseMetrics(),
      api: await this.getAPIMetrics(),
      users: await this.getUserMetrics(),
    };
  }

  private async getCPUUsage(): Promise<number> {
    // Simplified CPU usage calculation
    // In production, use proper system monitoring libraries
    return Math.random() * 100; // Placeholder
  }

  private getLoadAverage(): number[] {
    try {
      const os = require('os');
      return os.loadavg();
    } catch {
      return [0, 0, 0]; // Fallback for environments without os module
    }
  }

  private async getDatabaseMetrics(): Promise<SystemMetrics['database']> {
    try {
      // In a real implementation, you would query your database for these metrics
      // For now, we'll return mock data
      return {
        connectionCount: 10,
        activeQueries: 2,
        averageQueryTime: 45, // ms
      };
    } catch (error) {
      console.error('Failed to get database metrics:', error);
      return {
        connectionCount: 0,
        activeQueries: 0,
        averageQueryTime: 0,
      };
    }
  }

  private async getAPIMetrics(): Promise<SystemMetrics['api']> {
    // Calculate from performance data
    const recentData = this.performanceData.filter(
      p => Date.now() - p.timestamp < 60000 // Last minute
    );

    const requestCount = recentData.length;
    const errorRate = recentData.filter(p => p.statusCode >= 400).length / requestCount || 0;
    const averageResponseTime = recentData.reduce((sum, p) => sum + p.responseTime, 0) / requestCount || 0;

    return {
      requestCount,
      errorRate: errorRate * 100,
      averageResponseTime,
    };
  }

  private async getUserMetrics(): Promise<SystemMetrics['users']> {
    try {
      // In a real implementation, query your user database
      return {
        activeUsers: 150,
        totalUsers: 1250,
        newRegistrations: 5,
      };
    } catch (error) {
      console.error('Failed to get user metrics:', error);
      return {
        activeUsers: 0,
        totalUsers: 0,
        newRegistrations: 0,
      };
    }
  }

  private async performHealthCheck(): Promise<HealthStatus> {
    const timestamp = Date.now();
    const checks = {
      database: await this.checkDatabase(),
      externalAPIs: await this.checkExternalAPIs(),
      diskSpace: await this.checkDiskSpace(),
      memory: await this.checkMemory(),
    };

    const allHealthy = Object.values(checks).every(check => check);
    const anyUnhealthy = Object.values(checks).some(check => !check);

    let status: HealthStatus['status'] = 'healthy';
    if (anyUnhealthy) {
      status = allHealthy ? 'degraded' : 'unhealthy';
    }

    return {
      status,
      timestamp,
      checks,
      details: {
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV,
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      // In a real implementation, perform a simple database query
      return true; // Placeholder
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  private async checkExternalAPIs(): Promise<boolean> {
    try {
      // Check connectivity to external services (email, SMS, etc.)
      return true; // Placeholder
    } catch (error) {
      console.error('External API health check failed:', error);
      return false;
    }
  }

  private async checkDiskSpace(): Promise<boolean> {
    try {
      // Check available disk space
      return true; // Placeholder
    } catch (error) {
      console.error('Disk space check failed:', error);
      return false;
    }
  }

  private async checkMemory(): Promise<boolean> {
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      // Consider unhealthy if heap usage is over 90%
      return heapUsedPercentage < 90;
    } catch (error) {
      console.error('Memory check failed:', error);
      return false;
    }
  }

  private async sendMetricsToExternal(metrics: SystemMetrics): Promise<void> {
    try {
      if (!process.env.MONITORING_ENDPOINT) return;

      await fetch(process.env.MONITORING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MONITORING_API_KEY}`,
        },
        body: JSON.stringify({
          service: 'aashram-app',
          metrics,
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.error('Failed to send metrics to external service:', error);
    }
  }

  // Public methods for tracking performance
  trackRequest(data: PerformanceMetrics): void {
    if (!this.config.enablePerformanceTracking) return;

    this.performanceData.push(data);

    // Keep only recent data (last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.performanceData = this.performanceData.filter(p => p.timestamp > oneHourAgo);

    // Track slow requests
    if (data.responseTime > 5000) { // 5 seconds
      analytics.trackError(new Error('Slow API response'), {
        endpoint: data.endpoint,
        responseTime: data.responseTime,
        statusCode: data.statusCode,
      });
    }

    // Track errors
    if (data.statusCode >= 400) {
      analytics.track('api_error', 'error', {
        endpoint: data.endpoint,
        method: data.method,
        statusCode: data.statusCode,
        responseTime: data.responseTime,
      });
    }
  }

  trackUserAction(action: string, userId: string, metadata?: Record<string, unknown>): void {
    analytics.track(`user_${action}`, 'user', {
      userId,
      ...metadata,
    });
  }

  trackBusinessMetric(metric: string, value: number, metadata?: Record<string, unknown>): void {
    analytics.track(metric, 'business', {
      value,
      ...metadata,
    });
  }

  // Public getters
  getCurrentMetrics(): SystemMetrics | null {
    return this.metrics;
  }

  getCurrentHealth(): HealthStatus | null {
    return this.healthStatus;
  }

  getRecentPerformance(minutes: number = 15): PerformanceMetrics[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.performanceData.filter(p => p.timestamp > cutoff);
  }

  // Alert system
  private async sendAlert(level: 'warning' | 'error' | 'critical', message: string, data?: Record<string, unknown>): Promise<void> {
    console.log(`[${level.toUpperCase()}] ${message}`, data);
    
    // Send to logging service
    logMessage(message, level === 'warning' ? 'warning' : 'error', data);
    
    // Track in analytics
    analytics.track('system_alert', 'system', {
      level,
      message,
      ...data,
    });

    // In production, integrate with alerting services like PagerDuty, Slack, etc.
    if (process.env.ALERT_WEBHOOK_URL && level === 'critical') {
      try {
        await fetch(process.env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 Critical alert: ${message}`,
            attachments: [{
              color: 'danger',
              fields: Object.entries(data || {}).map(([key, value]) => ({
                title: key,
                value: String(value),
                short: true,
              })),
            }],
          }),
        });
      } catch (error) {
        console.error('Failed to send alert webhook:', error);
      }
    }
  }

  async checkThresholds(): Promise<void> {
    if (!this.metrics) return;

    // Memory threshold
    if (this.metrics.memory.percentage > 85) {
      await this.sendAlert('warning', 'High memory usage detected', {
        usage: `${this.metrics.memory.percentage.toFixed(1)}%`,
        used: this.metrics.memory.used,
        total: this.metrics.memory.total,
      });
    }

    if (this.metrics.memory.percentage > 95) {
      await this.sendAlert('critical', 'Critical memory usage', {
        usage: `${this.metrics.memory.percentage.toFixed(1)}%`,
      });
    }

    // API error rate threshold
    if (this.metrics.api.errorRate > 10) {
      await this.sendAlert('warning', 'High API error rate', {
        errorRate: `${this.metrics.api.errorRate.toFixed(1)}%`,
        requestCount: this.metrics.api.requestCount,
      });
    }

    if (this.metrics.api.errorRate > 25) {
      await this.sendAlert('critical', 'Critical API error rate', {
        errorRate: `${this.metrics.api.errorRate.toFixed(1)}%`,
      });
    }

    // Response time threshold
    if (this.metrics.api.averageResponseTime > 2000) {
      await this.sendAlert('warning', 'Slow API response times', {
        averageResponseTime: `${this.metrics.api.averageResponseTime.toFixed(0)}ms`,
      });
    }
  }
}

// Create singleton instance
export const monitoring = new MonitoringService();

// Initialize monitoring in server environment
if (typeof window === 'undefined') {
  monitoring.initialize().catch(console.error);
}

// Middleware function for tracking API requests (for Express-style middleware)
export function createMonitoringMiddleware() {
  return (req: any, res: any, next: () => void) => {
    const startTime = Date.now();
    const originalEnd = res.end;

    res.end = function(...args: any[]) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      monitoring.trackRequest({
        endpoint: req.url || 'unknown',
        method: req.method || 'GET',
        responseTime,
        statusCode: res.statusCode || 200,
        timestamp: endTime,
        userAgent: req.headers ? req.headers['user-agent'] : undefined,
      });

      originalEnd.apply(res, args);
    };

    next();
  };
}

// Export types and utilities
export type { SystemMetrics, HealthStatus, PerformanceMetrics, MonitoringConfig };

export default monitoring;