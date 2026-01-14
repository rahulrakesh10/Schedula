import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDbPool } from '../../database/db';
import { createErrorResponse } from '../../utils/errors';
import { trackException } from '../../telemetry/appinsights';

/**
 * Get available time slots for a service on a given date
 * Public endpoint - no authentication required
 */
async function getAvailabilityHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Handle CORS preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };
  }

  try {
    const serviceId = request.query?.get('serviceId');
    const date = request.query?.get('date'); // Format: YYYY-MM-DD

    if (!serviceId) {
      return {
        status: 400,
        jsonBody: {
          error: {
            message: 'Service ID is required',
            code: 'VALIDATION_ERROR',
          },
        },
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      };
    }

    if (!date) {
      return {
        status: 400,
        jsonBody: {
          error: {
            message: 'Date is required (format: YYYY-MM-DD)',
            code: 'VALIDATION_ERROR',
          },
        },
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      };
    }

    const pool = await getDbPool();

    // Get service details
    const serviceResult = await pool
      .request()
      .input('serviceId', serviceId)
      .query('SELECT Id, Name, DurationMinutes, IsActive FROM Services WHERE Id = @serviceId');

    if (serviceResult.recordset.length === 0) {
      return {
        status: 404,
        jsonBody: {
          error: {
            message: 'Service not found',
            code: 'NOT_FOUND',
          },
        },
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      };
    }

    const service = serviceResult.recordset[0];

    if (!service.IsActive) {
      return {
        status: 200,
        jsonBody: {
          serviceId,
          date,
          availableSlots: [],
          message: 'Service is not active',
        },
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      };
    }

    // Parse date and create time range for the day (9 AM to 6 PM UTC)
    const dateObj = new Date(date + 'T00:00:00Z');
    const startOfDay = new Date(dateObj);
    startOfDay.setUTCHours(9, 0, 0, 0); // 9 AM UTC
    const endOfDay = new Date(dateObj);
    endOfDay.setUTCHours(18, 0, 0, 0); // 6 PM UTC

    // Get all bookings for this service on this date
    const bookingsResult = await pool
      .request()
      .input('serviceId', serviceId)
      .input('startOfDay', startOfDay)
      .input('endOfDay', endOfDay)
      .query(`
        SELECT StartTime, EndTime
        FROM Bookings
        WHERE ServiceId = @serviceId
          AND Status = 'Confirmed'
          AND StartTime >= @startOfDay
          AND StartTime < @endOfDay
        ORDER BY StartTime
      `);

    const bookedSlots = bookingsResult.recordset.map((b: any) => ({
      start: new Date(b.StartTime),
      end: new Date(b.EndTime),
    }));

    // Generate available time slots (every 30 minutes)
    const availableSlots: string[] = [];
    const slotDuration = service.DurationMinutes;
    const slotInterval = 30; // 30-minute intervals
    const minAdvanceHours = 1; // Must book at least 1 hour in advance
    const maxAdvanceDays = 90; // Can book up to 90 days in advance

    const now = new Date();
    const minTime = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000);
    const maxTime = new Date(now.getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000);

    let currentTime = new Date(startOfDay);

    while (currentTime < endOfDay) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60 * 1000);

      // Check if slot is in the future and within booking window
      if (currentTime >= minTime && currentTime <= maxTime) {
        // Check if slot conflicts with any booking
        const hasConflict = bookedSlots.some((booked) => {
          return (
            (currentTime >= booked.start && currentTime < booked.end) ||
            (slotEnd > booked.start && slotEnd <= booked.end) ||
            (currentTime <= booked.start && slotEnd >= booked.end)
          );
        });

        if (!hasConflict) {
          availableSlots.push(currentTime.toISOString());
        }
      }

      // Move to next slot
      currentTime = new Date(currentTime.getTime() + slotInterval * 60 * 1000);
    }

    return {
      status: 200,
      jsonBody: {
        serviceId,
        date,
        durationMinutes: service.DurationMinutes,
        availableSlots,
        totalSlots: availableSlots.length,
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };
  } catch (error) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      function: 'getAvailability',
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

app.http('getAvailability', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'availability',
  handler: getAvailabilityHandler,
});
