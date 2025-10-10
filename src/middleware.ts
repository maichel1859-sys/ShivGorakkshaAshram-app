import { NextResponse, type NextRequest } from "next/server"
import { apiRateLimiter, getClientIdentifier } from "@/lib/external/rate-limit"
import { getToken } from "next-auth/jwt"

// Define Role enum locally to avoid Prisma import issues in middleware
enum Role {
  ADMIN = "ADMIN",
  USER = "USER",
  COORDINATOR = "COORDINATOR",
  GURUJI = "GURUJI"
}

// Enhanced CSP for better security
const CSP_HEADER = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https://vitals.vercel-insights.com wss: ws:;
  media-src 'self' blob: data:;
  object-src 'none';
  child-src 'none';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  manifest-src 'self';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim()

// Security headers function
function addSecurityHeaders(response: NextResponse) {
  // Enhanced security headers for Next.js 15
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()')
  response.headers.set('Content-Security-Policy', CSP_HEADER)
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  
  // HSTS for HTTPS with stronger settings
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
  
  // Remove server headers for security
  response.headers.delete('Server')
  response.headers.delete('X-Powered-By')
  response.headers.delete('X-AspNet-Version')
  response.headers.delete('X-AspNetMvc-Version')
}

// Rate limiting configuration
async function handleRateLimit(req: NextRequest) {
  const identifier = getClientIdentifier(req)
  
  try {
    // Use the persistent rate limiter which returns a promise
    const result = await apiRateLimiter.check(identifier)
    
    if (!result.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.round((result.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': (result.totalRequests + result.remaining).toString(),
            'X-RateLimit-Remaining': result.remaining?.toString() || '0',
            'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
            'Retry-After': Math.round((result.resetTime - Date.now()) / 1000).toString(),
          }
        }
      )
    }
    
    // Increment the rate limiter if request is allowed
    await apiRateLimiter.increment(identifier)
  } catch (error) {
    console.error('Rate limiting error:', error)
    // Continue without rate limiting if there's an error
  }
  
  return null
}

export default async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const { pathname } = req.nextUrl

    // Apply rate limiting to API routes
    if (pathname.startsWith('/api/')) {
      const rateLimitResponse = await handleRateLimit(req)
      if (rateLimitResponse) {
        return rateLimitResponse
      }
    }

    // Public routes that don't require authentication
    const publicRoutes = [
      '/api/auth',
      '/',
      '/signin',
      '/signup',
      '/phone-login',
      '/error',
      '/unauthorized',
      '/api/docs',
      '/manifest.json',
      '/robots.txt',
      '/sitemap.xml',
      '/locales',
    ]

    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

    if (isPublicRoute) {
      const response = NextResponse.next()
      addSecurityHeaders(response)
      return response
    }

    // Require authentication for all other routes
    if (!token) {
      return NextResponse.redirect(new URL('/signin', req.url))
    }

    const userRole = token.role as Role

    // Role-based route protection with better error handling
    if (pathname.startsWith('/admin')) {
      if (userRole !== Role.ADMIN) {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }

    if (pathname.startsWith('/coordinator')) {
      if (userRole !== Role.ADMIN && userRole !== Role.COORDINATOR) {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }

    if (pathname.startsWith('/guruji')) {
      if (userRole !== Role.ADMIN && userRole !== Role.GURUJI) {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }

    if (pathname.startsWith('/user')) {
      if (userRole !== Role.ADMIN && userRole !== Role.USER) {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }

    // API route protection with proper error responses
    if (pathname.startsWith('/api/admin')) {
      if (userRole !== Role.ADMIN) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Admin access required' }, 
          { status: 403 }
        )
      }
    }

    if (pathname.startsWith('/api/coordinator')) {
      if (userRole !== Role.ADMIN && userRole !== Role.COORDINATOR) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Coordinator access required' }, 
          { status: 403 }
        )
      }
    }

    if (pathname.startsWith('/api/guruji')) {
      if (userRole !== Role.ADMIN && userRole !== Role.GURUJI) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Guruji access required' }, 
          { status: 403 }
        )
      }
    }

    if (pathname.startsWith('/api/user')) {
      if (userRole !== Role.ADMIN && userRole !== Role.USER) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'User access required' }, 
          { status: 403 }
        )
      }
    }

  // Add security headers to all responses
  const response = NextResponse.next()
  addSecurityHeaders(response)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - manifest.json (PWA manifest)
     * - robots.txt and sitemap.xml (SEO files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|manifest.json|robots.txt|sitemap.xml|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)',
  ],
}
