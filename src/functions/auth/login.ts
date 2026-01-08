import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDbPool } from '../../database/db';
import { comparePassword, generateToken } from '../../utils/auth';
import { validate, loginSchema } from '../../utils/validation';
import { createErrorResponse } from '../../utils/errors';
import { AuthenticationError } from '../../utils/errors';
import { trackEvent, trackException } from '../../telemetry/appinsights';

export async function login(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = await request.json();
    const validated = validate(loginSchema, body);

    const pool = await getDbPool();

    // Find user
    const result = await pool
      .request()
      .input('email', validated.email)
      .query(`
        SELECT Id, Email, PasswordHash, FullName, Role, CreatedAt
        FROM Users
        WHERE Email = @email
      `);

    if (result.recordset.length === 0) {
      throw new AuthenticationError('Invalid email or password');
    }

    const user = result.recordset[0];

    // Verify password
    const isPasswordValid = await comparePassword(validated.password, user.PasswordHash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate token
    const token = await generateToken({
      userId: user.Id,
      email: user.Email,
      role: user.Role,
    });

    trackEvent('UserLoggedIn', {
      userId: user.Id,
      role: user.Role,
    });

    return {
      status: 200,
      jsonBody: {
        message: 'Login successful',
        user: {
          id: user.Id,
          email: user.Email,
          fullName: user.FullName,
          role: user.Role,
          createdAt: user.CreatedAt,
        },
        token,
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };
  } catch (error) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      function: 'login',
    });
    const errorResponse = createErrorResponse(error);
    return {
      status: errorResponse.statusCode,
      jsonBody: errorResponse.body,
    };
  }
}

app.http('login', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: login,
});

