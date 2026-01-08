import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDbPool } from '../../database/db';
import { createErrorResponse } from '../../utils/errors';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { requireAdmin } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../middleware/auth';
import { trackEvent, trackException } from '../../telemetry/appinsights';

async function deleteServiceHandler(
  request: HttpRequest & AuthenticatedRequest,
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

    const pool = await getDbPool();

    // Check if service exists
    const checkResult = await pool
      .request()
      .input('id', serviceId)
      .query('SELECT Id FROM Services WHERE Id = @id');

    if (checkResult.recordset.length === 0) {
      throw new NotFoundError('Service');
    }

    // Check if service has active bookings
    const bookingsResult = await pool
      .request()
      .input('serviceId', serviceId)
      .query(`
        SELECT COUNT(*) as Count
        FROM Bookings
        WHERE ServiceId = @serviceId AND Status = 'Confirmed'
      `);

    if (bookingsResult.recordset[0].Count > 0) {
      throw new ConflictError(
        'Cannot delete service with active bookings. Cancel or complete bookings first.'
      );
    }

    // Delete service
    await pool
      .request()
      .input('id', serviceId)
      .query('DELETE FROM Services WHERE Id = @id');

    trackEvent('ServiceDeleted', {
      serviceId,
      deletedBy: request.user?.userId || 'unknown',
    });

    return {
      status: 200,
      jsonBody: {
        message: 'Service deleted successfully',
      },
    };
  } catch (error) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      function: 'deleteService',
    });
    const errorResponse = createErrorResponse(error);
    return {
      status: errorResponse.statusCode,
      jsonBody: errorResponse.body,
    };
  }
}

app.http('deleteService', {
  methods: ['DELETE'],
  authLevel: 'function',
  route: 'services/{id}',
  handler: requireAdmin(deleteServiceHandler) as any,
});
