import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDbPool } from '../../database/db';
import { createErrorResponse } from '../../utils/errors';
import { parsePagination, createPaginationResponse } from '../../utils/pagination';
import { trackException } from '../../telemetry/appinsights';

/**
 * Public endpoint to list only active services (no authentication required)
 * Used by the public booking page
 */
async function listPublicServicesHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const pool = await getDbPool();
    const { page, limit, offset } = parsePagination(request.query);

    // Always filter for active services only
    const whereClause = 'WHERE IsActive = 1';

    // Get total count
    const countResult = await pool.request().query(`
      SELECT COUNT(*) as Total
      FROM Services
      ${whereClause}
    `);
    const total = countResult.recordset[0].Total;

    // Get paginated results
    const requestObj = pool.request();
    requestObj.input('offset', offset);
    requestObj.input('limit', limit);
    const result = await requestObj.query(`
      SELECT *
      FROM Services
      ${whereClause}
      ORDER BY CreatedAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

    return {
      status: 200,
      jsonBody: createPaginationResponse(result.recordset, total, page, limit),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };
  } catch (error) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      function: 'listPublicServices',
    });
    const errorResponse = createErrorResponse(error);
    return {
      status: errorResponse.statusCode,
      jsonBody: errorResponse.body,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    };
  }
}

app.http('listPublicServices', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'services/public',
  handler: listPublicServicesHandler,
});
