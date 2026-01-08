/**
 * Schedula - Serverless Booking & Scheduling Backend
 * Main entry point that imports all Azure Functions
 */

import { getConfig } from './config/config';
import { initializeAppInsights } from './telemetry/appinsights';

// Initialize Application Insights
(async () => {
  try {
    const config = await getConfig();
    if (config.appInsightsConnectionString) {
      initializeAppInsights(config.appInsightsConnectionString);
    }
  } catch (error) {
    console.error('Failed to initialize Application Insights:', error);
  }
})();

// Import all functions to register them
import './functions/auth/register';
import './functions/auth/login';
import './functions/services/createService';
import './functions/services/listServices';
import './functions/services/getService';
import './functions/services/updateService';
import './functions/services/deleteService';
import './functions/bookings/createBooking';
import './functions/bookings/listBookings';
import './functions/bookings/getBooking';
import './functions/bookings/cancelBooking';
import './functions/health/healthCheck';
