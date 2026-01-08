import { z } from 'zod';
import { ValidationError } from './errors';
import { VALIDATION, USER_ROLES } from './constants';

/**
 * Password strength validator
 */
const passwordSchema = z
  .string()
  .min(VALIDATION.MIN_PASSWORD_LENGTH, `Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters`)
  .max(VALIDATION.MAX_PASSWORD_LENGTH, `Password must be at most ${VALIDATION.MAX_PASSWORD_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Validation schemas using Zod
 */

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: passwordSchema,
  fullName: z
    .string()
    .min(VALIDATION.MIN_NAME_LENGTH, 'Full name is required')
    .max(VALIDATION.MAX_NAME_LENGTH, `Full name must be at most ${VALIDATION.MAX_NAME_LENGTH} characters`)
    .trim(),
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.CLIENT], {
    errorMap: () => ({ message: `Role must be either ${USER_ROLES.ADMIN} or ${USER_ROLES.CLIENT}` }),
  }),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const createServiceSchema = z.object({
  name: z
    .string()
    .min(1, 'Service name is required')
    .max(VALIDATION.MAX_NAME_LENGTH, `Name must be at most ${VALIDATION.MAX_NAME_LENGTH} characters`)
    .trim(),
  description: z.string().max(5000, 'Description too long').optional(),
  durationMinutes: z.number().int().positive('Duration must be positive').max(1440, 'Duration cannot exceed 24 hours'),
  price: z.number().nonnegative('Price cannot be negative').max(999999.99, 'Price is too high'),
  isActive: z.boolean().optional().default(true),
});

export const updateServiceSchema = createServiceSchema.partial();

export const createBookingSchema = z.object({
  serviceId: z.string().uuid('Invalid service ID format'),
  startTime: z
    .string()
    .datetime('Invalid date format')
    .refine(
      (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const minAdvance = new Date(now.getTime() + VALIDATION.MIN_BOOKING_ADVANCE_HOURS * 60 * 60 * 1000);
        const maxAdvance = new Date(now.getTime() + VALIDATION.MAX_BOOKING_ADVANCE_DAYS * 24 * 60 * 60 * 1000);
        return date >= minAdvance && date <= maxAdvance;
      },
      {
        message: `Booking must be at least ${VALIDATION.MIN_BOOKING_ADVANCE_HOURS} hour(s) in advance and at most ${VALIDATION.MAX_BOOKING_ADVANCE_DAYS} days in advance`,
      }
    ),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

export const updateBookingSchema = z.object({
  status: z.enum(['Confirmed', 'Cancelled', 'Completed'] as const).optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

/**
 * Validate request body against a schema
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    
    result.error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(err.message);
    });

    throw new ValidationError('Validation failed', fieldErrors);
  }

  return result.data;
}
