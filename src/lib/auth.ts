import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"
import { authRateLimiter, loginBackoffLimiter } from "@/lib/rate-limit"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
          }

          // Create identifier for rate limiting (email-based for login attempts)
          const identifier = `login:${credentials.email}`;
          
          // Check rate limiting
          const rateLimitResult = authRateLimiter.check(identifier);
          if (!rateLimitResult.allowed) {
            console.log(`Rate limit exceeded for ${credentials.email}`);
            return null;
          }

          // Check exponential backoff for failed attempts
          const backoffResult = loginBackoffLimiter.check(identifier);
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
  },
  pages: {
    signIn: "/signin",
    error: "/error",
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
  },
  events: {
    async signIn({ user }) {
      try {
        // Log sign in events for audit
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "SIGN_IN",
            resource: "USER",
            resourceId: user.id,
            newData: {
              provider: "credentials",
              timestamp: new Date().toISOString(),
            },
          },
        });
        console.log("User signed in:", user.email);
      } catch (error) {
        // Log the error but don't fail the sign-in process
        console.error("Failed to create audit log for sign-in:", error);
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