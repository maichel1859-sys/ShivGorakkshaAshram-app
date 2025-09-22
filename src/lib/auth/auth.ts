import { NextAuthOptions, getServerSession } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/database/prisma"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"
import { authRateLimiter, loginBackoffLimiter } from "@/lib/external/rate-limit"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  // Enable CSRF protection
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: 'USER' as Role, // Default role for Google sign-in users
        }
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
          }

          // Create identifier for rate limiting (email-based for login attempts)
          const identifier = `login:${credentials.email}`;
          
          // Check rate limiting
          const rateLimitResult = await authRateLimiter.check(identifier);
          if (!rateLimitResult.allowed) {
            console.log(`Rate limit exceeded for ${credentials.email}`);
            return null;
          }

          // Check exponential backoff for failed attempts
          const backoffResult = await loginBackoffLimiter.check(identifier);
          if (!backoffResult.allowed) {
            console.log(`Login blocked due to too many failed attempts: ${credentials.email}`);
            return null;
          }

          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          })

          if (!user || !user.isActive) {
            // Increment rate limiter and record failure
            authRateLimiter.increment(identifier);
            loginBackoffLimiter.recordFailure(identifier);
            return null
          }

          if (!user.password) {
            authRateLimiter.increment(identifier);
            loginBackoffLimiter.recordFailure(identifier);
            return null;
          }
          
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            // Increment rate limiter and record failure
            authRateLimiter.increment(identifier);
            loginBackoffLimiter.recordFailure(identifier);
            return null
          }

          // Reset backoff on successful login
          loginBackoffLimiter.recordSuccess(identifier);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          }
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // 24 hours - how frequently to update the session
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: "/signin",
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === 'development',
  // Prevent credentials from being exposed in URLs
  events: {
    async signIn({ user, account }) {
      try {
        // Use enhanced audit logging
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'SIGN_IN',
            resource: 'User',
            resourceId: user.id,
            metadata: {
              severity: 'LOW',
              category: 'authentication',
              details: 'User signed in successfully'
            },
            newData: {
              provider: account?.provider || "credentials",
              timestamp: new Date().toISOString(),
            },
          },
        });
        console.log("User signed in:", user.email, "via", account?.provider || "credentials");
      } catch (error) {
        // Log the error but don't fail the sign-in process
        console.error("Failed to create audit log for sign-in:", error);
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      try {
        if (user) {
          token.role = user.role
        }
        return token
      } catch (error) {
        console.error("JWT callback error:", error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (token) {
          session.user.id = token.sub!
          session.user.role = token.role as Role
        }
        return session
      } catch (error) {
        console.error("Session callback error:", error);
        return session;
      }
    },
    async redirect({ url, baseUrl }) {
      try {
        // Always allow redirects to the base URL
        if (url.startsWith(baseUrl)) return url;
        
        // For sign-in redirects, redirect to dashboard
        if (url === baseUrl || url === `${baseUrl}/`) {
          return `${baseUrl}/dashboard`;
        }
        
        // For other cases, return the base URL
        return baseUrl;
      } catch (error) {
        console.error("Redirect callback error:", error);
        return baseUrl;
      }
    },
  },
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: Role
    }
  }

  interface User {
    role: Role
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role
  }
}

// Helper function to get server session
export const auth = () => getServerSession(authOptions)

// Helper function to ensure authentication in Server Actions
export async function requireAuth() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    throw new Error('Authentication required')
  }
  
  return session
}

// Helper function to require specific role
export async function requireRole(allowedRoles: Role[]) {
  const session = await requireAuth()
  
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error('Insufficient permissions')
  }
  
  return session
}

// Helper function to require admin access
export async function requireAdminAccess() {
  return requireRole(['ADMIN'])
}

// Helper function to require guruji access
export async function requireGurujiAccess() {
  return requireRole(['ADMIN', 'GURUJI'])
}

// Helper function to require coordinator access
export async function requireCoordinatorAccess() {
  return requireRole(['ADMIN', 'COORDINATOR'])
} 