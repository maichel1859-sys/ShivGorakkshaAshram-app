import { unstable_cache as cache } from 'next/cache';

// Cache configuration
export const CACHE_TAGS = {
  users: 'users',
  appointments: 'appointments',
  queue: 'queue',
  remedies: 'remedies',
  notifications: 'notifications',
  settings: 'settings',
  guruji: 'guruji',
  dashboard: 'dashboard',
  coordinator: 'coordinator',
  admin: 'admin',
  system: 'system',
  audit: 'audit',
  consultations: 'consultations',
} as const;

export const CACHE_TIMES = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  HOUR: 3600, // 1 hour
  DAY: 86400, // 24 hours
  DASHBOARD: 300, // 5 minutes for dashboard data
  ALERTS: 120, // 2 minutes for alerts
  SYSTEM_STATUS: 60, // 1 minute for system status
  SETTINGS: 1800, // 30 minutes for settings
} as const;

// In-memory cache for rate limiting and sessions (since we don't have Redis)
class MemoryCache {
  private cache = new Map<string, { value: unknown; expiry: number; tags?: string[] }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  set(key: string, value: unknown, ttlSeconds: number = 300, tags?: string[]): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiry, tags });
  }

  get<T = unknown>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  keys(): string[] {
    this.cleanup(); // Clean before returning keys
    return Array.from(this.cache.keys());
  }

  // Invalidate by tags
  invalidateByTag(tag: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.includes(tag)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Get cache statistics
  getStats() {
    this.cleanup();
    return {
      size: this.cache.size,
      memoryUsage: this.getMemoryUsage(),
      hitRate: 0, // Would need to implement hit tracking
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private getMemoryUsage(): number {
    // Rough estimate of memory usage
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // Rough string size
      size += JSON.stringify(entry.value).length * 2; // Rough object size
    }
    return size;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Global memory cache instance
export const memoryCache = new MemoryCache();

// Enhanced cache functions using Next.js cache
export const cachedFunctions = {
  // User-related caches
  getUser: cache(
    async (userId: string) => {
      const { prisma } = await import('./database/prisma');
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          dateOfBirth: true,
          address: true,
          emergencyContact: true,
        },
      });
    },
    ['user'],
    { 
      tags: [CACHE_TAGS.users],
      revalidate: CACHE_TIMES.MEDIUM 
    }
  ),

  // Get the primary/default Guruji (currently Shivgoraksha Guruji)
  getGuruji: cache(
    async () => {
      const { prisma } = await import('./database/prisma');
      return prisma.user.findFirst({
        where: { role: 'GURUJI', isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
        orderBy: { createdAt: 'asc' }, // Get the first created Guruji (Shivgoraksha)
      });
    },
    ['guruji'],
    { 
      tags: [CACHE_TAGS.guruji],
      revalidate: CACHE_TIMES.LONG 
    }
  ),

  // Get all active Gurujis (for future multi-Guruji support)
  getAllGurujis: cache(
    async () => {
      const { prisma } = await import('./database/prisma');
      return prisma.user.findMany({
        where: { role: 'GURUJI', isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
        orderBy: { createdAt: 'asc' },
      });
    },
    ['all-gurujis'],
    { 
      tags: [CACHE_TAGS.guruji],
      revalidate: CACHE_TIMES.LONG 
    }
  ),

  // Get specific Guruji by ID
  getGurujiById: cache(
    async (gurujiId: string) => {
      const { prisma } = await import('./database/prisma');
      return prisma.user.findUnique({
        where: { id: gurujiId, role: 'GURUJI', isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
        },
      });
    },
    ['guruji-by-id'],
    { 
      tags: [CACHE_TAGS.guruji],
      revalidate: CACHE_TIMES.LONG 
    }
  ),

  // Appointment-related caches
  getUserAppointments: cache(
    async (userId: string, limit: number = 10) => {
      const { prisma } = await import('./database/prisma');
      return prisma.appointment.findMany({
        where: { userId },
        include: {
          guruji: { select: { id: true, name: true } },
          queueEntry: true,
        },
        orderBy: { date: 'desc' },
        take: limit,
      });
    },
    ['user-appointments'],
    { 
      tags: [CACHE_TAGS.appointments],
      revalidate: CACHE_TIMES.SHORT 
    }
  ),

  getTodayAppointments: cache(
    async (gurujiId?: string) => {
      const { prisma } = await import('./database/prisma');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return prisma.appointment.findMany({
        where: {
          date: { gte: today, lt: tomorrow },
          ...(gurujiId && { gurujiId }),
        },
        include: {
          user: { select: { id: true, name: true, phone: true } },
          queueEntry: true,
        },
        orderBy: { startTime: 'asc' },
      });
    },
    ['today-appointments'],
    { 
      tags: [CACHE_TAGS.appointments],
      revalidate: CACHE_TIMES.SHORT 
    }
  ),

  // Queue-related caches
  getQueueEntries: cache(
    async (gurujiId?: string) => {
      const { prisma } = await import('./database/prisma');
      return prisma.queueEntry.findMany({
        where: {
          status: { in: ['WAITING', 'IN_PROGRESS'] },
          ...(gurujiId && { gurujiId }),
        },
        include: {
          user: { select: { id: true, name: true, phone: true } },
          appointment: { select: { id: true, date: true, startTime: true, priority: true } },
        },
        orderBy: [
          { priority: 'desc' },
          { position: 'asc' },
        ],
      });
    },
    ['queue-entries'],
    { 
      tags: [CACHE_TAGS.queue],
      revalidate: CACHE_TIMES.SHORT 
    }
  ),

  // Dashboard data
  getDashboardStats: cache(
    async (userId: string, userRole: string) => {
      const { prisma } = await import('./database/prisma');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const baseWhere = userRole === 'GURUJI' ? { gurujiId: userId } : 
                       userRole === 'USER' ? { userId } : {} as Record<string, never>;

      const [
        totalAppointments,
        todayAppointments,
        completedToday,
        queueCount
      ] = await Promise.all([
        prisma.appointment.count({ where: baseWhere }),
        prisma.appointment.count({
          where: {
            ...baseWhere,
            date: { gte: today, lt: tomorrow },
          },
        }),
        prisma.appointment.count({
          where: {
            ...baseWhere,
            date: { gte: today, lt: tomorrow },
            status: 'COMPLETED',
          },
        }),
        prisma.queueEntry.count({
          where: {
            status: { in: ['WAITING', 'IN_PROGRESS'] },
            ...(userRole === 'GURUJI' && { gurujiId: userId }),
          },
        }),
      ]);

      return {
        totalAppointments,
        todayAppointments,
        completedToday,
        queueCount,
      };
    },
    ['dashboard-stats'],
    { 
      tags: [CACHE_TAGS.dashboard],
      revalidate: CACHE_TIMES.SHORT 
    }
  ),

  // Settings
  getSystemSettings: cache(
    async () => {
      const { prisma } = await import('./database/prisma');
      const settings = await prisma.systemSetting.findMany({
        where: { isPublic: true },
      });
      
      return settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);
    },
    ['system-settings'],
    { 
      tags: [CACHE_TAGS.settings],
      revalidate: CACHE_TIMES.LONG 
    }
  ),
};

// Cache invalidation functions
export const cacheInvalidation = {
  // Invalidate user-related caches
  invalidateUser: async (userId: string) => {
    const { revalidateTag } = await import('next/cache');
    revalidateTag(CACHE_TAGS.users);
    revalidateTag(CACHE_TAGS.dashboard);
    memoryCache.invalidateByTag(`user:${userId}`);
  },

  // Invalidate appointment-related caches
  invalidateAppointments: async () => {
    const { revalidateTag } = await import('next/cache');
    revalidateTag(CACHE_TAGS.appointments);
    revalidateTag(CACHE_TAGS.queue);
    revalidateTag(CACHE_TAGS.dashboard);
    memoryCache.invalidateByTag('appointments');
  },

  // Invalidate queue-related caches
  invalidateQueue: async () => {
    const { revalidateTag } = await import('next/cache');
    revalidateTag(CACHE_TAGS.queue);
    revalidateTag(CACHE_TAGS.dashboard);
    memoryCache.invalidateByTag('queue');
  },

  // Invalidate all caches
  invalidateAll: async () => {
    const { revalidateTag } = await import('next/cache');
    Object.values(CACHE_TAGS).forEach(tag => revalidateTag(tag));
    memoryCache.clear();
  },

  // Invalidate specific paths
  invalidatePath: async (path: string) => {
    const { revalidatePath } = await import('next/cache');
    revalidatePath(path);
  },
};

// Rate limiting using memory cache
export const rateLimitCache = {
  // Check rate limit
  check: (key: string, limit: number, windowSeconds: number): { allowed: boolean; remaining: number; resetTime: number; totalRequests: number } => {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    
    // Get existing requests
    const requests: number[] = memoryCache.get<number[]>(`rate_limit:${key}`) || [];
    
    // Filter requests within window
    const recentRequests = requests.filter(time => time > windowStart);
    
    const allowed = recentRequests.length < limit;
    const remaining = Math.max(0, limit - recentRequests.length);
    const resetTime = Math.min(...recentRequests) + (windowSeconds * 1000);
    
    return { allowed, remaining, resetTime, totalRequests: recentRequests.length };
  },

  // Increment rate limit
  increment: (key: string, windowSeconds: number) => {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    
    const requests: number[] = memoryCache.get<number[]>(`rate_limit:${key}`) || [];
    const recentRequests = requests.filter(time => time > windowStart);
    recentRequests.push(now);
    
    memoryCache.set(`rate_limit:${key}`, recentRequests, windowSeconds);
  },

  // Clear rate limit
  clear: (key: string) => {
    memoryCache.delete(`rate_limit:${key}`);
  },
};

// Session cache (for temporary data)
export const sessionCache = {
  set: (sessionId: string, data: unknown, ttlSeconds: number = 1800) => {
    memoryCache.set(`session:${sessionId}`, data, ttlSeconds, ['session']);
  },

  get: <T = unknown>(sessionId: string): T | null => {
    return memoryCache.get<T>(`session:${sessionId}`);
  },

  delete: (sessionId: string) => {
    memoryCache.delete(`session:${sessionId}`);
  },

  extend: (sessionId: string, ttlSeconds: number = 1800) => {
    const data = memoryCache.get<unknown>(`session:${sessionId}`);
    if (data) {
      memoryCache.set(`session:${sessionId}`, data, ttlSeconds, ['session']);
    }
  },
};



// Cache warming functions
export const cacheWarming = {
  warmUserCache: async (userId: string) => {
    await Promise.all([
      cachedFunctions.getUser(userId),
      cachedFunctions.getUserAppointments(userId),
      cachedFunctions.getDashboardStats(userId, 'USER'),
    ]);
  },

  warmGurujiCache: async (gurujiId: string) => {
    await Promise.all([
      cachedFunctions.getGuruji(),
      cachedFunctions.getTodayAppointments(gurujiId),
      cachedFunctions.getQueueEntries(gurujiId),
      cachedFunctions.getDashboardStats(gurujiId, 'GURUJI'),
    ]);
  },

  warmSystemCache: async () => {
    await Promise.all([
      cachedFunctions.getSystemSettings(),
      cachedFunctions.getGuruji(),
    ]);
  },
};

// Export cache utility functions
export const cacheUtils = {
  generateKey: (...parts: (string | number)[]): string => {
    return parts.join(':');
  },

  generateUserKey: (userId: string, suffix?: string): string => {
    return suffix ? `user:${userId}:${suffix}` : `user:${userId}`;
  },

  getMemoryCacheStats: () => memoryCache.getStats(),

  clearMemoryCache: () => memoryCache.clear(),
};

// Cleanup on process exit (Node.js only) - Edge Runtime compatible
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  // Only register process handlers in development mode
  // Edge Runtime doesn't support process events
  try {
    if (process.on && typeof process.exit === 'function') {
      process.on('SIGINT', () => {
        memoryCache.destroy();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        memoryCache.destroy();
        process.exit(0);
      });
    }
  } catch {
    // Edge runtime doesn't support process events - ignore silently
  }
}

const cacheModule = {
  cachedFunctions,
  cacheInvalidation,
  rateLimitCache,
  sessionCache,

  cacheWarming,
  cacheUtils,
  memoryCache,
};

export default cacheModule;