import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import sql from 'mssql';
import { getDbPool } from '../../database/db';
import { validate, createBookingSchema } from '../../utils/validation';
import { createErrorResponse } from '../../utils/errors';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { requireAuth } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../middleware/auth';
import { withTransaction } from '../../utils/transaction';
import { trackEvent, trackException, trackDependency } from '../../telemetry/appinsights';

async function createBookingHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();

  try {
    if (!request.user) {
      throw new Error('User not authenticated');
    }

    const body = await request.json();
    const validated = validate(createBookingSchema, body);

    const pool = await getDbPool();

    const booking = await withTransaction(async (transaction) => {
      // Get service details
      const serviceRequest = new sql.Request(transaction);
      serviceRequest.input('serviceId', validated.serviceId);
      const serviceResult = await serviceRequest.query(`
        SELECT Id, Name, DurationMinutes, IsActive
        FROM Services
        WHERE Id = @serviceId
      `);

      if (serviceResult.recordset.length === 0) {
        throw new NotFoundError('Service');
      }

      const service = serviceResult.recordset[0];

      if (!service.IsActive) {
        throw new ConflictError('Service is not available');
      }

      // Parse start time (already validated by Zod)
      const startTimeDate = new Date(validated.startTime);
      
      // Calculate end time based on service duration
      const endTimeDate = new Date(startTimeDate);
      endTimeDate.setMinutes(endTimeDate.getMinutes() + service.DurationMinutes);

      // Check for conflicts: Find overlapping bookings
      const conflictRequest = new sql.Request(transaction);
      conflictRequest.input('startTime', startTimeDate);
      conflictRequest.input('endTime', endTimeDate);
      const conflictResult = await conflictRequest.query(`
        SELECT COUNT(*) as Count
        FROM Bookings
        WHERE Status = 'Confirmed'
          AND (
            (@startTime >= StartTime AND @startTime < EndTime)
            OR (@endTime > StartTime AND @endTime <= EndTime)
            OR (@startTime <= StartTime AND @endTime >= EndTime)
          )
      `);

      if (conflictResult.recordset[0].Count > 0) {
        throw new ConflictError(
          'Booking conflicts with an existing appointment. Please choose a different time.'
        );
      }

      // Create booking
      const bookingRequest = new sql.Request(transaction);
      bookingRequest.input('userId', request.user.userId);
      bookingRequest.input('serviceId', validated.serviceId);
      bookingRequest.input('startTime', startTimeDate);
      bookingRequest.input('endTime', endTimeDate);
      bookingRequest.input('notes', validated.notes || null);

      const bookingResult = await bookingRequest.query(`
        INSERT INTO Bookings (UserId, ServiceId, StartTime, EndTime, Notes, Status)
        OUTPUT INSERTED.Id, INSERTED.UserId, INSERTED.ServiceId, INSERTED.StartTime,
               INSERTED.EndTime, INSERTED.Status, INSERTED.Notes, INSERTED.CreatedAt, INSERTED.UpdatedAt
        VALUES (@userId, @serviceId, @startTime, @endTime, @notes, 'Confirmed')
      `);

      const booking = bookingResult.recordset[0];

      // Include service details in response
      booking.service = {
        id: service.Id,
        name: service.Name,
        durationMinutes: service.DurationMinutes,
      };

      return booking;
    });

    const elapsed = Date.now() - startTime;
    trackDependency('CreateBooking', 'SQL', elapsed, true, {
      bookingId: booking.Id,
    });

    trackEvent('BookingCreated', {
      bookingId: booking.Id,
      userId: request.user.userId,
      serviceId: validated.serviceId,
    });

    return {
      status: 201,
      jsonBody: {
        message: 'Booking created successfully',
        booking,
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    trackDependency('CreateBooking', 'SQL', elapsed, false);

    trackException(error instanceof Error ? error : new Error(String(error)), {
      function: 'createBooking',
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

app.http('createBooking', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'function',
  handler: requireAuth(createBookingHandler) as any,
});
