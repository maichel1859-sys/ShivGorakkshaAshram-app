import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";

export interface AuthResult {
  session: unknown;
  user: unknown;
  isAuthenticated: boolean;
  hasRole: (roles: Role | Role[]) => boolean;
}

export async function authenticateRequest(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  
  const result: AuthResult = {
    session,
    user: session?.user,
    isAuthenticated: !!session?.user?.id,
    hasRole: (roles: Role | Role[]) => {
      if (!session?.user?.role) return false;
      const userRole = session.user.role as Role;
      return Array.isArray(roles) ? roles.includes(userRole) : userRole === roles;
    }
  };

  return result;
}

export function requireAuth(auth: AuthResult): NextResponse | null {
  if (!auth.isAuthenticated) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  return null;
}

export function requireRole(auth: AuthResult, roles: Role | Role[]): NextResponse | null {
  const authError = requireAuth(auth);
  if (authError) return authError;

  if (!auth.hasRole(roles)) {
    return NextResponse.json(
      { message: "Insufficient permissions" },
      { status: 403 }
    );
  }
  return null;
}

export function createApiResponse<T>(
  data: T,
  status: number = 200,
  message?: string
): NextResponse {
  return NextResponse.json(
    {
      success: status < 400,
      data,
      message,
    },
    { status }
  );
}

export function createApiError(
  message: string,
  status: number = 400,
  errors?: Record<string, string[]>
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      message,
      errors,
    },
    { status }
  );
}

// Common API response patterns
export const ApiResponses = {
  unauthorized: () => createApiError("Unauthorized", 401),
  forbidden: () => createApiError("Insufficient permissions", 403),
  notFound: (resource: string = "Resource") => createApiError(`${resource} not found`, 404),
  validationError: (errors: Record<string, string[]>) => createApiError("Validation failed", 400, errors),
  serverError: (message: string = "Internal server error") => createApiError(message, 500),
  success: <T>(data: T, message?: string) => createApiResponse(data, 200, message),
  created: <T>(data: T, message?: string) => createApiResponse(data, 201, message),
}; 