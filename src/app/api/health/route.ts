import { NextResponse } from 'next/server';
import { monitoring } from '@/lib/monitoring';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Perform basic health checks
    const checks = {
      timestamp: new Date().toISOString(),
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      service: 'aashram-app',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      checks: {
        database: false,
        memory: false,
        api: false,
      },
      metrics: {} as Record<string, unknown>,
    };

    // Database connectivity check
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.checks.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
      checks.status = 'unhealthy';
    }

    // Memory check
    const memoryUsage = process.memoryUsage();
    const heapUsedPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    checks.checks.memory = heapUsedPercentage < 90;
    if (!checks.checks.memory) {
      checks.status = 'unhealthy';
    }

    // API response time check
    const responseTime = Date.now() - startTime;
    checks.checks.api = responseTime < 1000; // Less than 1 second
    if (!checks.checks.api) {
      checks.status = 'degraded';
    }

    // Add current metrics if available
    const currentMetrics = monitoring.getCurrentMetrics();
    if (currentMetrics) {
      checks.metrics = {
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          percentage: Math.round(heapUsedPercentage),
        },
        responseTime,
        uptime: Math.round(process.uptime()),
      };
    }

    // Set appropriate status code
    const statusCode = checks.status === 'healthy' ? 200 : 
                      checks.status === 'degraded' ? 200 : 503;

    return NextResponse.json(checks, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Health check endpoint error:', error);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      service: 'aashram-app',
      error: 'Health check failed',
      uptime: process.uptime(),
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}

// Simple liveness probe (always returns 200 if server is running)
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}