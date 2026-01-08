import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDbPool } from '../../database/db';
import { createErrorResponse } from '../../utils/errors';
import { requireAuth } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../middleware/auth';
import { AuthorizationError } from '../../utils/errors';
import { parsePagination, createPaginationResponse } from '../../utils/pagination';
import { trackException } from '../../telemetry/appinsights';

async function listBookingsHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    if (!request.user) {
      throw new Error('User not authenticated');
    }

    const pool = await getDbPool();
    const userId = request.query?.get('userId');
    const status = request.query?.get('status');
    const { page, limit, offset } = parsePagination(request.query);

    // Clients can only view their own bookings, Admins can view all
    const isAdmin = request.user.role === 'Admin';
    const targetUserId = userId && isAdmin ? userId : request.user.userId;

    if (userId && !isAdmin) {
      throw new AuthorizationError('Clients can only view their own bookings');
    }

    // Build WHERE clause
    const whereConditions: string[] = ['b.UserId = @userId'];
    const countRequest = pool.request().input('userId', targetUserId);
    const dataRequest = pool.request().input('userId', targetUserId);

    if (status) {
      whereConditions.push('b.Status = @status');
      countRequest.input('status', status);
      dataRequest.input('status', status);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get total count
    const countResult = await countRequest.query(`
      SELECT COUNT(*) as Total
      FROM Bookings b
      ${whereClause}
    `);
    const total = countResult.recordset[0].Total;

    // Get paginated results
    dataRequest.input('offset', offset);
    dataRequest.input('limit', limit);
    const query = `
      SELECT 
        b.Id, b.UserId, b.ServiceId, b.StartTime, b.EndTime, b.Status, b.Notes,
        b.CreatedAt, b.UpdatedAt,
        u.Email as UserEmail, u.FullName as UserFullName,
        s.Name as ServiceName, s.DurationMinutes, s.Price
      FROM Bookings b
      INNER JOIN Users u ON b.UserId = u.Id
      INNER JOIN Services s ON b.ServiceId = s.Id
      ${whereClause}
      ORDER BY b.StartTime DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const result = await dataRequest.query(query);

    const bookings = result.recordset.map((booking: any) => ({
      id: booking.Id,
      userId: booking.UserId,
      serviceId: booking.ServiceId,
      startTime: booking.StartTime,
      endTime: booking.EndTime,
      status: booking.Status,
      notes: booking.Notes,
      createdAt: booking.CreatedAt,
      updatedAt: booking.UpdatedAt,
      user: {
        email: booking.UserEmail,
        fullName: booking.UserFullName,
      },
      service: {
        id: booking.ServiceId,
        name: booking.ServiceName,
        durationMinutes: booking.DurationMinutes,
        price: booking.Price,
      },
    }));

    return {
      status: 200,
      jsonBody: createPaginationResponse(bookings, total, page, limit),
    };
  } catch (error) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      function: 'listBookings',
    });
    const errorResponse = createErrorResponse(error);
    return {
      status: errorResponse.statusCode,
      jsonBody: errorResponse.body,
    };
  }
}

app.http('listBookings', {
  methods: ['GET'],
  authLevel: 'function',
  handler: requireAuth(listBookingsHandler) as any,
});
