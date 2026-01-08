import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDbPool } from '../../database/db';
import { createErrorResponse } from '../../utils/errors';
import { NotFoundError, AuthorizationError, ConflictError } from '../../utils/errors';
import { requireAuth } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../middleware/auth';
import { trackEvent, trackException } from '../../telemetry/appinsights';

async function cancelBookingHandler(
  request: HttpRequest & AuthenticatedRequest,
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

    // Get booking details
    const result = await pool
      .request()
      .input('id', bookingId)
      .query(`
        SELECT Id, UserId, Status, StartTime
        FROM Bookings
        WHERE Id = @id
      `);

    if (result.recordset.length === 0) {
      throw new NotFoundError('Booking');
    }

    const booking = result.recordset[0];

    // Clients can only cancel their own bookings
    if (request.user.role === 'Client' && booking.UserId !== request.user.userId) {
      throw new AuthorizationError('Access denied');
    }

    // Check if booking is already cancelled or completed
    if (booking.Status === 'Cancelled') {
      throw new ConflictError('Booking is already cancelled');
    }

    if (booking.Status === 'Completed') {
      throw new ConflictError('Cannot cancel a completed booking');
    }

    // Check if booking is in the past
    const now = new Date();
    const startTime = new Date(booking.StartTime);
    if (startTime < now) {
      throw new ConflictError('Cannot cancel a past booking');
    }

    // Update booking status
    const updateResult = await pool
      .request()
      .input('id', bookingId)
      .query(`
        UPDATE Bookings
        SET Status = 'Cancelled'
        OUTPUT INSERTED.Id, INSERTED.Status, INSERTED.UpdatedAt
        WHERE Id = @id
      `);

    trackEvent('BookingCancelled', {
      bookingId,
      userId: request.user.userId,
      cancelledBy: request.user.role,
    });

    return {
      status: 200,
      jsonBody: {
        message: 'Booking cancelled successfully',
        booking: {
          id: updateResult.recordset[0].Id,
          status: updateResult.recordset[0].Status,
          updatedAt: updateResult.recordset[0].UpdatedAt,
        },
      },
    };
  } catch (error) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      function: 'cancelBooking',
    });
    const errorResponse = createErrorResponse(error);
    return {
      status: errorResponse.statusCode,
      jsonBody: errorResponse.body,
    };
  }
}

app.http('cancelBooking', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'bookings/{id}/cancel',
  handler: requireAuth(cancelBookingHandler) as any,
});
