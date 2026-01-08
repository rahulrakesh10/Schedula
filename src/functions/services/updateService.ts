import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { getDbPool } from '../../database/db';
import { validate, updateServiceSchema } from '../../utils/validation';
import { createErrorResponse } from '../../utils/errors';
import { NotFoundError } from '../../utils/errors';
import { requireAdmin } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../middleware/auth';
import { trackEvent, trackException } from '../../telemetry/appinsights';

async function updateServiceHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const serviceId = request.params.id;

    if (!serviceId) {
      return {
        status: 400,
        jsonBody: {
          error: {
            message: 'Service ID is required',
            code: 'VALIDATION_ERROR',
          },
        },
      };
    }

    const body = await request.json();
    const validated = validate(updateServiceSchema, body) as z.infer<typeof updateServiceSchema>;

    const pool = await getDbPool();

    // Check if service exists
    const checkResult = await pool
      .request()
      .input('id', serviceId)
      .query('SELECT Id FROM Services WHERE Id = @id');

    if (checkResult.recordset.length === 0) {
      throw new NotFoundError('Service');
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const requestObj = pool.request().input('id', serviceId);

    if (validated.name !== undefined) {
      updateFields.push('Name = @name');
      requestObj.input('name', validated.name);
    }
    if (validated.description !== undefined) {
      updateFields.push('Description = @description');
      requestObj.input('description', validated.description);
    }
    if (validated.durationMinutes !== undefined) {
      updateFields.push('DurationMinutes = @durationMinutes');
      requestObj.input('durationMinutes', validated.durationMinutes);
    }
    if (validated.price !== undefined) {
      updateFields.push('Price = @price');
      requestObj.input('price', validated.price);
    }
    if (validated.isActive !== undefined) {
      updateFields.push('IsActive = @isActive');
      requestObj.input('isActive', validated.isActive);
    }

    if (updateFields.length === 0) {
      return {
        status: 400,
        jsonBody: {
          error: {
            message: 'No fields to update',
            code: 'VALIDATION_ERROR',
          },
        },
      };
    }

    const updateQuery = `
      UPDATE Services
      SET ${updateFields.join(', ')}
      OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Description, INSERTED.DurationMinutes,
             INSERTED.Price, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
      WHERE Id = @id
    `;

    const result = await requestObj.query(updateQuery);

    trackEvent('ServiceUpdated', {
      serviceId,
      updatedBy: request.user?.userId || 'unknown',
    });

    return {
      status: 200,
      jsonBody: {
        message: 'Service updated successfully',
        service: result.recordset[0],
      },
    };
  } catch (error) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      function: 'updateService',
    });
    const errorResponse = createErrorResponse(error);
    return {
      status: errorResponse.statusCode,
      jsonBody: errorResponse.body,
    };
  }
}

app.http('updateService', {
  methods: ['PUT', 'PATCH'],
  authLevel: 'function',
  route: 'services/{id}',
  handler: requireAdmin(updateServiceHandler) as any,
});
