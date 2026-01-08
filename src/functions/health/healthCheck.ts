import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDbPool } from '../../database/db';
import { trackException } from '../../telemetry/appinsights';

export async function healthCheck(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Check database connection
    let dbHealthy = false;
    try {
      const pool = await getDbPool();
      await pool.request().query('SELECT 1 as Health');
      dbHealthy = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    const healthStatus = {
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
      },
    };

    return {
      status: dbHealthy ? 200 : 503,
      jsonBody: healthStatus,
    };
  } catch (error) {
    trackException(error instanceof Error ? error : new Error(String(error)), {
      function: 'healthCheck',
    });

    return {
      status: 503,
      jsonBody: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
    };
  }
}

app.http('healthCheck', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthCheck,
});

