import jwt from 'jsonwebtoken';
import { config } from '@config/environment';
import { UserRole } from '@shared';

export interface JWTPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT token
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  // Type assertion needed due to jsonwebtoken types compatibility
  return jwt.sign(payload as object, config.jwt.secret, {
    expiresIn: config.jwt.expiry,
  } as jwt.SignOptions) as string;
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, config.jwt.secret) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Decode JWT token without verification
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload | null;
  } catch (error) {
    return null;
  }
}

/**
 * Generate OTP code
 */
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

/**
 * Get OTP expiry time (default: 10 minutes)
 */
export function getOTPExpiryTime(minutesFromNow: number = 10): Date {
  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() + minutesFromNow);
  return expiryDate;
}
