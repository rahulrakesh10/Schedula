import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { verifyToken, extractToken, JWTPayload } from '../utils/auth';
import { AuthenticationError, AuthorizationError } from '../utils/errors';

export interface AuthenticatedRequest extends HttpRequest {
  user?: JWTPayload;
}

type AuthenticatedHandler = (
  request: HttpRequest & AuthenticatedRequest,
  context: InvocationContext
) => Promise<HttpResponseInit>;

/**
 * Middleware to authenticate requests using JWT
 */
export function authenticate(
  handler: AuthenticatedHandler
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const token = extractToken(request.headers?.authorization);
      const user = await verifyToken(token);
      (request as AuthenticatedRequest).user = user;
      return await handler(request as AuthenticatedRequest, context);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return {
          status: 401,
          jsonBody: {
            error: {
              message: error.message,
              code: 'AUTHENTICATION_ERROR',
            },
          },
        };
      }
      throw error;
    }
  };
}

/**
 * Middleware to authorize requests based on roles
 */
export function authorize(...allowedRoles: Array<'Admin' | 'Client'>) {
  return (handler: AuthenticatedHandler): AuthenticatedHandler => {
    return authenticate(async (request: AuthenticatedRequest, context: InvocationContext) => {
      if (!request.user) {
        throw new AuthenticationError('User not authenticated');
      }

      if (!allowedRoles.includes(request.user.role)) {
        throw new AuthorizationError(
          `Access denied. Required role: ${allowedRoles.join(' or ')}`
        );
      }

      return await handler(request, context);
    }) as AuthenticatedHandler;
  };
}

/**
 * Middleware that requires Admin role
 */
export function requireAdmin(handler: AuthenticatedHandler): AuthenticatedHandler {
  return authorize('Admin')(handler);
}

/**
 * Middleware that requires any authenticated user
 */
export function requireAuth(handler: AuthenticatedHandler): AuthenticatedHandler {
  return authorize('Admin', 'Client')(handler);
}
