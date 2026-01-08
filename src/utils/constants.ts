/**
 * Application constants
 */

export const USER_ROLES = {
  ADMIN: 'Admin',
  CLIENT: 'Client',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const BOOKING_STATUS = {
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
} as const;

export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1,
} as const;

export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 255,
  MIN_BOOKING_ADVANCE_HOURS: 1, // Minimum hours in advance to book
  MAX_BOOKING_ADVANCE_DAYS: 90, // Maximum days in advance to book
} as const;
