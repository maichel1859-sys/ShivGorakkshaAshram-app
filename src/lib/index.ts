// Main lib exports - Organized by functionality

// Database & Prisma
export { prisma } from './database/prisma';

// Server Actions
export * from './actions';

// Authentication & Core
export { authOptions } from './core/auth';

// External Services
export { sendEmail } from './external/email';
export { sendSMS, generateOTP } from './external/sms';
export * from './external/rate-limit';

// Repositories
export * from './repositories';

// Services
export * from './services/base.service';
export * from './services/user.service';

// Validation
export * from './validation/unified-schemas';

// Utilities
export { cn } from './utils/helpers';
export * from './utils/colors';

// Communication
export * from './communication/socket-manager';

// Error Handling
export { 
  AppError, 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError, 
  NotFoundError, 
  ConflictError, 
  RateLimitError,
  handleApiError,
  asyncHandler,
  ClientErrorHandler,
  getErrorMessage,
  createSuccessResponse,
  createErrorResponse
} from './error-handler';

// Cache & Performance
export * from './cache';
export * from './analytics';
export * from './image-optimization';

// Monitoring & Logging - avoid duplicate logError export
export { default as Sentry, logError, logMessage, setUserContext, clearUserContext, startTransaction, addBreadcrumb, captureReactError } from './sentry';
export * from './setup-check';

// Internationalization
export * from './i18n';

// Metadata & PWA
export * from './metadata';
export * from './pwa';

// Swagger (API Documentation)
export * from './swagger'; 