import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDbPool } from '../../database/db';
import { hashPassword, generateToken } from '../../utils/auth';
import { validate, registerSchema } from '../../utils/validation';
import { asyncHandler, createErrorResponse } from '../../utils/errors';
import { ConflictError } from '../../utils/errors';
import { trackEvent, trackException } from '../../telemetry/appinsights';

export async function register(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = await request.json();
    const validated = validate(registerSchema, body);

    const pool = await getDbPool();

    // Check if user already exists
    const existingUser = await pool
      .request()
      .input('email', validated.email)
      .query('SELECT Id FROM Users WHERE Email = @email');

    if (existingUser.recordset.length > 0) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(validated.password);

    // Create user
    const result = await pool
      .request()
      .input('email', validated.email)
      .input('passwordHash', passwordHash)
      .input('fullName', validated.fullName)
      .input('role', validated.role)
      .query(`
        INSERT INTO Users (Email, PasswordHash, FullName, Role)
        OUTPUT INSERTED.Id, INSERTED.Email, INSERTED.FullName, INSERTED.Role, INSERTED.CreatedAt
        VALUES (@email, @passwordHash, @fullName, @role)
      `);

    const user = result.recordset[0];

    // Generate token
    const token = await generateToken({
      userId: user.Id,
      email: user.Email,
      role: user.Role,
    });

    trackEvent('UserRegistered', {
      userId: user.Id,
      role: user.Role,
    });

    return {
      status: 201,
      jsonBody: {
        message: 'User registered successfully',
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
      function: 'register',
    });
    const errorResponse = createErrorResponse(error);
    return {
      status: errorResponse.statusCode,
      jsonBody: errorResponse.body,
    };
  }
}

app.http('register', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: register,
});

