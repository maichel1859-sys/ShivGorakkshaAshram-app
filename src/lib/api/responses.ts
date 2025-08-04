import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logError } from '@/lib/sentry';

// Standard response interfaces
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  error: string;
  code: string;
  message?: string;
  details?: unknown;
  timestamp: string;
}

// Response factory class
export class ApiResponseFactory {
  private static createResponse<T>(
    data: T | undefined,
    success: boolean,
    status: number,
    message?: string,
    error?: string,
    code?: string,
    details?: unknown
  ): NextResponse {
    const response: ApiResponse<T> | ApiError = success
      ? {
          success: true,
          data,
          message,
          timestamp: new Date().toISOString(),
        }
      : {
          error: error || 'Unknown error',
          code: code || 'UNKNOWN_ERROR',
          message,
          details,
          timestamp: new Date().toISOString(),
        };

    return NextResponse.json(response, { status });
  }

  // Success responses
  static success<T>(data: T, message?: string): NextResponse {
    return this.createResponse(data, true, 200, message);
  }

  static created<T>(data: T, message?: string): NextResponse {
    return this.createResponse(data, true, 201, message || 'Resource created successfully');
  }

  static updated<T>(data: T, message?: string): NextResponse {
    return this.createResponse(data, true, 200, message || 'Resource updated successfully');
  }

  static deleted(message?: string): NextResponse {
    return this.createResponse(undefined, true, 200, message || 'Resource deleted successfully');
  }

  static noContent(): NextResponse {
    return new NextResponse(null, { status: 204 });
  }

  // Paginated response
  static paginated<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
    },
    message?: string
  ): NextResponse {
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      pagination: {
        ...pagination,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
      },
    };

    return NextResponse.json(response, { status: 200 });
  }

  // Error responses
  static badRequest(message: string = 'Bad request', code: string = 'BAD_REQUEST', details?: unknown): NextResponse {
    return this.createResponse(undefined, false, 400, message, message, code, details);
  }

  static unauthorized(message: string = 'Authentication required', code: string = 'UNAUTHORIZED'): NextResponse {
    return this.createResponse(undefined, false, 401, message, message, code);
  }

  static forbidden(message: string = 'Insufficient permissions', code: string = 'FORBIDDEN'): NextResponse {
    return this.createResponse(undefined, false, 403, message, message, code);
  }

  static notFound(resource: string = 'Resource', code: string = 'NOT_FOUND'): NextResponse {
    const message = `${resource} not found`;
    return this.createResponse(undefined, false, 404, message, message, code);
  }

  static conflict(message: string = 'Resource already exists', code: string = 'CONFLICT'): NextResponse {
    return this.createResponse(undefined, false, 409, message, message, code);
  }

  static unprocessableEntity(message: string = 'Validation failed', code: string = 'VALIDATION_ERROR', details?: unknown): NextResponse {
    return this.createResponse(undefined, false, 422, message, message, code, details);
  }

  static tooManyRequests(message: string = 'Rate limit exceeded', code: string = 'RATE_LIMIT_EXCEEDED'): NextResponse {
    return this.createResponse(undefined, false, 429, message, message, code);
  }

  static internalServerError(message: string = 'Internal server error', code: string = 'INTERNAL_ERROR', details?: unknown): NextResponse {
    // Log error for monitoring
    logError(new Error(message), { code, details });
    
    // Don't expose sensitive details in production
    const exposedDetails = process.env.NODE_ENV === 'development' ? details : undefined;
    
    return this.createResponse(undefined, false, 500, message, message, code, exposedDetails);
  }

  static serviceUnavailable(message: string = 'Service temporarily unavailable', code: string = 'SERVICE_UNAVAILABLE'): NextResponse {
    return this.createResponse(undefined, false, 503, message, message, code);
  }

  // Validation error response
  static validationError(errors: ValidationError[], message: string = 'Validation failed'): NextResponse {
    return this.createResponse(
      undefined,
      false,
      422,
      message,
      message,
      'VALIDATION_ERROR',
      { validationErrors: errors }
    );
  }

  // Handle Zod validation errors
  static fromZodError(error: ZodError): NextResponse {
    const validationErrors: ValidationError[] = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    return this.validationError(validationErrors);
  }

  // Handle Prisma errors
  static fromPrismaError(error: Prisma.PrismaClientKnownRequestError): NextResponse {
    switch (error.code) {
      case 'P2002':
        return this.conflict('Resource already exists', 'DUPLICATE_ENTRY');
      case 'P2025':
        return this.notFound('Resource', 'RECORD_NOT_FOUND');
      case 'P2003':
        return this.badRequest('Foreign key constraint failed', 'FOREIGN_KEY_ERROR');
      case 'P2014':
        return this.badRequest('Invalid relation', 'INVALID_RELATION');
      case 'P2021':
        return this.notFound('Table not found', 'TABLE_NOT_FOUND');
      default:
        return this.internalServerError('Database operation failed', 'DATABASE_ERROR', {
          code: error.code,
          meta: error.meta,
        });
    }
  }

  // Generic error handler
  static fromError(error: unknown): NextResponse {
    console.error('API Error:', error);

    if (error instanceof ZodError) {
      return this.fromZodError(error);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaError(error);
    }

    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
        return this.unauthorized();
      }
      
      if (error.message.includes('forbidden') || error.message.includes('permission')) {
        return this.forbidden();
      }
      
      if (error.message.includes('not found')) {
        return this.notFound();
      }
      
      if (error.message.includes('validation')) {
        return this.badRequest(error.message, 'VALIDATION_ERROR');
      }

      return this.internalServerError(error.message, 'INTERNAL_ERROR');
    }

    return this.internalServerError();
  }
}

// Convenience exports
export const {
  success,
  created,
  updated,
  deleted,
  noContent,
  paginated,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessableEntity,
  tooManyRequests,
  internalServerError,
  serviceUnavailable,
  validationError,
  fromZodError,
  fromPrismaError,
  fromError,
} = ApiResponseFactory;

// HTTP status codes for reference
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Response type guards
export function isSuccessResponse<T>(response: unknown): response is ApiResponse<T> {
  return typeof response === 'object' && response !== null && 'success' in response && (response as ApiResponse<T>).success === true;
}

export function isErrorResponse(response: unknown): response is ApiError {
  return typeof response === 'object' && response !== null && 'error' in response;
}

export function isPaginatedResponse<T>(response: unknown): response is PaginatedResponse<T> {
  return isSuccessResponse(response) && 'pagination' in response;
}