import { z } from 'zod';

/**
 * Ghana phone number validation (+233 format)
 */
export function validateGhanaPhoneNumber(phone: string): boolean {
  const ghanaPhoneRegex = /^(\+233|0)[1-9]\d{8}$/;
  return ghanaPhoneRegex.test(phone);
}

/**
 * Normalize Ghana phone number to +233 format
 */
export function normalizeGhanaPhoneNumber(phone: string): string {
  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('0')) {
    normalized = '233' + normalized.substring(1);
  }
  if (!normalized.startsWith('233')) {
    throw new Error('Invalid Ghana phone number');
  }
  return '+' + normalized;
}

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * Password validation
 * Min 8 chars, at least one uppercase, one lowercase, one number, one special char
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/\d/, 'Password must contain number')
  .regex(/[!@#$%^&*]/, 'Password must contain special character');

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Pagination validation
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

/**
 * Login request validation
 */
export const loginSchema = z.object({
  email: emailSchema.optional(),
  phoneNumber: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
  mfaCode: z.string().optional(),
});

/**
 * Register request validation
 */
export const registerSchema = z
  .object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: emailSchema,
    phoneNumber: z.string().optional(),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(['parent', 'teacher', 'staff', 'director', 'center_owner']),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Parse and validate form data
 */
export async function validateData<T>(schema: z.ZodSchema, data: unknown): Promise<T> {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(error.errors[0].message);
    }
    throw error;
  }
}
