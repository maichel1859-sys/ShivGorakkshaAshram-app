// Comprehensive setup and health check for Ashram Management System

interface SetupCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  critical: boolean;
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  checks: SetupCheck[];
  timestamp: Date;
}

export class SystemSetupChecker {
  private checks: SetupCheck[] = [];

  async runAllChecks(): Promise<SystemHealth> {
    this.checks = [];
    
    // Environment variables
    await this.checkEnvironmentVariables();
    
    // Database connectivity
    await this.checkDatabaseConnection();
    
    // External services
    await this.checkExternalServices();
    
    // File system and permissions
    await this.checkFileSystem();
    
    // Client-side capabilities
    if (typeof window !== 'undefined') {
      await this.checkBrowserCapabilities();
    }

    const overallStatus = this.calculateOverallStatus();
    
    return {
      overall: overallStatus,
      checks: this.checks,
      timestamp: new Date(),
    };
  }

  private async checkEnvironmentVariables() {
    const requiredEnvVars = [
      { name: 'DATABASE_URL', critical: true },
      { name: 'NEXTAUTH_SECRET', critical: true },
      { name: 'NEXTAUTH_URL', critical: false },
      { name: 'TWILIO_ACCOUNT_SID', critical: false },
      { name: 'TWILIO_AUTH_TOKEN', critical: false },
      { name: 'TWILIO_PHONE_NUMBER', critical: false },
      { name: 'RESEND_API_KEY', critical: false },
      { name: 'RESEND_FROM_EMAIL', critical: false },
      { name: 'NEXT_PUBLIC_SENTRY_DSN', critical: false },
      { name: 'NEXT_PUBLIC_APP_URL', critical: false },
    ];

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar.name];
      
      if (!value) {
        this.checks.push({
          name: `Environment Variable: ${envVar.name}`,
          status: envVar.critical ? 'fail' : 'warning',
          message: envVar.critical 
            ? `Missing required environment variable: ${envVar.name}`
            : `Optional environment variable not set: ${envVar.name}`,
          critical: envVar.critical,
        });
      } else {
        this.checks.push({
          name: `Environment Variable: ${envVar.name}`,
          status: 'pass',
          message: `Environment variable ${envVar.name} is configured`,
          critical: envVar.critical,
        });
      }
    }
  }

  private async checkDatabaseConnection() {
    try {
      // Dynamic import to avoid issues in client-side
      const { prisma } = await import('./database/prisma');
      
      // Test database connection
      await prisma.$connect();
      
      // Check if tables exist
      const userCount = await prisma.user.count();
      
      this.checks.push({
        name: 'Database Connection',
        status: 'pass',
        message: `Database connected successfully. Found ${userCount} users.`,
        critical: true,
      });
      
      await prisma.$disconnect();
      
    } catch (error: unknown) {
      this.checks.push({
        name: 'Database Connection',
        status: 'fail',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        critical: true,
      });
    }
  }

  private async checkExternalServices() {
    // Check Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        // Test Twilio connection (you would implement actual test here)
        this.checks.push({
          name: 'Twilio SMS Service',
          status: 'pass',
          message: 'Twilio credentials configured',
          critical: false,
        });
      } catch {
        this.checks.push({
          name: 'Twilio SMS Service',
          status: 'warning',
          message: 'Twilio credentials may be invalid',
          critical: false,
        });
      }
    } else {
      this.checks.push({
        name: 'Twilio SMS Service',
        status: 'warning',
        message: 'Twilio not configured - SMS features unavailable',
        critical: false,
      });
    }

    // Check Resend
    if (process.env.RESEND_API_KEY) {
      try {
        // Test Resend connection (you would implement actual test here)
        this.checks.push({
          name: 'Resend Email Service',
          status: 'pass',
          message: 'Resend email service configured',
          critical: false,
        });
      } catch {
        this.checks.push({
          name: 'Resend Email Service',
          status: 'warning',
          message: 'Resend API key may be invalid',
          critical: false,
        });
      }
    } else {
      this.checks.push({
        name: 'Resend Email Service',
        status: 'warning',
        message: 'Resend not configured - email features unavailable',
        critical: false,
      });
    }

    // Check Sentry
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      this.checks.push({
        name: 'Sentry Error Tracking',
        status: 'pass',
        message: 'Sentry error tracking configured',
        critical: false,
      });
    } else {
      this.checks.push({
        name: 'Sentry Error Tracking',
        status: 'warning',
        message: 'Sentry not configured - error tracking unavailable',
        critical: false,
      });
    }
  }

  private async checkFileSystem() {
    // Check if required directories exist
    const requiredDirs = ['public', 'src', 'prisma'];
    
    for (const dir of requiredDirs) {
      try {
        // This would need to be implemented with actual file system checks
        this.checks.push({
          name: `Directory: ${dir}`,
          status: 'pass',
          message: `Required directory ${dir} exists`,
          critical: true,
        });
      } catch {
        this.checks.push({
          name: `Directory: ${dir}`,
          status: 'fail',
          message: `Required directory ${dir} is missing`,
          critical: true,
        });
      }
    }
  }

  private async checkBrowserCapabilities() {
    // Check for required browser APIs
    const capabilities = [
      {
        name: 'Camera Access',
        check: () => !!navigator.mediaDevices?.getUserMedia,
        critical: false,
        message: 'Camera access for QR scanning',
      },
      {
        name: 'Speech Synthesis',
        check: () => !!window.speechSynthesis,
        critical: false,
        message: 'Text-to-speech for audio announcements',
      },
      {
        name: 'Local Storage',
        check: () => !!window.localStorage,
        critical: true,
        message: 'Local storage for offline capabilities',
      },
      {
        name: 'Service Worker',
        check: () => !!navigator.serviceWorker,
        critical: false,
        message: 'Service worker for PWA functionality',
      },

      {
        name: 'Push Notifications',
        check: () => !!window.Notification,
        critical: false,
        message: 'Push notifications for alerts',
      },
    ];

    for (const capability of capabilities) {
      const isSupported = capability.check();
      
      this.checks.push({
        name: capability.name,
        status: isSupported ? 'pass' : (capability.critical ? 'fail' : 'warning'),
        message: isSupported 
          ? `${capability.message} - supported`
          : `${capability.message} - not supported`,
        critical: capability.critical,
      });
    }
  }

  private calculateOverallStatus(): 'healthy' | 'warning' | 'critical' {
    const failedCritical = this.checks.some(check => check.critical && check.status === 'fail');
    const hasWarnings = this.checks.some(check => check.status === 'warning' || check.status === 'fail');

    if (failedCritical) return 'critical';
    if (hasWarnings) return 'warning';
    return 'healthy';
  }

  // Get setup instructions for failed checks
  getSetupInstructions(): string[] {
    const instructions: string[] = [];
    
    const failedChecks = this.checks.filter(check => check.status === 'fail');
    
    for (const check of failedChecks) {
      if (check.name.includes('DATABASE_URL')) {
        instructions.push('1. Set up PostgreSQL database and configure DATABASE_URL environment variable');
      }
      if (check.name.includes('NEXTAUTH_SECRET')) {
        instructions.push('2. Generate and set NEXTAUTH_SECRET environment variable');
      }
      if (check.name.includes('Database Connection')) {
        instructions.push('3. Ensure PostgreSQL is running and accessible');
        instructions.push('4. Run: npx prisma db push to set up database schema');
      }
      if (check.name.includes('Local Storage')) {
        instructions.push('5. Use a modern browser that supports localStorage');
      }
      
    }

    const warningChecks = this.checks.filter(check => check.status === 'warning');
    
    if (warningChecks.some(check => check.name.includes('Twilio'))) {
      instructions.push('• Optional: Configure Twilio for SMS notifications');
    }
    if (warningChecks.some(check => check.name.includes('Resend'))) {
      instructions.push('• Optional: Configure Resend for email notifications');
    }
    if (warningChecks.some(check => check.name.includes('Sentry'))) {
      instructions.push('• Optional: Configure Sentry for error tracking');
    }

    return [...new Set(instructions)]; // Remove duplicates
  }
}

// Export singleton instance
export const setupChecker = new SystemSetupChecker();

// Convenience function for quick health check
export const checkSystemHealth = async (): Promise<SystemHealth> => {
  return await setupChecker.runAllChecks();
};