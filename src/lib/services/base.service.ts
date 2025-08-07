// Base service interface and abstract class
import { logError, logMessage } from '@/lib/sentry';
// Note: AuthContext type removed since middleware/auth was removed
interface AuthenticatedUser {
  id: string;
  role: string;
  permissions?: string[];
}

interface AuthContext {
  user: AuthenticatedUser;
  session: unknown;
}

// Base service interface
export interface IBaseService {
  // Service identification
  readonly serviceName: string;
  
  // Health check
  healthCheck(): Promise<boolean>;
}

// Service context for dependency injection and request context
export interface ServiceContext {
  auth?: AuthContext;
  requestId?: string;
  correlationId?: string;
  userAgent?: string;
  ipAddress?: string;
}

// Standard service response wrapper
export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  metadata?: Record<string, unknown>;
}

// Service error types
export enum ServiceErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Business Logic
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // Resource Management
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // External Services
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

// Custom service error class
export class ServiceError extends Error {
  public readonly code: ServiceErrorCode;
  public readonly statusCode: number;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    code: ServiceErrorCode = ServiceErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.metadata = metadata;

    // Log error for monitoring
    logError(this, {
      code,
      statusCode,
      metadata,
      service: 'BaseService'
    });
  }
}

// Abstract base service implementation
export abstract class BaseService implements IBaseService {
  public abstract readonly serviceName: string;
  protected context?: ServiceContext;

  constructor(context?: ServiceContext) {
    this.context = context;
  }

  // Set context for request tracking
  setContext(context: ServiceContext): void {
    this.context = context;
  }

  // Get current user from context
  protected getCurrentUser() {
    return this.context?.auth?.user;
  }

  // Check if user has permission
  protected hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    return user.permissions?.includes(permission) || 
           user.permissions?.includes('*') || 
           false;
  }

  // Require authentication
  protected requireAuth(): void {
    if (!this.getCurrentUser()) {
      throw new ServiceError(
        'Authentication required',
        ServiceErrorCode.UNAUTHORIZED,
        401
      );
    }
  }

  // Require specific permission
  protected requirePermission(permission: string): void {
    this.requireAuth();
    
    if (!this.hasPermission(permission)) {
      throw new ServiceError(
        `Permission required: ${permission}`,
        ServiceErrorCode.FORBIDDEN,
        403,
        { requiredPermission: permission }
      );
    }
  }

  // Success response wrapper
  protected success<T>(data: T, metadata?: Record<string, unknown>): ServiceResponse<T> {
    return {
      success: true,
      data,
      metadata,
    };
  }

  // Error response wrapper
  protected error(
    message: string,
    code: ServiceErrorCode = ServiceErrorCode.INTERNAL_ERROR,
    metadata?: Record<string, unknown>
  ): ServiceResponse {
    return {
      success: false,
      error: message,
      code,
      metadata,
    };
  }

  // Execute with error handling
  public async execute<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<ServiceResponse<T>> {
    try {
      const startTime = Date.now();
      
      logMessage(
        `${this.serviceName}: Starting ${operationName}`,
        'info',
        {
          service: this.serviceName,
          operation: operationName,
          userId: this.getCurrentUser()?.id,
          requestId: this.context?.requestId
        }
      );

      const result = await operation();
      const duration = Date.now() - startTime;

      logMessage(
        `${this.serviceName}: Completed ${operationName} in ${duration}ms`,
        'info',
        {
          service: this.serviceName,
          operation: operationName,
          duration,
          userId: this.getCurrentUser()?.id,
          requestId: this.context?.requestId
        }
      );

      return this.success(result, { duration });

    } catch (error) {
      if (error instanceof ServiceError) {
        return this.error(error.message, error.code, error.metadata) as ServiceResponse<T>;
      }

      // Log unexpected errors
      logError(error as Error, {
        service: this.serviceName,
        operation: operationName,
        userId: this.getCurrentUser()?.id,
        requestId: this.context?.requestId
      });

      return this.error(
        'An unexpected error occurred',
        ServiceErrorCode.INTERNAL_ERROR,
        { originalError: (error as Error).message }
      ) as ServiceResponse<T>;
    }
  }

  // Validate input data
  protected validateInput<T>(
    data: unknown,
    validator: (data: unknown) => T,
    errorMessage: string = 'Invalid input data'
  ): T {
    try {
      return validator(data);
    } catch (error) {
      throw new ServiceError(
        errorMessage,
        ServiceErrorCode.VALIDATION_ERROR,
        400,
        { validationError: (error as Error).message }
      );
    }
  }

  // Check resource ownership
  protected checkOwnership(resourceUserId: string, action: string = 'access'): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new ServiceError(
        'Authentication required',
        ServiceErrorCode.UNAUTHORIZED,
        401
      );
    }

    // Admins and coordinators can access any resource
    if (['ADMIN', 'COORDINATOR'].includes(currentUser.role)) {
      return;
    }

    // Users can only access their own resources
    if (currentUser.id !== resourceUserId) {
      throw new ServiceError(
        `Cannot ${action} resource owned by another user`,
        ServiceErrorCode.FORBIDDEN,
        403,
        { 
          action,
          resourceUserId,
          currentUserId: currentUser.id 
        }
      );
    }
  }

  // Rate limiting check (placeholder for implementation)
  protected async checkRateLimit(): Promise<void> {
    // Implementation would depend on your rate limiting strategy
    // This is a placeholder for the interface
    
    // Example: Redis-based rate limiting
    // const current = await redis.get(key);
    // if (current && parseInt(current) >= limit) {
    //   throw new ServiceError(
    //     'Rate limit exceeded',
    //     ServiceErrorCode.RATE_LIMIT_EXCEEDED,
    //     429
    //   );
    // }
  }

  // Health check implementation
  public async healthCheck(): Promise<boolean> {
    try {
      // Override in subclasses to add specific health checks
      return true;
    } catch {
      return false;
    }
  }

  // Utility: Generate correlation ID
  protected generateCorrelationId(): string {
    return `${this.serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility: Sanitize sensitive data for logging
  protected sanitizeForLogging(data: unknown): unknown {
    if (typeof data === 'object' && data !== null) {
      const sanitized: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Remove sensitive fields
        if (['password', 'token', 'secret', 'key', 'authorization'].includes(key.toLowerCase())) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeForLogging(value);
        } else {
          sanitized[key] = value;
        }
      }
      
      return sanitized;
    }
    
    return data;
  }

  // Utility: Parse pagination parameters
  protected parsePagination(params: {
    page?: number | string;
    limit?: number | string;
    maxLimit?: number;
  }): { page: number; limit: number; skip: number } {
    const { page = 1, limit = 20, maxLimit = 100 } = params;
    
    const parsedPage = Math.max(1, parseInt(String(page), 10) || 1);
    const parsedLimit = Math.min(
      maxLimit, 
      Math.max(1, parseInt(String(limit), 10) || 20)
    );
    const skip = (parsedPage - 1) * parsedLimit;

    return {
      page: parsedPage,
      limit: parsedLimit,
      skip
    };
  }

  // Utility: Parse date range
  protected parseDateRange(params: {
    startDate?: string | Date;
    endDate?: string | Date;
  }): { startDate?: Date; endDate?: Date } {
    const { startDate, endDate } = params;
    
    const result: { startDate?: Date; endDate?: Date } = {};

    if (startDate) {
      result.startDate = new Date(startDate);
      if (isNaN(result.startDate.getTime())) {
        throw new ServiceError(
          'Invalid start date format',
          ServiceErrorCode.VALIDATION_ERROR,
          400
        );
      }
    }

    if (endDate) {
      result.endDate = new Date(endDate);
      if (isNaN(result.endDate.getTime())) {
        throw new ServiceError(
          'Invalid end date format',
          ServiceErrorCode.VALIDATION_ERROR,
          400
        );
      }
    }

    // Validate date range
    if (result.startDate && result.endDate && result.startDate > result.endDate) {
      throw new ServiceError(
        'Start date must be before end date',
        ServiceErrorCode.VALIDATION_ERROR,
        400
      );
    }

    return result;
  }
}

// Service registry for dependency injection
export class ServiceRegistry {
  private static services = new Map<string, IBaseService>();

  static register<T extends IBaseService>(name: string, service: T): void {
    this.services.set(name, service);
  }

  static get<T extends IBaseService>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new ServiceError(
        `Service ${name} not found`,
        ServiceErrorCode.INTERNAL_ERROR,
        500
      );
    }
    return service as T;
  }

  static has(name: string): boolean {
    return this.services.has(name);
  }

  static clear(): void {
    this.services.clear();
  }

  static async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [name, service] of this.services) {
      try {
        results[name] = await service.healthCheck();
      } catch {
        results[name] = false;
      }
    }

    return results;
  }
}

// Decorator for service methods to add automatic error handling
export function ServiceMethod(operationName?: string) {
  return function (
    target: unknown,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    const finalOperationName = operationName || propertyName;

    descriptor.value = async function (...args: unknown[]) {
      if (this instanceof BaseService) {
        return await (this as BaseService).execute(
          () => method.apply(this, args),
          finalOperationName
        );
      }
      return method.apply(this, args);
    };

    return descriptor;
  };
}