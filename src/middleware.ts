import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// Define Role enum locally to avoid Prisma import issues in middleware
enum Role {
  ADMIN = "ADMIN",
  USER = "USER",
  COORDINATOR = "COORDINATOR",
  GURUJI = "GURUJI"
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Public routes that don't require authentication
    if (pathname.startsWith('/api/auth') || 
        pathname === '/' || 
        pathname.startsWith('/auth/') ||
        pathname === '/signin' ||
        pathname === '/signup') {
      return NextResponse.next()
    }

    // Require authentication for all other routes
    if (!token) {
      return NextResponse.redirect(new URL('/signin', req.url))
    }

    const userRole = token.role as Role

    // Role-based route protection
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

    // API route protection
    if (pathname.startsWith('/api/admin')) {
      if (userRole !== Role.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    if (pathname.startsWith('/api/coordinator')) {
      if (userRole !== Role.ADMIN && userRole !== Role.COORDINATOR) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    if (pathname.startsWith('/api/guruji')) {
      if (userRole !== Role.ADMIN && userRole !== Role.GURUJI) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow public routes
        if (pathname.startsWith('/api/auth') || 
            pathname === '/' || 
            pathname.startsWith('/auth/') ||
            pathname === '/signin' ||
            pathname === '/signup') {
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
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}