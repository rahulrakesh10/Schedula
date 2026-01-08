import * as appInsights from 'applicationinsights';

let initialized = false;

/**
 * Initialize Application Insights
 */
export function initializeAppInsights(connectionString?: string): void {
  if (initialized || !connectionString) {
    return;
  }

  appInsights.setup(connectionString).start();
  initialized = true;

  // Set default properties
  appInsights.defaultClient.context.tags[
    appInsights.defaultClient.context.keys.cloudRole
  ] = 'Schedula-API';
}

/**
 * Track custom events
 */
export function trackEvent(name: string, properties?: Record<string, string>): void {
  if (initialized) {
    appInsights.defaultClient.trackEvent({
      name,
      properties,
    });
  }
}

/**
 * Track exceptions
 */
export function trackException(error: Error, properties?: Record<string, string>): void {
  if (initialized) {
    appInsights.defaultClient.trackException({
      exception: error,
      properties,
    });
  }
}

/**
 * Track custom metrics
 */
export function trackMetric(name: string, value: number): void {
  if (initialized) {
    appInsights.defaultClient.trackMetric({
      name,
      value,
    });
  }
}

/**
 * Track dependencies (e.g., database calls)
 */
export function trackDependency(
  name: string,
  commandName: string,
  elapsed: number,
  success: boolean,
  properties?: Record<string, string>
): void {
  if (initialized) {
    appInsights.defaultClient.trackDependency({
      name,
      data: commandName,
      duration: elapsed,
      success,
      properties,
    });
  }
}
