/**
 * Custom error classes for better error handling
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: unknown): {
  statusCode: number;
  body: {
    error: {
      message: string;
      code?: string;
      fields?: Record<string, string[]>;
    };
  };
} {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          message: error.message,
          code: error.code,
          fields: error instanceof ValidationError ? error.fields : undefined,
        },
      },
    };
  }

  // Unknown error
  return {
    statusCode: 500,
    body: {
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    },
  };
}

/**
 * Async error handler wrapper for Azure Functions
 */
export function asyncHandler(
  handler: (context: any, req: any) => Promise<any>
) {
  return async (context: any, req: any): Promise<void> => {
    try {
      const response = await handler(context, req);
      context.res = response;
    } catch (error) {
      console.error('Unhandled error:', error);
      const errorResponse = createErrorResponse(error);
      context.res = errorResponse;
    }
  };
}


