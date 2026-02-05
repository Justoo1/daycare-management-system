import { AppDataSource } from '@config/database';
import { User } from '@models/User';
import { UserRole } from '@shared';
import { generateToken, generateOTP, getOTPExpiryTime } from '@utils/jwt';
import { validateGhanaPhoneNumber, normalizeGhanaPhoneNumber } from '@utils/validation';
import { Repository } from 'typeorm';

export class AuthService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * Register a new user
   */
  async register(
    tenantId: string,
    data: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber?: string;
      password: string;
      role: UserRole;
      centerId?: string;
    }
  ): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: data.email.toLowerCase(), tenantId },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate and normalize phone number if provided
    let normalizedPhone: string | undefined;
    if (data.phoneNumber) {
      if (!validateGhanaPhoneNumber(data.phoneNumber)) {
        throw new Error('Invalid Ghana phone number format');
      }
      normalizedPhone = normalizeGhanaPhoneNumber(data.phoneNumber);

      // Check if phone already exists
      const phoneExists = await this.userRepository.findOne({
        where: { phoneNumber: normalizedPhone, tenantId },
      });
      if (phoneExists) {
        throw new Error('User with this phone number already exists');
      }
    }

    // Create new user
    const user = this.userRepository.create({
      tenantId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      phoneNumber: normalizedPhone,
      passwordHash: data.password, // Will be hashed by BeforeInsert hook
      role: data.role,
      centerId: data.centerId,
      isActive: true,
      emailVerified: false,
      phoneVerified: false,
    });

    await this.userRepository.save(user);

    // Remove password hash before returning
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  /**
   * Login user with email/phone and password
   */
  async login(
    tenantId: string,
    emailOrPhone: string,
    password: string
  ): Promise<{ user: User; token: string }> {
    let user: User | null = null;

    // Try email first
    if (emailOrPhone.includes('@')) {
      user = await this.userRepository.findOne({
        where: { email: emailOrPhone.toLowerCase(), tenantId },
      });
    } else {
      // Try phone number
      try {
        const normalizedPhone = normalizeGhanaPhoneNumber(emailOrPhone);
        user = await this.userRepository.findOne({
          where: { phoneNumber: normalizedPhone, tenantId },
        });
      } catch (error) {
        // Invalid phone format, will fail below
      }
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Fetch staff profile classId if user is staff/teacher
    let classId: string | undefined = user.classId;
    if (['teacher', 'staff', 'director'].includes(user.role)) {
      const { StaffProfile } = await import('@models/StaffProfile');
      const staffRepo = AppDataSource.getRepository(StaffProfile);
      const staffProfile = await staffRepo.findOne({
        where: { userId: user.id, isActive: true },
        select: ['classId'],
      });
      if (staffProfile?.classId) {
        classId = staffProfile.classId;
      }
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      centerId: user.centerId,
      classId,
      role: user.role,
      email: user.email,
    });

    // Remove password hash before returning
    const { passwordHash, ...userWithoutPassword } = user;
    return {
      user: { ...userWithoutPassword, classId } as User,
      token,
    };
  }

  /**
   * Login user without tenant ID (looks up tenant automatically)
   */
  async loginWithoutTenant(
    emailOrPhone: string,
    password: string
  ): Promise<{ user: User; token: string; tenant: { id: string; name: string; slug: string } }> {
    let user: User | null = null;

    // Try email first
    if (emailOrPhone.includes('@')) {
      user = await this.userRepository.findOne({
        where: { email: emailOrPhone.toLowerCase() },
      });
    } else {
      // Try phone number
      try {
        const normalizedPhone = normalizeGhanaPhoneNumber(emailOrPhone);
        user = await this.userRepository.findOne({
          where: { phoneNumber: normalizedPhone },
        });
      } catch (error) {
        // Invalid phone format, will fail below
      }
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Fetch staff profile classId if user is staff/teacher
    let classId: string | undefined = user.classId;
    if (['teacher', 'staff', 'director'].includes(user.role)) {
      const { StaffProfile } = await import('@models/StaffProfile');
      const staffRepo = AppDataSource.getRepository(StaffProfile);
      const staffProfile = await staffRepo.findOne({
        where: { userId: user.id, isActive: true },
        select: ['classId'],
      });
      if (staffProfile?.classId) {
        classId = staffProfile.classId;
      }
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      centerId: user.centerId,
      classId,
      role: user.role,
      email: user.email,
    });

    // Get tenant info
    const { Tenant } = await import('@models/Tenant');
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({
      where: { id: user.tenantId },
    });

    // Remove password hash before returning
    const { passwordHash, ...userWithoutPassword } = user;
    return {
      user: { ...userWithoutPassword, classId } as User,
      token,
      tenant: {
        id: tenant?.id || user.tenantId,
        name: tenant?.name || 'Unknown',
        slug: tenant?.slug || '',
      },
    };
  }

  /**
   * Send OTP for passwordless login
   * This allows users to login using just their phone number + OTP
   * No tenant ID needed - looks up user automatically
   */
  async sendLoginOTP(phoneNumber: string): Promise<{ userExists: boolean }> {
    // Try to normalize phone number, but fallback to original if normalization fails
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeGhanaPhoneNumber(phoneNumber);
    } catch {
      normalizedPhone = phoneNumber;
    }

    // Try to find user with both normalized and original phone formats
    // This handles cases where phone numbers might be stored in different formats
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere(
        '(user.phoneNumber = :original OR user.phoneNumber = :normalized)',
        {
          original: phoneNumber,
          normalized: normalizedPhone,
        }
      )
      .getOne();

    if (!user) {
      throw new Error('No account found with this phone number. Please register first or contact your administrator.');
    }

    const otp = generateOTP(6);
    const expiresAt = getOTPExpiryTime(10); // 10 minutes expiry

    user.otpCode = otp;
    user.otpExpiresAt = expiresAt;
    user.otpAttempts = 0;

    await this.userRepository.save(user);

    // Send OTP via SMS using Arkesel - use the phone number from database
    const phoneForSMS = user.phoneNumber;
    try {
      const { getNotificationService } = await import('./NotificationService');
      const notificationService = getNotificationService();
      await notificationService.sendOTP(phoneForSMS, otp);
      console.log(`✅ Login OTP sent successfully to ${phoneForSMS}`);
    } catch (error: any) {
      console.error(`❌ Failed to send OTP to ${phoneForSMS}:`, error.message);
      // Don't throw error - allow OTP to be logged for development
      console.log(`⚠️  Login OTP for ${phoneNumber}: ${otp} (SMS failed, logging for development)`);
    }

    return { userExists: true };
  }

  /**
   * Verify OTP and login (Passwordless Login)
   * Returns user and JWT token on successful verification
   * No tenant ID needed - looks up user automatically
   */
  async loginWithOTP(
    phoneNumber: string,
    otp: string
  ): Promise<{ user: any; token: string; tenant: any }> {
    // Try to normalize phone number, but fallback to original if normalization fails
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeGhanaPhoneNumber(phoneNumber);
    } catch {
      normalizedPhone = phoneNumber;
    }

    // Try to find user with both normalized and original phone formats
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere(
        '(user.phoneNumber = :original OR user.phoneNumber = :normalized)',
        {
          original: phoneNumber,
          normalized: normalizedPhone,
        }
      )
      .getOne();

    if (!user) {
      throw new Error('User not found');
    }

    // Check OTP validity
    if (!user.otpCode || user.otpCode !== otp) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      if (user.otpAttempts >= 3) {
        user.otpCode = null;
        user.otpExpiresAt = null;
        await this.userRepository.save(user);
        throw new Error('Too many invalid attempts. Please request a new OTP.');
      }
      await this.userRepository.save(user);
      throw new Error('Invalid OTP');
    }

    // Check expiry
    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      throw new Error('OTP expired. Please request a new one.');
    }

    // OTP is valid - clear it and mark phone as verified
    user.phoneVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    user.lastLoginAt = new Date();

    await this.userRepository.save(user);

    // Fetch staff profile classId if user is staff/teacher
    let classId: string | undefined = user.classId;
    if (['teacher', 'staff', 'director'].includes(user.role)) {
      const { StaffProfile } = await import('@models/StaffProfile');
      const staffRepo = AppDataSource.getRepository(StaffProfile);
      const staffProfile = await staffRepo.findOne({
        where: { userId: user.id, isActive: true },
        select: ['classId'],
      });
      if (staffProfile?.classId) {
        classId = staffProfile.classId;
      }
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      classId,
      role: user.role,
      email: user.email,
    });

    // Get tenant info
    const { Tenant } = await import('@models/Tenant');
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({
      where: { id: user.tenantId },
    });

    // Return user without sensitive data - explicitly build the user object
    const userResponse = {
      id: user.id,
      tenantId: user.tenantId,
      centerId: user.centerId,
      classId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      profilePhotoUrl: user.profilePhotoUrl,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return {
      user: userResponse,
      token,
      tenant: {
        id: tenant?.id || user.tenantId,
        name: tenant?.name || 'Unknown',
        slug: tenant?.slug || '',
      },
    };
  }

  /**
   * Send OTP for phone verification (for already logged-in users)
   */
  async sendPhoneOTP(tenantId: string, phoneNumber: string): Promise<void> {
    const normalizedPhone = normalizeGhanaPhoneNumber(phoneNumber);

    const user = await this.userRepository.findOne({
      where: { phoneNumber: normalizedPhone, tenantId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const otp = generateOTP(6);
    const expiresAt = getOTPExpiryTime(10);

    user.otpCode = otp;
    user.otpExpiresAt = expiresAt;
    user.otpAttempts = 0;

    await this.userRepository.save(user);

    // Send OTP via SMS using Arkesel
    try {
      const { getNotificationService } = await import('./NotificationService');
      const notificationService = getNotificationService();
      await notificationService.sendOTP(normalizedPhone, otp);
      console.log(`✅ OTP sent successfully to ${normalizedPhone}`);
    } catch (error: any) {
      console.error(`❌ Failed to send OTP to ${normalizedPhone}:`, error.message);
      // Don't throw error - allow OTP to be logged for development
      console.log(`⚠️  OTP for ${phoneNumber}: ${otp} (SMS failed, logging for development)`);
    }
  }

  /**
   * Verify OTP (for phone verification of already logged-in users)
   */
  async verifyOTP(tenantId: string, phoneNumber: string, otp: string): Promise<void> {
    const normalizedPhone = normalizeGhanaPhoneNumber(phoneNumber);

    const user = await this.userRepository.findOne({
      where: { phoneNumber: normalizedPhone, tenantId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check OTP validity
    if (!user.otpCode || user.otpCode !== otp) {
      user.otpAttempts++;
      if (user.otpAttempts >= 3) {
        user.otpCode = null;
        user.otpExpiresAt = null;
      }
      await this.userRepository.save(user);
      throw new Error('Invalid OTP');
    }

    // Check expiry
    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      throw new Error('OTP expired');
    }

    // Mark phone as verified
    user.phoneVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;

    await this.userRepository.save(user);
  }

  /**
   * Get user by ID
   */
  async getUserById(tenantId: string, userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId, tenantId },
    });
  }

  /**
   * Update user profile
   */
  async updateProfile(
    tenantId: string,
    userId: string,
    data: Partial<User>
  ): Promise<User> {
    const user = await this.getUserById(tenantId, userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Don't allow updating these fields
    const { tenantId: _, id: __, passwordHash, ...updateData } = data;

    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  /**
   * Change password
   */
  async changePassword(
    tenantId: string,
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.getUserById(tenantId, userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await user.verifyPassword(currentPassword);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    user.passwordHash = newPassword;
    await this.userRepository.save(user);
  }
}

// Export singleton
let authService: AuthService;

export function getAuthService(): AuthService {
  if (!authService) {
    authService = new AuthService();
  }
  return authService;
}
