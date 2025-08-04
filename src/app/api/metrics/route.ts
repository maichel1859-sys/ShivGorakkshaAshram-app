import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { monitoring } from '@/lib/monitoring';
import { createErrorResponse } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return createErrorResponse('Unauthorized access to metrics', 401);
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'all';
    const minutes = parseInt(url.searchParams.get('minutes') || '15');

    const response: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      period: `${minutes} minutes`,
    };

    switch (type) {
      case 'system':
        response.metrics = monitoring.getCurrentMetrics();
        break;

      case 'health':
        response.health = monitoring.getCurrentHealth();
        break;

      case 'performance':
        response.performance = {
          recent: monitoring.getRecentPerformance(minutes),
          summary: getPerformanceSummary(monitoring.getRecentPerformance(minutes)),
        };
        break;

      case 'all':
      default:
        response.system = monitoring.getCurrentMetrics();
        response.health = monitoring.getCurrentHealth();
        response.performance = {
          recent: monitoring.getRecentPerformance(minutes),
          summary: getPerformanceSummary(monitoring.getRecentPerformance(minutes)),
        };
        break;
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Metrics endpoint error:', error);
    return createErrorResponse('Failed to retrieve metrics', 500);
  }
}

function getPerformanceSummary(performance: Array<{ responseTime: number; statusCode: number; endpoint: string }>) {
  if (performance.length === 0) {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      slowRequests: 0,
      topEndpoints: [],
    };
  }

  const totalRequests = performance.length;
  const averageResponseTime = performance.reduce((sum, p) => sum + p.responseTime, 0) / totalRequests;
  const errorCount = performance.filter(p => p.statusCode >= 400).length;
  const errorRate = (errorCount / totalRequests) * 100;
  const slowRequests = performance.filter(p => p.responseTime > 2000).length;

  // Get top endpoints by request count
  const endpointCounts = performance.reduce((acc, p) => {
    acc[p.endpoint] = (acc[p.endpoint] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topEndpoints = Object.entries(endpointCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, count }));

  return {
    totalRequests,
    averageResponseTime: Math.round(averageResponseTime),
    errorRate: Math.round(errorRate * 100) / 100,
    slowRequests,
    topEndpoints,
  };
}