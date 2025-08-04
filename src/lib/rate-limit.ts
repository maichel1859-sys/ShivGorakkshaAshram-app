import { NextRequest } from 'next/server';
import { rateLimitCache } from './cache';

interface RateLimitEntry {
  count: number;
  lastReset: number;
}

// Using Next.js memory cache instead of Redis
const rateLimitMap = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
}

export class RateLimiter {
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...options,
    };
  }

  check(identifier: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    // Get or create entry
    let entry = rateLimitMap.get(identifier);
    
    if (!entry || entry.lastReset < windowStart) {
      // Reset the window
      entry = {
        count: 0,
        lastReset: now,
      };
      rateLimitMap.set(identifier, entry);
    }

    const allowed = entry.count < this.options.maxRequests;
    const remaining = Math.max(0, this.options.maxRequests - entry.count);
    const resetTime = entry.lastReset + this.options.windowMs;

    return {
      allowed,
      remaining,
      resetTime,
      totalRequests: entry.count,
    };
  }

  increment(identifier: string): void {
    const entry = rateLimitMap.get(identifier);
    if (entry) {
      entry.count++;
    }
  }

  // Clean up old entries (should be called periodically)
  static cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      // Remove entries older than 1 hour
      if (now - entry.lastReset > 60 * 60 * 1000) {
        rateLimitMap.delete(key);
      }
    }
  }
}

// Predefined rate limiters for different use cases
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
});

export const otpRateLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 3, // 3 OTP requests per 5 minutes
});

export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 API calls per 15 minutes
});

export const registrationRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 registration attempts per hour
});

// Helper function to get client identifier
export function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from various headers (for production with proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');
  
  let ip = forwarded?.split(',')[0] || realIp || cfIp || 'unknown';
  
  // For development, use a fallback
  if (ip === 'unknown' && process.env.NODE_ENV === 'development') {
    ip = '127.0.0.1';
  }
  
  // Also include user agent to make it slightly more unique
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const userAgentHash = userAgent.length > 0 ? 
    userAgent.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0).toString() : 
    'unknown';
  
  return `${ip}:${userAgentHash}`;
}

// Middleware function for applying rate limiting
export function applyRateLimit(
  rateLimiter: RateLimiter,
  identifier: string,
  increment = true
): RateLimitResult {
  const result = rateLimiter.check(identifier);
  
  if (increment && result.allowed) {
    rateLimiter.increment(identifier);
  }
  
  return result;
}

// Helper function to create rate limit response headers
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.totalRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };
}

// Enhanced rate limiting using Next.js cache
export function applyRateLimitWithCache(
  identifier: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const result = rateLimitCache.check(identifier, limit, windowSeconds);
  
  if (result.allowed) {
    rateLimitCache.increment(identifier, windowSeconds);
  }
  
  return result;
}

// Background cleanup task
if (typeof window === 'undefined') {
  // Only run in server environment
  setInterval(() => {
    RateLimiter.cleanup();
  }, 15 * 60 * 1000); // Cleanup every 15 minutes
}

// Advanced rate limiting for specific use cases
export class SlidingWindowRateLimiter {
  private requests = new Map<string, number[]>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  check(identifier: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this identifier
    const requestTimes = this.requests.get(identifier) || [];
    
    // Filter out requests outside the current window
    const recentRequests = requestTimes.filter(time => time > windowStart);
    
    const allowed = recentRequests.length < this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - recentRequests.length);
    const resetTime = recentRequests.length > 0 ? 
      Math.min(...recentRequests) + this.windowMs : 
      now + this.windowMs;

    return {
      allowed,
      remaining,
      resetTime,
      totalRequests: recentRequests.length,
    };
  }

  increment(identifier: string): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    const requestTimes = this.requests.get(identifier) || [];
    const recentRequests = requestTimes.filter(time => time > windowStart);
    
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, times] of this.requests.entries()) {
      const recentTimes = times.filter(time => now - time < this.windowMs * 2);
      if (recentTimes.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recentTimes);
      }
    }
  }
}

// Exponential backoff rate limiter for repeated failures
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

    const allowed = now >= entry.backoffUntil && entry.count < this.maxAttempts;
    const remaining = Math.max(0, this.maxAttempts - entry.count);

    return {
      allowed,
      remaining,
      resetTime: entry.backoffUntil,
      totalRequests: entry.count,
    };
  }

  recordFailure(identifier: string): void {
    const now = Date.now();
    const entry = this.attempts.get(identifier) || { count: 0, lastAttempt: 0, backoffUntil: 0 };

    entry.count++;
    entry.lastAttempt = now;
    
    // Calculate exponential backoff delay
    const delay = Math.min(
      this.baseDelayMs * Math.pow(2, entry.count - 1),
      this.maxDelayMs
    );
    
    entry.backoffUntil = now + delay;
    this.attempts.set(identifier, entry);
  }

  recordSuccess(identifier: string): void {
    // Reset on successful attempt
    this.attempts.delete(identifier);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.attempts.entries()) {
      // Remove entries that are expired and old
      if (now > entry.backoffUntil && now - entry.lastAttempt > 60 * 60 * 1000) {
        this.attempts.delete(key);
      }
    }
  }
}

// Create specialized rate limiters
export const loginBackoffLimiter = new ExponentialBackoffRateLimiter(
  2000, // Start with 2 second delay
  300000, // Max 5 minute delay
  5 // Max 5 attempts before permanent lockout (until cleanup)
);

export default RateLimiter;