import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDbPool } from '../../database/db';
import { validate, createServiceSchema } from '../../utils/validation';
import { createErrorResponse } from '../../utils/errors';
import { requireAdmin } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../middleware/auth';
import { trackEvent, trackException } from '../../telemetry/appinsights';

async function createServiceHandler(
  request: HttpRequest & AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = await request.json();
    const validated = validate(createServiceSchema, body);

    const pool = await getDbPool();

    const result = await pool
      .request()
      .input('name', validated.name)
      .input('description', validated.description || null)
      .input('durationMinutes', validated.durationMinutes)
      .input('price', validated.price)
      .input('isActive', validated.isActive ?? true)
      .query(`
        INSERT INTO Services (Name, Description, DurationMinutes, Price, IsActive)
        OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Description, INSERTED.DurationMinutes, 
               INSERTED.Price, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
        VALUES (@name, @description, @durationMinutes, @price, @isActive)
      `);

    const service = result.recordset[0];

    trackEvent('ServiceCreated', {
      serviceId: service.Id,
      createdBy: request.user?.userId || 'unknown',
    });

    return {
      status: 201,
      jsonBody: {
        message: 'Service created successfully',
        service,
      },
    };
  } catch (error) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      function: 'createService',
    });
    const errorResponse = createErrorResponse(error);
    return {
      status: errorResponse.statusCode,
      jsonBody: errorResponse.body,
    };
  }
}

app.http('createService', {
  methods: ['POST'],
  authLevel: 'function',
  handler: requireAdmin(createServiceHandler) as any,
});
