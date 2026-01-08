import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { verifyToken, extractToken, JWTPayload } from '../utils/auth';
import { AuthenticationError, AuthorizationError } from '../utils/errors';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AuthenticatedRequest extends Omit<HttpRequest, 'user'> {
  user: JWTPayload;
}

type AuthenticatedHandler = (
  req: AuthenticatedRequest,
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
      const authHeader = (request.headers as unknown as Record<string, string | undefined>)?.authorization;
      const token = extractToken(authHeader);
      const user = await verifyToken(token);
      const authRequest = { ...request, user } as AuthenticatedRequest;
      return await handler(authRequest, context);
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
  return (handler: AuthenticatedHandler) => {
    return authenticate(async (req: AuthenticatedRequest, context: InvocationContext) => {
      if (!allowedRoles.includes(req.user.role)) {
        throw new AuthorizationError(
          `Access denied. Required role: ${allowedRoles.join(' or ')}`
        );
      }

      return await handler(req, context);
    });
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
