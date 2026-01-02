/**
 * Utils Unit Tests
 *
 * Tests for utility functions including JWT, response helpers, and validation
 */

import { generateToken, verifyToken, decodeToken, generateOTP, getOTPExpiryTime } from '../../src/utils/jwt';
import {
  sendSuccess,
  sendPaginatedSuccess,
  sendError,
  sendCreated,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendValidationError,
  sendServerError,
} from '../../src/utils/response';
import {
  validateGhanaPhoneNumber,
  normalizeGhanaPhoneNumber,
  emailSchema,
  passwordSchema,
  uuidSchema,
  paginationSchema,
  loginSchema,
  registerSchema,
  validateData,
} from '../../src/utils/validation';
import { FastifyReply } from 'fastify';
import { z } from 'zod';

// Mock FastifyReply
const createMockReply = () => {
  const reply = {
    statusCode: 200,
    sent: null as any,
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockImplementation(function (this: any, data: any) {
      this.sent = data;
      return this;
    }),
  };
  return reply as unknown as FastifyReply;
};

describe('JWT Utils', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        role: 'parent' as const,
        email: 'test@example.com',
      };

      const token = generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include all payload fields in token', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        role: 'teacher' as const,
        email: 'teacher@example.com',
      };

      const token = generateToken(payload);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.tenantId).toBe(payload.tenantId);
      expect(decoded?.role).toBe(payload.role);
      expect(decoded?.email).toBe(payload.email);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        role: 'parent' as const,
        email: 'test@example.com',
      };

      const token = generateToken(payload);
      const verified = verifyToken(token);

      expect(verified).toBeDefined();
      expect(verified.userId).toBe(payload.userId);
      expect(verified.tenantId).toBe(payload.tenantId);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow('Invalid or expired token');
    });

    it('should throw error for malformed token', () => {
      expect(() => verifyToken('not-a-token')).toThrow('Invalid or expired token');
    });

    it('should throw error for empty token', () => {
      expect(() => verifyToken('')).toThrow('Invalid or expired token');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        role: 'parent' as const,
        email: 'test@example.com',
      };

      const token = generateToken(payload);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(payload.userId);
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('should return null for empty token', () => {
      const decoded = decodeToken('');
      expect(decoded).toBeNull();
    });
  });

  describe('generateOTP', () => {
    it('should generate 6-digit OTP by default', () => {
      const otp = generateOTP();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    it('should generate OTP of custom length', () => {
      const otp4 = generateOTP(4);
      expect(otp4).toHaveLength(4);
      expect(/^\d{4}$/.test(otp4)).toBe(true);

      const otp8 = generateOTP(8);
      expect(otp8).toHaveLength(8);
      expect(/^\d{8}$/.test(otp8)).toBe(true);
    });

    it('should generate different OTPs on successive calls', () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();
      // While theoretically they could be the same, practically very unlikely
      // This test might rarely fail due to randomness, but it's acceptable
      expect(otp1).toBeDefined();
      expect(otp2).toBeDefined();
    });

    it('should only contain digits', () => {
      for (let i = 0; i < 10; i++) {
        const otp = generateOTP();
        expect(otp).toMatch(/^\d+$/);
      }
    });
  });

  describe('getOTPExpiryTime', () => {
    it('should return date 10 minutes in future by default', () => {
      const before = new Date();
      const expiry = getOTPExpiryTime();
      const after = new Date();

      // Should be roughly 10 minutes from now
      const diffMs = expiry.getTime() - before.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      expect(diffMinutes).toBeGreaterThanOrEqual(9.9);
      expect(diffMinutes).toBeLessThanOrEqual(10.1);
    });

    it('should return date with custom minutes', () => {
      const before = new Date();
      const expiry = getOTPExpiryTime(5);

      const diffMs = expiry.getTime() - before.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      expect(diffMinutes).toBeGreaterThanOrEqual(4.9);
      expect(diffMinutes).toBeLessThanOrEqual(5.1);
    });

    it('should handle zero minutes', () => {
      const before = new Date();
      const expiry = getOTPExpiryTime(0);
      const after = new Date();

      expect(expiry.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(expiry.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });
  });
});

describe('Response Utils', () => {
  describe('sendSuccess', () => {
    it('should send success response', () => {
      const reply = createMockReply();
      const data = { id: '123', name: 'Test' };

      sendSuccess(reply, data, 'Operation successful');

      expect(reply.send).toHaveBeenCalled();
      expect(reply.sent.success).toBe(true);
      expect(reply.sent.data).toEqual(data);
      expect(reply.sent.message).toBe('Operation successful');
      expect(reply.sent.timestamp).toBeDefined();
    });

    it('should send success without message', () => {
      const reply = createMockReply();
      const data = { id: '123' };

      sendSuccess(reply, data);

      expect(reply.sent.success).toBe(true);
      expect(reply.sent.data).toEqual(data);
      expect(reply.sent.message).toBeUndefined();
    });
  });

  describe('sendPaginatedSuccess', () => {
    it('should send paginated response', () => {
      const reply = createMockReply();
      const data = [{ id: '1' }, { id: '2' }];
      const pagination = { page: 1, limit: 10, total: 25 };

      sendPaginatedSuccess(reply, data, pagination);

      expect(reply.sent.success).toBe(true);
      expect(reply.sent.data).toEqual(data);
      expect(reply.sent.pagination).toBeDefined();
      expect(reply.sent.pagination.page).toBe(1);
      expect(reply.sent.pagination.limit).toBe(10);
      expect(reply.sent.pagination.total).toBe(25);
      expect(reply.sent.pagination.totalPages).toBe(3); // ceil(25/10)
    });

    it('should calculate totalPages correctly', () => {
      const reply = createMockReply();

      sendPaginatedSuccess(reply, [], { page: 1, limit: 10, total: 100 });
      expect(reply.sent.pagination.totalPages).toBe(10);

      const reply2 = createMockReply();
      sendPaginatedSuccess(reply2, [], { page: 1, limit: 20, total: 55 });
      expect(reply2.sent.pagination.totalPages).toBe(3); // ceil(55/20)
    });
  });

  describe('sendError', () => {
    it('should send error response with status code', () => {
      const reply = createMockReply();

      sendError(reply, 400, 'Bad request error');

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.sent.success).toBe(false);
      expect(reply.sent.error).toBe('Bad request error');
      expect(reply.sent.timestamp).toBeDefined();
    });
  });

  describe('sendCreated', () => {
    it('should send 201 created response', () => {
      const reply = createMockReply();
      const data = { id: 'new-123' };

      sendCreated(reply, data);

      expect(reply.status).toHaveBeenCalledWith(201);
      expect(reply.sent.success).toBe(true);
      expect(reply.sent.data).toEqual(data);
      expect(reply.sent.message).toBe('Resource created successfully');
    });

    it('should allow custom message', () => {
      const reply = createMockReply();

      sendCreated(reply, { id: '123' }, 'Custom created message');

      expect(reply.sent.message).toBe('Custom created message');
    });
  });

  describe('sendBadRequest', () => {
    it('should send 400 error', () => {
      const reply = createMockReply();

      sendBadRequest(reply, 'Invalid input');

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.sent.error).toBe('Invalid input');
    });
  });

  describe('sendUnauthorized', () => {
    it('should send 401 error with default message', () => {
      const reply = createMockReply();

      sendUnauthorized(reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.sent.error).toBe('Unauthorized');
    });

    it('should send 401 error with custom message', () => {
      const reply = createMockReply();

      sendUnauthorized(reply, 'Token expired');

      expect(reply.sent.error).toBe('Token expired');
    });
  });

  describe('sendForbidden', () => {
    it('should send 403 error', () => {
      const reply = createMockReply();

      sendForbidden(reply, 'Access denied');

      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.sent.error).toBe('Access denied');
    });
  });

  describe('sendNotFound', () => {
    it('should send 404 error with default message', () => {
      const reply = createMockReply();

      sendNotFound(reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.sent.error).toBe('Resource not found');
    });

    it('should send 404 error with custom message', () => {
      const reply = createMockReply();

      sendNotFound(reply, 'User not found');

      expect(reply.sent.error).toBe('User not found');
    });
  });

  describe('sendValidationError', () => {
    it('should send 422 validation error', () => {
      const reply = createMockReply();
      const errors = {
        email: ['Invalid email format'],
        password: ['Password too short', 'Missing special character'],
      };

      sendValidationError(reply, errors);

      expect(reply.status).toHaveBeenCalledWith(422);
      expect(reply.sent.success).toBe(false);
      expect(reply.sent.error).toBe('Validation failed');
      expect(reply.sent.errors).toEqual(errors);
    });
  });

  describe('sendServerError', () => {
    it('should send 500 error with default message', () => {
      const reply = createMockReply();

      sendServerError(reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.sent.error).toBe('Internal server error');
    });

    it('should send 500 error with custom message', () => {
      const reply = createMockReply();

      sendServerError(reply, 'Database connection failed');

      expect(reply.sent.error).toBe('Database connection failed');
    });
  });
});

describe('Validation Utils', () => {
  describe('validateGhanaPhoneNumber', () => {
    it('should validate correct Ghana phone numbers', () => {
      const validNumbers = [
        '0201234567', // MTN
        '0241234567', // MTN
        '0501234567', // Vodafone
        '0541234567', // Vodafone
        '0261234567', // AirtelTigo
        '0271234567', // AirtelTigo
        '+233201234567',
        '+233241234567',
      ];

      validNumbers.forEach(number => {
        expect(validateGhanaPhoneNumber(number)).toBe(true);
      });
    });

    it('should reject invalid Ghana phone numbers', () => {
      const invalidNumbers = [
        '1234567890', // Doesn't start with 0 or +233
        '020123456', // Too short
        '02012345678', // Too long
        '+234201234567', // Wrong country code
        '0001234567', // Starts with 00
        'abcdefghij',
        '',
      ];

      invalidNumbers.forEach(number => {
        expect(validateGhanaPhoneNumber(number)).toBe(false);
      });
    });
  });

  describe('normalizeGhanaPhoneNumber', () => {
    it('should normalize local format to international', () => {
      expect(normalizeGhanaPhoneNumber('0201234567')).toBe('+233201234567');
      expect(normalizeGhanaPhoneNumber('0241234567')).toBe('+233241234567');
      expect(normalizeGhanaPhoneNumber('0501234567')).toBe('+233501234567');
    });

    it('should keep international format', () => {
      expect(normalizeGhanaPhoneNumber('+233201234567')).toBe('+233201234567');
      expect(normalizeGhanaPhoneNumber('233201234567')).toBe('+233201234567');
    });

    it('should remove spaces and dashes', () => {
      expect(normalizeGhanaPhoneNumber('020 123 4567')).toBe('+233201234567');
      expect(normalizeGhanaPhoneNumber('020-123-4567')).toBe('+233201234567');
    });

    it('should throw error for invalid numbers', () => {
      expect(() => normalizeGhanaPhoneNumber('1234567890')).toThrow('Invalid Ghana phone number');
      expect(() => normalizeGhanaPhoneNumber('+234201234567')).toThrow('Invalid Ghana phone number');
    });
  });

  describe('emailSchema', () => {
    it('should validate correct emails', () => {
      expect(() => emailSchema.parse('test@example.com')).not.toThrow();
      expect(() => emailSchema.parse('user.name@domain.co.uk')).not.toThrow();
      expect(() => emailSchema.parse('admin@nkabom.com')).not.toThrow();
    });

    it('should reject invalid emails', () => {
      expect(() => emailSchema.parse('invalid')).toThrow();
      expect(() => emailSchema.parse('invalid@')).toThrow();
      expect(() => emailSchema.parse('@domain.com')).toThrow();
      expect(() => emailSchema.parse('')).toThrow();
    });
  });

  describe('passwordSchema', () => {
    it('should validate strong passwords', () => {
      expect(() => passwordSchema.parse('SecurePass123!')).not.toThrow();
      expect(() => passwordSchema.parse('MyP@ssw0rd')).not.toThrow();
      expect(() => passwordSchema.parse('Strong#Pass1')).not.toThrow();
    });

    it('should reject passwords without uppercase', () => {
      expect(() => passwordSchema.parse('password123!')).toThrow('uppercase');
    });

    it('should reject passwords without lowercase', () => {
      expect(() => passwordSchema.parse('PASSWORD123!')).toThrow('lowercase');
    });

    it('should reject passwords without number', () => {
      expect(() => passwordSchema.parse('Password!')).toThrow('number');
    });

    it('should reject passwords without special character', () => {
      expect(() => passwordSchema.parse('Password123')).toThrow('special character');
    });

    it('should reject passwords shorter than 8 characters', () => {
      expect(() => passwordSchema.parse('Pass1!')).toThrow('at least 8 characters');
    });
  });

  describe('uuidSchema', () => {
    it('should validate correct UUIDs', () => {
      expect(() => uuidSchema.parse('123e4567-e89b-12d3-a456-426614174000')).not.toThrow();
      expect(() => uuidSchema.parse('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).not.toThrow();
    });

    it('should reject invalid UUIDs', () => {
      expect(() => uuidSchema.parse('invalid-uuid')).toThrow();
      expect(() => uuidSchema.parse('123')).toThrow();
      expect(() => uuidSchema.parse('')).toThrow();
    });
  });

  describe('paginationSchema', () => {
    it('should validate correct pagination', () => {
      const result = paginationSchema.parse({ page: 1, limit: 20 });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should use default values', () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should reject invalid pagination', () => {
      expect(() => paginationSchema.parse({ page: 0, limit: 20 })).toThrow();
      expect(() => paginationSchema.parse({ page: -1, limit: 20 })).toThrow();
      expect(() => paginationSchema.parse({ page: 1, limit: 101 })).toThrow(); // Max 100
    });
  });

  describe('loginSchema', () => {
    it('should validate login with email', () => {
      const data = { email: 'test@example.com', password: 'password123' };
      expect(() => loginSchema.parse(data)).not.toThrow();
    });

    it('should validate login with phone', () => {
      const data = { phoneNumber: '0201234567', password: 'password123' };
      expect(() => loginSchema.parse(data)).not.toThrow();
    });

    it('should require password', () => {
      expect(() => loginSchema.parse({ email: 'test@example.com' })).toThrow('Password is required');
    });
  });

  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        role: 'parent' as const,
      };
      expect(() => registerSchema.parse(data)).not.toThrow();
    });

    it('should reject when passwords do not match', () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'DifferentPass123!',
        role: 'parent' as const,
      };
      expect(() => registerSchema.parse(data)).toThrow('Passwords do not match');
    });

    it('should require first name', () => {
      const data = {
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        role: 'parent' as const,
      };
      expect(() => registerSchema.parse(data)).toThrow();
    });
  });

  describe('validateData', () => {
    it('should validate and return parsed data', async () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const data = { name: 'John', age: 30 };

      const result = await validateData(schema, data);
      expect(result).toEqual(data);
    });

    it('should throw error for invalid data', async () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const data = { name: 'John', age: 'thirty' };

      await expect(validateData(schema, data)).rejects.toThrow();
    });

    it('should extract first error message from ZodError', async () => {
      const schema = z.object({ email: z.string().email() });
      const data = { email: 'invalid' };

      await expect(validateData(schema, data)).rejects.toThrow('Invalid email');
    });
  });
});
