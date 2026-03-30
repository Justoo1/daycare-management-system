import { FastifyRequest, FastifyReply } from 'fastify';
import { getAuthService } from '@services/AuthService';
import { sendSuccess, sendCreated, sendBadRequest, sendServerError } from '@utils/response';
import { TenantContext } from '@shared';

export class AuthController {
  /**
   * User registration endpoint (for staff/parents joining existing tenants)
   * POST /api/auth/register
   *
   * Note: For creating a new organization/daycare center, use POST /api/tenants/register instead
   */
  static async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authService = getAuthService();

      const {
        tenantId,
        firstName,
        lastName,
        email,
        phoneNumber,
        password,
        role,
        inviteCode, // Optional: for validating invitations
      } = request.body as any;

      if (!tenantId || !firstName || !lastName || !email || !password || !role) {
        return sendBadRequest(reply, 'Missing required fields: tenantId, firstName, lastName, email, password, role');
      }

      // Validate password strength
      if (password.length < 8) {
        return sendBadRequest(reply, 'Password must be at least 8 characters long');
      }

      // Validate role - don't allow CENTER_OWNER registration via this endpoint
      const allowedRoles = ['director', 'teacher', 'staff', 'parent'];
      if (!allowedRoles.includes(role)) {
        return sendBadRequest(reply, 'Invalid role. Allowed roles: director, teacher, staff, parent');
      }

      const user = await authService.register(tenantId, {
        firstName,
        lastName,
        email,
        phoneNumber,
        password,
        role,
      });

      return sendCreated(reply, { user }, 'User registered successfully. You can now login.');
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('already registered')) {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * User login endpoint
   * POST /api/auth/login
   */
  static async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authService = getAuthService();

      const { email, phoneNumber, password } = request.body as any;
      const emailOrPhone = email || phoneNumber;

      if (!emailOrPhone || !password) {
        return sendBadRequest(reply, 'Email/Phone and password are required');
      }

      // Login without tenant ID - the service will look up the user's tenant
      const { user, token, tenant } = await authService.loginWithoutTenant(emailOrPhone, password);

      return sendSuccess(
        reply,
        {
          user,
          token,
          tenant,
        },
        'Login successful'
      );
    } catch (error: any) {
      if (error.message.includes('Invalid credentials') || error.message.includes('not found')) {
        return sendBadRequest(reply, 'Invalid email/phone or password');
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Send OTP for passwordless login (Public endpoint)
   * POST /api/auth/login/otp/send
   */
  static async sendLoginOTP(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authService = getAuthService();

      const { phoneNumber } = request.body as any;

      if (!phoneNumber) {
        return sendBadRequest(reply, 'Phone number is required');
      }

      const result = await authService.sendLoginOTP(phoneNumber);

      return sendSuccess(reply, result, 'OTP sent to your phone. It will expire in 10 minutes.');
    } catch (error: any) {
      if (error.message.includes('No account found') || error.message.includes('not found')) {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Verify OTP and login (Passwordless login - Public endpoint)
   * POST /api/auth/login/otp/verify
   */
  static async loginWithOTP(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authService = getAuthService();

      const { phoneNumber, otp } = request.body as any;

      if (!phoneNumber || !otp) {
        return sendBadRequest(reply, 'Phone number and OTP are required');
      }

      const { user, token, tenant } = await authService.loginWithOTP(phoneNumber, otp);

      return sendSuccess(
        reply,
        {
          user,
          token,
          tenant,
        },
        'Login successful'
      );
    } catch (error: any) {
      if (error.message.includes('Invalid OTP') || error.message.includes('expired') || error.message.includes('Too many')) {
        return sendBadRequest(reply, error.message);
      }
      if (error.message.includes('not found')) {
        return sendBadRequest(reply, 'User not found');
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Send OTP endpoint (for phone verification of logged-in users)
   * POST /api/auth/send-otp
   */
  static async sendOTP(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const authService = getAuthService();

      const { phoneNumber } = request.body as any;

      if (!phoneNumber) {
        return sendBadRequest(reply, 'Phone number is required');
      }

      await authService.sendPhoneOTP(tenant.tenantId, phoneNumber);

      return sendSuccess(reply, {}, 'OTP sent to your phone');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Verify OTP endpoint
   * POST /api/auth/verify-otp
   */
  static async verifyOTP(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const authService = getAuthService();

      const { phoneNumber, otp } = request.body as any;

      if (!phoneNumber || !otp) {
        return sendBadRequest(reply, 'Phone number and OTP are required');
      }

      await authService.verifyOTP(tenant.tenantId, phoneNumber, otp);

      return sendSuccess(reply, {}, 'Phone verified successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  static async getCurrentUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const authService = getAuthService();

      const user = await authService.getUserById(tenant.tenantId, tenant.userId);

      if (!user) {
        return sendBadRequest(reply, 'User not found');
      }

      return sendSuccess(reply, { user });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  static async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const authService = getAuthService();

      const updateData = request.body as any;

      const user = await authService.updateProfile(tenant.tenantId, tenant.userId, updateData);

      return sendSuccess(reply, { user }, 'Profile updated successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Save Expo push notification token for the authenticated user
   * POST /api/auth/push-token
   */
  static async savePushToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const authService = getAuthService();
      const { pushToken } = request.body as any;

      if (!pushToken) {
        return sendBadRequest(reply, 'pushToken is required');
      }

      await authService.savePushToken(tenant.userId, pushToken);
      return sendSuccess(reply, {}, 'Push token saved');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Initiate password reset via SMS OTP (Public endpoint)
   * POST /api/auth/forgot-password
   */
  static async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authService = getAuthService();
      const { phoneNumber } = request.body as any;

      if (!phoneNumber) {
        return sendBadRequest(reply, 'Phone number is required');
      }

      await authService.forgotPassword(phoneNumber);

      // Always return success to avoid revealing whether a phone number is registered
      return sendSuccess(reply, {}, 'If that number is registered, a reset code has been sent.');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Complete password reset with OTP (Public endpoint)
   * POST /api/auth/reset-password
   */
  static async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authService = getAuthService();
      const { phoneNumber, otp, newPassword } = request.body as any;

      if (!phoneNumber || !otp || !newPassword) {
        return sendBadRequest(reply, 'Phone number, OTP, and new password are required');
      }

      if (newPassword.length < 8) {
        return sendBadRequest(reply, 'Password must be at least 8 characters long');
      }

      await authService.resetPassword(phoneNumber, otp, newPassword);

      return sendSuccess(reply, {}, 'Password reset successfully. You can now log in.');
    } catch (error: any) {
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Change password
   * POST /api/auth/change-password
   */
  static async changePassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const authService = getAuthService();

      const { currentPassword, newPassword, confirmPassword } = request.body as any;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return sendBadRequest(reply, 'All password fields are required');
      }

      if (newPassword !== confirmPassword) {
        return sendBadRequest(reply, 'New passwords do not match');
      }

      await authService.changePassword(
        tenant.tenantId,
        tenant.userId,
        currentPassword,
        newPassword
      );

      return sendSuccess(reply, {}, 'Password changed successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }
}
