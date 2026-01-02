import { AppDataSource } from '@config/database';
import { Guardian } from '@models/Guardian';
import { User } from '@models/User';
import { Child } from '@models/Child';
import { Repository, IsNull } from 'typeorm';
import { UserRole } from '@shared';
import { generateOTP, getOTPExpiryTime } from '@utils/jwt';

export class GuardianService {
  private guardianRepository: Repository<Guardian>;
  private userRepository: Repository<User>;
  private childRepository: Repository<Child>;

  constructor() {
    this.guardianRepository = AppDataSource.getRepository(Guardian);
    this.userRepository = AppDataSource.getRepository(User);
    this.childRepository = AppDataSource.getRepository(Child);
  }

  /**
   * Create guardian with user account
   */
  async createGuardianWithUser(
    tenantId: string,
    centerId: string,
    guardianData: {
      // User fields
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber: string;
      // Guardian fields
      relationship: string;
      occupation?: string;
      company?: string;
      workAddress?: string;
      workPhoneNumber?: string;
      residentialAddress?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      isPrimaryGuardian?: boolean;
      isAuthorizedPickup?: boolean;
      priority?: number;
      // Children to link
      childIds: string[];
    },
    sendInvitation: boolean = true
  ): Promise<{ user: User; guardians: Guardian[]; otp?: string }> {
    // Use transaction to ensure atomicity
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if user already exists
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email: guardianData.email.toLowerCase(), tenantId },
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Check if phone already exists
      const phoneExists = await queryRunner.manager.findOne(User, {
        where: { phoneNumber: guardianData.phoneNumber, tenantId },
      });

      if (phoneExists) {
        throw new Error('User with this phone number already exists');
      }

      // Verify all children exist and belong to the tenant/center
      const children = await queryRunner.manager.find(Child, {
        where: guardianData.childIds.map(childId => ({
          id: childId,
          tenantId,
          centerId,
          deletedAt: IsNull(),
        })),
      });

      if (children.length !== guardianData.childIds.length) {
        throw new Error('One or more children not found or do not belong to this center');
      }

      // Check for duplicate relationships (e.g., can't have two "mother" or two "father" for same child)
      const normalizedRelationship = guardianData.relationship.toLowerCase().trim();
      const restrictedRelationships = ['mother', 'father'];

      if (restrictedRelationships.includes(normalizedRelationship)) {
        // Check each child for existing parent with same relationship
        for (const child of children) {
          const existingGuardian = await queryRunner.manager.findOne(Guardian, {
            where: {
              childId: child.id,
              relationship: normalizedRelationship,
              tenantId,
              deletedAt: IsNull(),
            },
          });

          if (existingGuardian) {
            throw new Error(
              `Child "${child.firstName} ${child.lastName}" already has a ${normalizedRelationship}. ` +
              `Cannot create duplicate ${normalizedRelationship} relationship. ` +
              `Please use a different relationship type (e.g., stepmother, stepfather, guardian).`
            );
          }
        }
      }

      // Generate OTP for passwordless login
      const otp = generateOTP(6);
      const otpExpiresAt = getOTPExpiryTime(60); // 60 minutes for first-time login

      // Create User account
      const user = queryRunner.manager.create(User, {
        tenantId,
        centerId,
        firstName: guardianData.firstName,
        lastName: guardianData.lastName,
        email: guardianData.email.toLowerCase(),
        phoneNumber: guardianData.phoneNumber,
        role: UserRole.PARENT,
        passwordHash: '', // Empty password - parents will use OTP login
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
        otpCode: otp,
        otpExpiresAt: otpExpiresAt,
        otpAttempts: 0,
      });

      await queryRunner.manager.save(user);

      // Create Guardian records for each child
      const guardians: Guardian[] = [];
      for (const child of children) {
        const guardian = queryRunner.manager.create(Guardian, {
          tenantId,
          centerId,
          childId: child.id,
          userId: user.id,
          firstName: guardianData.firstName,
          lastName: guardianData.lastName,
          email: guardianData.email,
          phoneNumber: guardianData.phoneNumber,
          relationship: normalizedRelationship, // Use normalized relationship
          occupation: guardianData.occupation,
          company: guardianData.company,
          workAddress: guardianData.workAddress,
          workPhoneNumber: guardianData.workPhoneNumber,
          residentialAddress: guardianData.residentialAddress,
          city: guardianData.city,
          region: guardianData.region,
          postalCode: guardianData.postalCode,
          isPrimaryGuardian: guardianData.isPrimaryGuardian ?? false,
          isAuthorizedPickup: guardianData.isAuthorizedPickup ?? true,
          priority: guardianData.priority ?? (guardianData.isPrimaryGuardian ? 1 : 2),
        });

        const savedGuardian = await queryRunner.manager.save(guardian);
        guardians.push(savedGuardian);
      }

      // Send invitation OTP if requested
      if (sendInvitation) {
        try {
          const { getNotificationService } = await import('./NotificationService');
          const notificationService = getNotificationService();
          await notificationService.sendParentInvitation(
            guardianData.phoneNumber,
            `${guardianData.firstName} ${guardianData.lastName}`,
            otp
          );
          console.log(`✅ Parent invitation sent to ${guardianData.phoneNumber}`);
        } catch (error: any) {
          console.error(`❌ Failed to send parent invitation:`, error.message);
          // Continue even if notification fails
        }
      }

      await queryRunner.commitTransaction();

      // Remove password hash before returning
      const { passwordHash, otpCode, ...userWithoutSensitiveData } = user;

      return {
        user: userWithoutSensitiveData as User,
        guardians,
        otp: sendInvitation ? undefined : otp, // Only return OTP if not sending invitation
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get all guardians for a tenant
   */
  async getAllGuardians(
    tenantId: string,
    filters?: {
      centerId?: string;
      childId?: string;
      isPrimaryGuardian?: boolean;
      isActive?: boolean;
    }
  ): Promise<Guardian[]> {
    const where: any = { tenantId, deletedAt: IsNull() };

    if (filters?.centerId) where.centerId = filters.centerId;
    if (filters?.childId) where.childId = filters.childId;
    if (filters?.isPrimaryGuardian !== undefined) where.isPrimaryGuardian = filters.isPrimaryGuardian;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return this.guardianRepository.find({
      where,
      relations: ['child'],
      order: { priority: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * Get guardian by ID
   */
  async getGuardianById(tenantId: string, guardianId: string): Promise<Guardian | null> {
    return this.guardianRepository.findOne({
      where: { id: guardianId, tenantId, deletedAt: IsNull() },
      relations: ['child'],
    });
  }

  /**
   * Get guardian by user ID
   */
  async getGuardianByUserId(tenantId: string, userId: string): Promise<Guardian[]> {
    return this.guardianRepository.find({
      where: { userId, tenantId, deletedAt: IsNull() },
      relations: ['child'],
      order: { priority: 'ASC' },
    });
  }

  /**
   * Get guardians for a child
   */
  async getGuardiansByChild(tenantId: string, childId: string): Promise<Guardian[]> {
    return this.guardianRepository.find({
      where: { childId, tenantId, deletedAt: IsNull() },
      order: { priority: 'ASC' },
    });
  }

  /**
   * Update guardian
   */
  async updateGuardian(
    tenantId: string,
    guardianId: string,
    data: Partial<Guardian>
  ): Promise<Guardian> {
    const guardian = await this.guardianRepository.findOne({
      where: { id: guardianId, tenantId, deletedAt: IsNull() },
    });

    if (!guardian) {
      throw new Error('Guardian not found');
    }

    // Prevent changing critical fields
    const { id, tenantId: _, centerId: __, childId: ___, userId: ____, ...updateData } = data as any;

    // If guardian has a user account, update user fields that should stay in sync
    if (guardian.userId) {
      const userUpdateData: Partial<User> = {};

      // Fields that should be synced between Guardian and User
      if (updateData.phoneNumber !== undefined) {
        userUpdateData.phoneNumber = updateData.phoneNumber;
      }
      if (updateData.email !== undefined) {
        userUpdateData.email = updateData.email.toLowerCase();
      }
      if (updateData.firstName !== undefined) {
        userUpdateData.firstName = updateData.firstName;
      }
      if (updateData.lastName !== undefined) {
        userUpdateData.lastName = updateData.lastName;
      }

      // Update user if there are fields to sync
      if (Object.keys(userUpdateData).length > 0) {
        await this.userRepository.update(
          { id: guardian.userId, tenantId },
          userUpdateData
        );
      }
    }

    Object.assign(guardian, updateData);
    return this.guardianRepository.save(guardian);
  }

  /**
   * Link guardian to additional children
   */
  async linkToChild(
    tenantId: string,
    userId: string,
    childId: string,
    guardianData?: Partial<Guardian>
  ): Promise<Guardian> {
    // Get user to use their details
    const user = await this.userRepository.findOne({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify child exists
    const child = await this.childRepository.findOne({
      where: { id: childId, tenantId, deletedAt: IsNull() },
    });

    if (!child) {
      throw new Error('Child not found');
    }

    // Check if link already exists
    const existing = await this.guardianRepository.findOne({
      where: { userId, childId, tenantId, deletedAt: IsNull() },
    });

    if (existing) {
      throw new Error('Guardian is already linked to this child');
    }

    // Validate relationship if provided
    if (guardianData?.relationship) {
      const normalizedRelationship = guardianData.relationship.toLowerCase().trim();
      const restrictedRelationships = ['mother', 'father'];

      if (restrictedRelationships.includes(normalizedRelationship)) {
        const existingGuardian = await this.guardianRepository.findOne({
          where: {
            childId,
            relationship: normalizedRelationship,
            tenantId,
            deletedAt: IsNull(),
          },
        });

        if (existingGuardian) {
          throw new Error(
            `Child "${child.firstName} ${child.lastName}" already has a ${normalizedRelationship}. ` +
            `Cannot create duplicate ${normalizedRelationship} relationship.`
          );
        }
      }

      // Normalize the relationship before saving
      guardianData.relationship = normalizedRelationship;
    }

    // Create guardian record
    const guardian = this.guardianRepository.create({
      tenantId,
      centerId: child.centerId,
      childId,
      userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      ...guardianData,
    });

    return this.guardianRepository.save(guardian);
  }

  /**
   * Unlink guardian from child
   */
  async unlinkFromChild(
    tenantId: string,
    guardianId: string
  ): Promise<void> {
    const guardian = await this.guardianRepository.findOne({
      where: { id: guardianId, tenantId, deletedAt: IsNull() },
    });

    if (!guardian) {
      throw new Error('Guardian not found');
    }

    guardian.deletedAt = new Date();
    await this.guardianRepository.save(guardian);
  }

  /**
   * Delete guardian (soft delete)
   */
  async deleteGuardian(tenantId: string, guardianId: string): Promise<void> {
    await this.unlinkFromChild(tenantId, guardianId);
  }

  /**
   * Get children for a parent/guardian
   */
  async getChildrenForParent(tenantId: string, userId: string): Promise<Child[]> {
    const guardians = await this.guardianRepository.find({
      where: { userId, tenantId, deletedAt: IsNull(), isActive: true },
      relations: ['child', 'child.class', 'child.center'],
    });

    // Map to children and filter out nulls
    const children = guardians.map(g => g.child).filter(Boolean);

    // Remove duplicates by child ID (in case parent has multiple guardian records for same child)
    const uniqueChildren = children.filter(
      (child, index, self) => index === self.findIndex(c => c.id === child.id)
    );

    return uniqueChildren;
  }

  /**
   * Resend login credentials (regenerate OTP and send via SMS)
   */
  async resendLoginCredentials(
    tenantId: string,
    userId: string
  ): Promise<{ phoneNumber: string; message: string }> {
    // Find the user
    const user = await this.userRepository.findOne({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate new OTP
    const otp = generateOTP(6);
    const otpExpiresAt = getOTPExpiryTime(60); // 60 minutes

    // Update user with new OTP
    user.otpCode = otp;
    user.otpExpiresAt = otpExpiresAt;
    user.otpAttempts = 0;
    await this.userRepository.save(user);

    // Send OTP via SMS
    try {
      const { getNotificationService } = await import('./NotificationService');
      const notificationService = getNotificationService();

      // Send parent login credentials with custom message
      const message = `Hello ${user.firstName}! Your Nkabom login code is: ${otp}. Use this code to access your account. Valid for 60 minutes.`;
      await notificationService.sendSMS({
        recipient: user.phoneNumber,
        message,
      });

      console.log(`✅ Login credentials resent to ${user.phoneNumber}`);
    } catch (error: any) {
      console.error(`❌ Failed to send credentials:`, error.message);
      // Pass through the actual error message from the SMS service
      throw new Error(`Failed to send SMS: ${error.message}`);
    }

    return {
      phoneNumber: user.phoneNumber,
      message: 'Login credentials sent successfully',
    };
  }

  /**
   * Create user account for legacy guardian (guardian without userId)
   * This upgrades a legacy guardian to have a user account with login credentials
   */
  async createUserForLegacyGuardian(
    tenantId: string,
    guardianId: string,
    centerId: string,
    sendInvitation: boolean = true
  ): Promise<{ user: User; otp?: string }> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the guardian
      const guardian = await queryRunner.manager.findOne(Guardian, {
        where: { id: guardianId, tenantId, deletedAt: IsNull() },
      });

      if (!guardian) {
        throw new Error('Guardian not found');
      }

      // Check if guardian already has a user account
      if (guardian.userId) {
        throw new Error('Guardian already has a user account');
      }

      // Check if user with this email already exists
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email: guardian.email.toLowerCase(), tenantId },
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Check if phone already exists
      const phoneExists = await queryRunner.manager.findOne(User, {
        where: { phoneNumber: guardian.phoneNumber, tenantId },
      });

      if (phoneExists) {
        throw new Error('User with this phone number already exists');
      }

      // Generate OTP for passwordless login
      const otp = generateOTP(6);
      const otpExpiresAt = getOTPExpiryTime(60); // 60 minutes

      // Create User account
      const user = queryRunner.manager.create(User, {
        tenantId,
        centerId,
        firstName: guardian.firstName,
        lastName: guardian.lastName,
        email: guardian.email.toLowerCase(),
        phoneNumber: guardian.phoneNumber,
        role: UserRole.PARENT,
        passwordHash: '', // Empty password - parents will use OTP login
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
        otpCode: otp,
        otpExpiresAt: otpExpiresAt,
        otpAttempts: 0,
      });

      await queryRunner.manager.save(user);

      // Update all guardian records with same email/phone to link to this user
      await queryRunner.manager.update(
        Guardian,
        {
          email: guardian.email,
          phoneNumber: guardian.phoneNumber,
          tenantId,
          deletedAt: IsNull(),
        },
        {
          userId: user.id,
        }
      );

      // Send invitation OTP if requested
      if (sendInvitation) {
        try {
          const { getNotificationService } = await import('./NotificationService');
          const notificationService = getNotificationService();

          const message = `Hello ${user.firstName}! Your Nkabom account has been created. Use this code to login: ${otp}. Valid for 60 minutes.`;
          await notificationService.sendSMS({
            recipient: user.phoneNumber,
            message,
          });

          console.log(`✅ Account creation notification sent to ${user.phoneNumber}`);
        } catch (error: any) {
          console.error(`❌ Failed to send notification:`, error.message);
          // Continue even if notification fails
        }
      }

      await queryRunner.commitTransaction();

      // Remove sensitive data before returning
      const { passwordHash, otpCode, ...userWithoutSensitiveData } = user;

      return {
        user: userWithoutSensitiveData as User,
        otp: sendInvitation ? undefined : otp,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

// Singleton instance
let guardianServiceInstance: GuardianService | null = null;

export function getGuardianService(): GuardianService {
  if (!guardianServiceInstance) {
    guardianServiceInstance = new GuardianService();
  }
  return guardianServiceInstance;
}
