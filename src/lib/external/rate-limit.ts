import { NextRequest } from 'next/server';

// Rate limiting interface
interface RateLimitEntry {
  count: number;
  lastReset: number;
}

// Redis-compatible interface for rate limiting
interface RedisLikeStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, expireInSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// In-memory fallback store (available for future use if needed)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class MemoryStore implements RedisLikeStore {
  private store = new Map<string, { value: string; expires?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (entry.expires && Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value;
  }

  async set(key: string, value: string, expireInSeconds?: number): Promise<void> {
    const entry: { value: string; expires?: number } = { value };
    if (expireInSeconds) {
      entry.expires = Date.now() + (expireInSeconds * 1000);
    }
    this.store.set(key, entry);
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    
    if (entry.expires && Date.now() > entry.expires) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expires && now > entry.expires) {
        this.store.delete(key);
      }
    }
  }
}

// Rate limiter options
interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Rate limit result
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
}

// Base rate limiter interface
export interface IRateLimiter {
  check(identifier: string): RateLimitResult | Promise<RateLimitResult>;
  increment(identifier: string): void | Promise<void>;
}

// Rate limiter class
export class RateLimiter implements IRateLimiter {
  private options: RateLimitOptions;
  private requests = new Map<string, RateLimitEntry>();

  constructor(options: RateLimitOptions) {
    this.options = options;
  }

  check(identifier: string): RateLimitResult {
    const now = Date.now();
    const entry = this.requests.get(identifier);
    
    if (!entry || now > entry.lastReset + this.options.windowMs) {
      // First request or window expired
      this.requests.set(identifier, {
        count: 0,
        lastReset: now
      });
      
      return {
        allowed: true,
        remaining: this.options.maxRequests - 1,
        resetTime: now + this.options.windowMs,
        totalRequests: 0
      };
    }
    
    const remaining = Math.max(0, this.options.maxRequests - entry.count);
    const allowed = remaining > 0;
    
    return {
      allowed,
      remaining,
      resetTime: entry.lastReset + this.options.windowMs,
      totalRequests: entry.count
    };
  }

  increment(identifier: string): void {
    const entry = this.requests.get(identifier);
    if (entry) {
      entry.count++;
    }
  }

  static cleanup(): void {
    // This would be called periodically to clean up old entries
    // For now, we'll rely on the Map's automatic cleanup
  }
}

// Get client identifier for rate limiting
export function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  // NextRequest doesn't have ip property directly, extract from headers
  let ip = 'unknown';
  
  if (forwarded) {
    ip = forwarded.split(',')[0].trim();
  } else if (realIp) {
    ip = realIp;
  } else if (cfConnectingIp) {
    ip = cfConnectingIp;
  }
  
  // Add user agent for additional uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return `${ip}:${userAgent}`;
}

// Apply rate limit to a request
export async function applyRateLimit(
  rateLimiter: IRateLimiter,
  identifier: string,
  increment = true
): Promise<RateLimitResult> {
  const result = await rateLimiter.check(identifier);
  
  if (increment && result.allowed) {
    await rateLimiter.increment(identifier);
  }
  
  return result;
}

// Create rate limit headers
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toString(),
  };
}

// Apply rate limit with cache
export async function applyRateLimitWithCache(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const rateLimiter = new RateLimiter({
    windowMs: windowSeconds * 1000,
    maxRequests: limit,
  });
  
  return await applyRateLimit(rateLimiter, identifier);
}

// Sliding window rate limiter
export class SlidingWindowRateLimiter implements IRateLimiter {
  private requests = new Map<string, number[]>();
  private windowMs: number;
  private maxRequests: number;
  private options: RateLimitOptions;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.options = { windowMs, maxRequests };
  }

  check(identifier: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests
    const requests = this.requests.get(identifier) || [];
    
    // Filter requests within window
    const recentRequests = requests.filter(time => time > windowStart);
    
    const allowed = recentRequests.length < this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - recentRequests.length);
    const resetTime = Math.min(...recentRequests) + this.windowMs;
    
    return { allowed, remaining, resetTime, totalRequests: recentRequests.length };
  }

  increment(identifier: string): void {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    requests.push(now);
    
    // Keep only recent requests
    const windowStart = now - this.windowMs;
    const recentRequests = requests.filter(time => time > windowStart);
    
    this.requests.set(identifier, recentRequests);
  }

  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [identifier, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => time > windowStart);
      if (recentRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recentRequests);
      }
    }
  }
}

// Exponential backoff rate limiter
export class ExponentialBackoffRateLimiter {
  private attempts = new Map<string, { count: number; lastAttempt: number; backoffUntil: number }>();
  private baseDelayMs: number;
  private maxDelayMs: number;
  private maxAttempts: number;

  constructor(baseDelayMs = 1000, maxDelayMs = 300000, maxAttempts = 10) {
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.maxAttempts = maxAttempts;
  }

  check(identifier: string): RateLimitResult {
    const now = Date.now();
    const entry = this.attempts.get(identifier);
    
    if (!entry) {
      return { allowed: true, remaining: this.maxAttempts, resetTime: now, totalRequests: 0 };
    }
    
    if (now < entry.backoffUntil) {
      return { allowed: false, remaining: 0, resetTime: entry.backoffUntil, totalRequests: entry.count };
    }
    
    const remaining = Math.max(0, this.maxAttempts - entry.count);
    return { allowed: remaining > 0, remaining, resetTime: now, totalRequests: entry.count };
  }

  recordFailure(identifier: string): void {
    const now = Date.now();
    const entry = this.attempts.get(identifier) || { count: 0, lastAttempt: now, backoffUntil: now };
    
    entry.count++;
    entry.lastAttempt = now;
    
    // Calculate exponential backoff
    const delay = Math.min(this.baseDelayMs * Math.pow(2, entry.count - 1), this.maxDelayMs);
    entry.backoffUntil = now + delay;
    
    this.attempts.set(identifier, entry);
  }

  recordSuccess(identifier: string): void {
    this.attempts.delete(identifier);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [identifier, entry] of this.attempts.entries()) {
      if (now > entry.backoffUntil + this.maxDelayMs) {
        this.attempts.delete(identifier);
      }
    }
  }
}

// Persistent rate limiter using store
export class PersistentRateLimiter implements IRateLimiter {
  private store: RedisLikeStore;
  private windowMs: number;
  private maxRequests: number;
  private keyPrefix: string;

  constructor(store: RedisLikeStore, windowMs: number, maxRequests: number, keyPrefix: string = 'rl') {
    this.store = store;
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.keyPrefix = keyPrefix;
  }

  async check(identifier: string): Promise<RateLimitResult> {
    const key = `${this.keyPrefix}:${identifier}`;
    const now = Date.now();
    
    try {
      const data = await this.store.get(key);
      let entry: RateLimitEntry;
      
      if (!data) {
        entry = { count: 0, lastReset: now };
      } else {
        entry = JSON.parse(data);
        
        // Check if window has expired
        if (now > entry.lastReset + this.windowMs) {
          entry = { count: 0, lastReset: now };
        }
      }
      
      const remaining = Math.max(0, this.maxRequests - entry.count);
      const allowed = remaining > 0;
      const resetTime = entry.lastReset + this.windowMs;
      
      return {
        allowed,
        remaining,
        resetTime,
        totalRequests: entry.count
      };
    } catch (error) {
      console.error('Rate limiter check error:', error);
      // Fallback to allowing the request if store fails
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetTime: now + this.windowMs,
        totalRequests: 0
      };
    }
  }

  async increment(identifier: string): Promise<void> {
    const key = `${this.keyPrefix}:${identifier}`;
    const now = Date.now();
    
    try {
      const data = await this.store.get(key);
      let entry: RateLimitEntry;
      
      if (!data) {
        entry = { count: 1, lastReset: now };
      } else {
        entry = JSON.parse(data);
        
        // Check if window has expired
        if (now > entry.lastReset + this.windowMs) {
          entry = { count: 1, lastReset: now };
        } else {
          entry.count++;
        }
      }
      
      // Store with expiration
      await this.store.set(
        key, 
        JSON.stringify(entry), 
        Math.ceil(this.windowMs / 1000)
      );
    } catch (error) {
      console.error('Rate limiter increment error:', error);
    }
  }
}

// Adapter to use existing memory cache from cache.ts
class CacheStoreAdapter implements RedisLikeStore {
  private memoryCache: { get: (key: string) => string | null; set: (key: string, value: string, ttl?: number) => void; delete: (key: string) => void; has: (key: string) => boolean } | null = null;

  constructor() {
    // Import the cache module to use existing memory cache
    import('../cache').then(cache => {
      this.memoryCache = cache.memoryCache;
    });
  }

  async get(key: string): Promise<string | null> {
    if (!this.memoryCache) return null;
    return this.memoryCache.get(key);
  }

  async set(key: string, value: string, expireInSeconds?: number): Promise<void> {
    if (!this.memoryCache) return;
    this.memoryCache.set(key, value, expireInSeconds || 300);
  }

  async del(key: string): Promise<void> {
    if (!this.memoryCache) return;
    this.memoryCache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.memoryCache) return false;
    return this.memoryCache.has(key);
  }
}

// Store singleton - uses existing cache system
let storeInstance: RedisLikeStore | null = null;

function getStore(): RedisLikeStore {
  if (!storeInstance) {
    // Use the cache adapter to leverage existing memory cache
    storeInstance = new CacheStoreAdapter();
  }
  
  return storeInstance;
}

// Pre-configured rate limiters with persistent storage
export const authRateLimiter = new PersistentRateLimiter(
  getStore(),
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per 15 minutes
  'auth'
);

export class PersistentExponentialBackoffRateLimiter {
  private store: RedisLikeStore;
  private baseDelayMs: number;
  private maxDelayMs: number;
  private maxAttempts: number;
  private keyPrefix: string;

  constructor(store: RedisLikeStore, baseDelayMs = 1000, maxDelayMs = 300000, maxAttempts = 10, keyPrefix = 'backoff') {
    this.store = store;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.maxAttempts = maxAttempts;
    this.keyPrefix = keyPrefix;
  }

  async check(identifier: string): Promise<RateLimitResult> {
    const key = `${this.keyPrefix}:${identifier}`;
    const now = Date.now();
    
    try {
      const data = await this.store.get(key);
      
      if (!data) {
        return { allowed: true, remaining: this.maxAttempts, resetTime: now, totalRequests: 0 };
      }
      
      const entry = JSON.parse(data);
      
      if (now < entry.backoffUntil) {
        return { allowed: false, remaining: 0, resetTime: entry.backoffUntil, totalRequests: entry.count };
      }
      
      const remaining = Math.max(0, this.maxAttempts - entry.count);
      return { allowed: remaining > 0, remaining, resetTime: now, totalRequests: entry.count };
    } catch (error) {
      console.error('Backoff limiter check error:', error);
      return { allowed: true, remaining: this.maxAttempts, resetTime: now, totalRequests: 0 };
    }
  }

  async recordFailure(identifier: string): Promise<void> {
    const key = `${this.keyPrefix}:${identifier}`;
    const now = Date.now();
    
    try {
      const data = await this.store.get(key);
      const entry = data ? JSON.parse(data) : { count: 0, lastAttempt: now, backoffUntil: now };
      
      entry.count++;
      entry.lastAttempt = now;
      
      // Calculate exponential backoff
      const delay = Math.min(this.baseDelayMs * Math.pow(2, entry.count - 1), this.maxDelayMs);
      entry.backoffUntil = now + delay;
      
      await this.store.set(key, JSON.stringify(entry), Math.ceil((delay + this.maxDelayMs) / 1000));
    } catch (error) {
      console.error('Backoff limiter record failure error:', error);
    }
  }

  async recordSuccess(identifier: string): Promise<void> {
    const key = `${this.keyPrefix}:${identifier}`;
    try {
      await this.store.del(key);
    } catch (error) {
      console.error('Backoff limiter record success error:', error);
    }
  }
}

export const loginBackoffLimiter = new PersistentExponentialBackoffRateLimiter(
  getStore(),
  1000, // 1 second base delay
  300000, // 5 minutes max delay
  10, // 10 attempts before max backoff
  'login_backoff'
);

export const apiRateLimiter = new PersistentRateLimiter(
  getStore(),
  60 * 1000, // 1 minute window
  100, // 100 requests per minute
  'api'
); 