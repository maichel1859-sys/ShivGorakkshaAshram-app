import { withAuth } from "next-auth/middleware"
import { NextResponse, type NextRequest } from "next/server"
import { apiRateLimiter, getClientIdentifier, applyRateLimit } from "@/lib/external/rate-limit"

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
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://vitals.vercel-insights.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim()

// Security headers function
function addSecurityHeaders(response: NextResponse) {
  // Enhanced security headers for Next.js 15
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  response.headers.set('Content-Security-Policy', CSP_HEADER)
  
  // HSTS for HTTPS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  
  // Remove server header for security
  response.headers.delete('Server')
  response.headers.delete('X-Powered-By')
}

// Rate limiting configuration
function handleRateLimit(req: NextRequest) {
  const identifier = getClientIdentifier(req)
  
  try {
    const result = applyRateLimit(apiRateLimiter, identifier)
    
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
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
            'Retry-After': Math.round((result.resetTime - Date.now()) / 1000).toString(),
          }
        }
      )
    }
  } catch (error) {
    console.error('Rate limiting error:', error)
    // Continue without rate limiting if there's an error
  }
  
  return null
}

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Apply rate limiting to API routes
    if (pathname.startsWith('/api/')) {
      const rateLimitResponse = handleRateLimit(req)
      if (rateLimitResponse) {
        return rateLimitResponse
      }
    }

    // Public routes that don't require authentication
    const publicRoutes = [
      '/api/auth',
      '/',
      '/auth',
      '/signin',
      '/signup',
      '/error',
      '/api/health',
      '/api/docs',
      '/api/metrics',
      '/manifest.json',
      '/robots.txt',
      '/sitemap.xml',
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

    // Add security headers to all responses
    const response = NextResponse.next()
    addSecurityHeaders(response)

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow public routes
        const publicRoutes = [
          '/api/auth',
          '/',
          '/auth',
          '/signin',
          '/signup',
          '/error',
          '/api/health',
          '/api/docs',
          '/api/metrics',
        ]

        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true
        }

        // Require token for all other routes
        return !!token
      },
    },
  }
)

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