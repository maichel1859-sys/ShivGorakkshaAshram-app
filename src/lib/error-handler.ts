import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Custom error types
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: Record<string, string>) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "AUTHORIZATION_ERROR");
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND_ERROR");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict") {
    super(message, 409, "CONFLICT_ERROR");
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded") {
    super(message, 429, "RATE_LIMIT_ERROR");
    this.name = "RateLimitError";
  }
}

// Error handler for API routes
export function handleApiError(error: unknown): NextResponse {
  console.error("API Error:", error);

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    const fieldErrors: Record<string, string> = {};
    error.errors.forEach((err) => {
      const path = err.path.join(".");
      fieldErrors[path] = err.message;
    });

    return NextResponse.json(
      {
        success: false,
        message: "Validation error",
        code: "VALIDATION_ERROR",
        errors: fieldErrors,
      },
      { status: 400 }
    );
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        success: false,
        message: "Database validation error",
        code: "DB_VALIDATION_ERROR",
      },
      { status: 400 }
    );
  }

  // Handle custom app errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
        code: error.code,
        ...(error instanceof ValidationError && error.errors && { errors: error.errors }),
      },
      { status: error.statusCode }
    );
  }

  // Handle generic errors
  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        message: process.env.NODE_ENV === "production" 
          ? "Internal server error" 
          : error.message,
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }

  // Handle unknown errors
  return NextResponse.json(
    {
      success: false,
      message: "An unexpected error occurred",
      code: "UNKNOWN_ERROR",
    },
    { status: 500 }
  );
}

// Handle Prisma-specific errors
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): NextResponse {
  switch (error.code) {
    case "P2000":
      return NextResponse.json(
        {
          success: false,
          message: "The provided value is too long for the field",
          code: "VALUE_TOO_LONG",
        },
        { status: 400 }
      );

    case "P2001":
      return NextResponse.json(
        {
          success: false,
          message: "Record not found",
          code: "RECORD_NOT_FOUND",
        },
        { status: 404 }
      );

    case "P2002":
      const target = error.meta?.target as string[] | undefined;
      const field = target?.[0] || "field";
      return NextResponse.json(
        {
          success: false,
          message: `A record with this ${field} already exists`,
          code: "UNIQUE_CONSTRAINT_VIOLATION",
          field,
        },
        { status: 409 }
      );

    case "P2003":
      return NextResponse.json(
        {
          success: false,
          message: "Foreign key constraint violation",
          code: "FOREIGN_KEY_CONSTRAINT",
        },
        { status: 400 }
      );

    case "P2004":
      return NextResponse.json(
        {
          success: false,
          message: "A constraint failed on the database",
          code: "CONSTRAINT_FAILED",
        },
        { status: 400 }
      );

    case "P2025":
      return NextResponse.json(
        {
          success: false,
          message: "Record not found or could not be deleted",
          code: "RECORD_NOT_FOUND_OR_RESTRICTED",
        },
        { status: 404 }
      );

    default:
      return NextResponse.json(
        {
          success: false,
          message: "Database error occurred",
          code: "DATABASE_ERROR",
          details: process.env.NODE_ENV === "development" ? error.message : undefined,
        },
        { status: 500 }
      );
  }
}

// Async error wrapper for API handlers
export function asyncHandler(
  handler: (req: Request, context?: unknown) => Promise<NextResponse>
) {
  return async (req: Request, context?: unknown): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// Error logging utility
export function logError(error: unknown, context?: Record<string, unknown>) {
  const errorInfo = {
    message: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    context,
  };

  // In production, you might want to send this to an external service
  if (process.env.NODE_ENV === "production") {
    // Example: sendToErrorReportingService(errorInfo);
    console.error("Production Error:", errorInfo);
  } else {
    console.error("Development Error:", errorInfo);
  }
}

// Client-side error handling
export class ClientErrorHandler {
  static async handleResponse(response: Response): Promise<unknown> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      const error = new AppError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData.code
      );

      if (errorData.errors) {
        (error as unknown as Record<string, unknown>).errors = errorData.errors;
      }

      throw error;
    }

    return response.json();
  }

  static handleError(error: unknown): {
    message: string;
    code?: string;
    errors?: Record<string, string>;
  } {
    if (error instanceof AppError) {
      return {
        message: error.message,
        code: error.code,
        errors: (error as unknown as Record<string, unknown>).errors as Record<string, string>,
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        code: "CLIENT_ERROR",
      };
    }

    return {
      message: "An unexpected error occurred",
      code: "UNKNOWN_CLIENT_ERROR",
    };
  }
}

// Error boundary helper for React components
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === "string") {
    return error;
  }
  
  return "An unexpected error occurred";
}

// Form error helper
export function getFieldError(
  errors: Record<string, string> | undefined,
  fieldName: string
): string | undefined {
  return errors?.[fieldName];
}

// API response success helper
export function createSuccessResponse<T>(
  data: T,
  message: string = "Success",
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

// API response error helper
export function createErrorResponse(
  message: string,
  status: number = 500,
  code?: string,
  errors?: Record<string, string>
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      message,
      code,
      errors,
    },
    { status }
  );
}