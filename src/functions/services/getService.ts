import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDbPool } from '../../database/db';
import { createErrorResponse } from '../../utils/errors';
import { NotFoundError } from '../../utils/errors';
import { requireAuth } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../middleware/auth';
import { trackException } from '../../telemetry/appinsights';

async function getServiceHandler(
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

    const pool = await getDbPool();

    const result = await pool
      .request()
      .input('id', serviceId)
      .query('SELECT * FROM Services WHERE Id = @id');

    if (result.recordset.length === 0) {
      throw new NotFoundError('Service');
    }

    return {
      status: 200,
      jsonBody: {
        service: result.recordset[0],
      },
    };
  } catch (error) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      function: 'getService',
    });
    const errorResponse = createErrorResponse(error);
    return {
      status: errorResponse.statusCode,
      jsonBody: errorResponse.body,
    };
  }
}

app.http('getService', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'services/{id}',
  handler: requireAuth(getServiceHandler) as any,
});
