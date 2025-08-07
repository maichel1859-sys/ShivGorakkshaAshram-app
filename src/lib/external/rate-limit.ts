import { NextRequest } from 'next/server';

// Rate limiting interface
interface RateLimitEntry {
  count: number;
  lastReset: number;
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
  check(identifier: string): RateLimitResult;
  increment(identifier: string): void;
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
export function applyRateLimit(
  rateLimiter: IRateLimiter,
  identifier: string,
  increment = true
): RateLimitResult {
  const result = rateLimiter.check(identifier);
  
  if (increment && result.allowed) {
    rateLimiter.increment(identifier);
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
export function applyRateLimitWithCache(
  identifier: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const rateLimiter = new RateLimiter({
    windowMs: windowSeconds * 1000,
    maxRequests: limit,
  });
  
  return applyRateLimit(rateLimiter, identifier);
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

// Pre-configured rate limiters
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
});

export const loginBackoffLimiter = new ExponentialBackoffRateLimiter(
  1000, // 1 second base delay
  300000, // 5 minutes max delay
  10 // 10 attempts before max backoff
);

export const apiRateLimiter = new SlidingWindowRateLimiter(
  60 * 1000, // 1 minute window
  100 // 100 requests per minute
); 