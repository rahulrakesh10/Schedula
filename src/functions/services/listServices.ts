import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDbPool } from '../../database/db';
import { createErrorResponse } from '../../utils/errors';
import { requireAuth } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../middleware/auth';
import { parsePagination, createPaginationResponse } from '../../utils/pagination';
import { trackException } from '../../telemetry/appinsights';

async function listServicesHandler(
  request: HttpRequest & AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const pool = await getDbPool();
    const isActive = request.query?.get('isActive');
    const { page, limit, offset } = parsePagination(request.query);

    // Build WHERE clause
    const whereConditions: string[] = [];
    const requestObj = pool.request();

    if (isActive !== null && isActive !== undefined) {
      whereConditions.push('IsActive = @isActive');
      requestObj.input('isActive', isActive === 'true');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await requestObj.query(`
      SELECT COUNT(*) as Total
      FROM Services
      ${whereClause}
    `);
    const total = countResult.recordset[0].Total;

    // Get paginated results
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
    };
  } catch (error) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      function: 'listServices',
    });
    const errorResponse = createErrorResponse(error);
    return {
      status: errorResponse.statusCode,
      jsonBody: errorResponse.body,
    };
  }
}

app.http('listServices', {
  methods: ['GET'],
  authLevel: 'function',
  handler: requireAuth(listServicesHandler) as any,
});
