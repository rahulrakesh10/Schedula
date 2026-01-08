import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDbPool } from '../../database/db';
import { createErrorResponse } from '../../utils/errors';
import { NotFoundError, AuthorizationError } from '../../utils/errors';
import { requireAuth } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../middleware/auth';
import { trackException } from '../../telemetry/appinsights';

async function getBookingHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    if (!request.user) {
      throw new Error('User not authenticated');
    }

    const bookingId = request.params.id;

    if (!bookingId) {
      return {
        status: 400,
        jsonBody: {
          error: {
            message: 'Booking ID is required',
            code: 'VALIDATION_ERROR',
          },
        },
      };
    }

    const pool = await getDbPool();

    const result = await pool
      .request()
      .input('id', bookingId)
      .query(`
        SELECT 
          b.Id, b.UserId, b.ServiceId, b.StartTime, b.EndTime, b.Status, b.Notes,
          b.CreatedAt, b.UpdatedAt,
          u.Email as UserEmail, u.FullName as UserFullName,
          s.Name as ServiceName, s.DurationMinutes, s.Price, s.Description as ServiceDescription
        FROM Bookings b
        INNER JOIN Users u ON b.UserId = u.Id
        INNER JOIN Services s ON b.ServiceId = s.Id
        WHERE b.Id = @id
      `);

    if (result.recordset.length === 0) {
      throw new NotFoundError('Booking');
    }

    const booking = result.recordset[0];

    // Clients can only view their own bookings
    if (request.user.role === 'Client' && booking.UserId !== request.user.userId) {
      throw new AuthorizationError('Access denied');
    }

    return {
      status: 200,
      jsonBody: {
        booking: {
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
            id: booking.UserId,
            email: booking.UserEmail,
            fullName: booking.UserFullName,
          },
          service: {
            id: booking.ServiceId,
            name: booking.ServiceName,
            description: booking.ServiceDescription,
            durationMinutes: booking.DurationMinutes,
            price: booking.Price,
          },
        },
      },
    };
  } catch (error) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      function: 'getBooking',
    });
    const errorResponse = createErrorResponse(error);
    return {
      status: errorResponse.statusCode,
      jsonBody: errorResponse.body,
    };
  }
}

app.http('getBooking', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'bookings/{id}',
  handler: requireAuth(getBookingHandler) as any,
});
