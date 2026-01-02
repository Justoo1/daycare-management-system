import { AppDataSource } from '@config/database';
import { StaffProfile } from '@models/StaffProfile';
import { User } from '@models/User';
import { Class } from '@models/Class';
import { StaffPosition, EmploymentType, UserRole } from '@shared';
import { Repository } from 'typeorm';
import { generateOTP, getOTPExpiryTime } from '@utils/jwt';

export class StaffService {
  private staffRepository: Repository<StaffProfile>;
  private userRepository: Repository<User>;
  private classRepository: Repository<Class>;

  constructor() {
    this.staffRepository = AppDataSource.getRepository(StaffProfile);
    this.userRepository = AppDataSource.getRepository(User);
    this.classRepository = AppDataSource.getRepository(Class);
  }

  /**
   * Create staff member with user account (unified creation)
   * This method creates both a User account and StaffProfile in a single transaction
   */
  async createStaffWithUser(
    tenantId: string,
    centerId: string | undefined,
    data: {
      // User fields
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber: string;
      role: UserRole; // Must be one of: director, teacher, staff
      // Staff fields
      employeeId: string;
      position: StaffPosition;
      department?: string;
      hireDate: Date;
      employmentType: EmploymentType;
      salary?: number;
      salaryFrequency: string;
      qualifications?: string;
      specializations?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      emergencyContactRelationship?: string;
      notes?: string;
    },
    sendInvitation: boolean = true
  ): Promise<{ user: User; staff: StaffProfile; otp?: string }> {
    // Use transaction to ensure atomicity
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate role - staff can only be director, teacher, or staff
      const validRoles = [UserRole.DIRECTOR, UserRole.TEACHER, UserRole.STAFF];
      if (!validRoles.includes(data.role)) {
        throw new Error('Invalid role. Staff role must be one of: director, teacher, staff');
      }

      // Check if email already exists
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email: data.email.toLowerCase(), tenantId },
      });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Check if phone already exists
      const phoneExists = await queryRunner.manager.findOne(User, {
        where: { phoneNumber: data.phoneNumber, tenantId },
      });
      if (phoneExists) {
        throw new Error('User with this phone number already exists');
      }

      // Check if employee ID already exists
      const employeeExists = await queryRunner.manager.findOne(StaffProfile, {
        where: { tenantId, employeeId: data.employeeId },
      });
      if (employeeExists) {
        throw new Error('Employee ID already exists');
      }

      // Generate OTP for passwordless login
      const otp = generateOTP(6);
      const otpExpiresAt = getOTPExpiryTime(60); // 60 minutes for first-time login

      // Create User account
      const user = queryRunner.manager.create(User, {
        tenantId,
        centerId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        phoneNumber: data.phoneNumber,
        role: data.role,
        passwordHash: '', // Empty password - staff will use OTP login
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
        otpCode: otp,
        otpExpiresAt: otpExpiresAt,
        otpAttempts: 0,
      });

      await queryRunner.manager.save(user);

      // Generate unique QR code for staff attendance
      const qrCode = `STAFF-${tenantId.substring(0, 8)}-${user.id.substring(0, 8)}-${Date.now()}`;

      // Create StaffProfile
      const staff = queryRunner.manager.create(StaffProfile, {
        tenantId,
        centerId,
        userId: user.id,
        employeeId: data.employeeId,
        position: data.position,
        department: data.department,
        hireDate: data.hireDate,
        employmentType: data.employmentType,
        salary: data.salary,
        salaryFrequency: data.salaryFrequency as any,
        qualifications: data.qualifications,
        specializations: data.specializations,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        emergencyContactRelationship: data.emergencyContactRelationship,
        notes: data.notes,
        qrCode, // Add QR code
        isActive: true,
      });

      await queryRunner.manager.save(staff);

      // Send invitation OTP if requested
      if (sendInvitation) {
        try {
          const { getNotificationService } = await import('./NotificationService');
          const notificationService = getNotificationService();
          await notificationService.sendStaffInvitation(
            data.phoneNumber,
            `${data.firstName} ${data.lastName}`,
            otp
          );
          console.log(`✅ Staff invitation sent to ${data.phoneNumber}`);
        } catch (error: any) {
          console.error(`❌ Failed to send staff invitation:`, error.message);
          // Don't fail the transaction, just log the OTP
          console.log(`⚠️  OTP for ${data.phoneNumber}: ${otp}`);
        }
      }

      // Commit transaction
      await queryRunner.commitTransaction();

      // Remove sensitive data before returning
      const { passwordHash, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword as User,
        staff,
        otp: sendInvitation ? otp : undefined,
      };
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Create a new staff profile
   */
  async createStaffProfile(
    tenantId: string,
    userId: string,
    data: {
      employeeId: string;
      position: StaffPosition;
      department?: string;
      hireDate: Date;
      employmentType: EmploymentType;
      salary?: number;
      salaryFrequency: string;
      qualifications?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      emergencyContactRelationship?: string;
      notes?: string;
    }
  ): Promise<StaffProfile> {
    // Check if employee ID already exists
    const existing = await this.staffRepository.findOne({
      where: { tenantId, employeeId: data.employeeId },
    });

    if (existing) {
      throw new Error('Employee ID already exists');
    }

    const staff = this.staffRepository.create({
      tenantId,
      userId,
      employeeId: data.employeeId,
      position: data.position,
      department: data.department,
      hireDate: data.hireDate,
      employmentType: data.employmentType,
      salary: data.salary,
      salaryFrequency: data.salaryFrequency as any,
      qualifications: data.qualifications,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      emergencyContactRelationship: data.emergencyContactRelationship,
      notes: data.notes,
      isActive: true,
    });

    return this.staffRepository.save(staff);
  }

  /**
   * Get all staff profiles for a tenant
   */
  async getAllStaff(
    tenantId: string,
    filters?: {
      position?: StaffPosition;
      employmentType?: EmploymentType;
      isActive?: boolean;
      centerId?: string;
    }
  ): Promise<StaffProfile[]> {
    const where: any = { tenantId };

    if (filters?.position) where.position = filters.position;
    if (filters?.employmentType) where.employmentType = filters.employmentType;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.centerId) where.centerId = filters.centerId;

    return this.staffRepository.find({
      where,
      relations: ['user', 'center', 'certifications', 'shifts', 'attendances'],
      order: { hireDate: 'DESC' },
    });
  }

  /**
   * Get staff profile by ID
   */
  async getStaffById(tenantId: string, staffId: string): Promise<StaffProfile | null> {
    return this.staffRepository.findOne({
      where: { id: staffId, tenantId },
      relations: ['user', 'center', 'certifications', 'shifts', 'attendances'],
    });
  }

  /**
   * Get staff profile by employee ID
   */
  async getStaffByEmployeeId(tenantId: string, employeeId: string): Promise<StaffProfile | null> {
    return this.staffRepository.findOne({
      where: { tenantId, employeeId },
      relations: ['user', 'center', 'certifications', 'shifts', 'attendances'],
    });
  }

  /**
   * Get staff by user ID
   */
  async getStaffByUserId(tenantId: string, userId: string): Promise<StaffProfile | null> {
    return this.staffRepository.findOne({
      where: { tenantId, userId },
      relations: ['user', 'center', 'certifications', 'shifts', 'attendances'],
    });
  }

  /**
   * Update staff profile
   */
  async updateStaffProfile(
    tenantId: string,
    staffId: string,
    data: Partial<StaffProfile>
  ): Promise<StaffProfile> {
    const staff = await this.getStaffById(tenantId, staffId);

    if (!staff) {
      throw new Error('Staff profile not found');
    }

    // Don't allow updating these fields
    const { tenantId: _, id: __, userId, employeeId, ...updateData } = data as any;

    Object.assign(staff, updateData);

    return this.staffRepository.save(staff);
  }

  /**
   * Terminate staff employment
   */
  async terminateStaff(
    tenantId: string,
    staffId: string,
    terminationDate: Date,
    reason?: string
  ): Promise<StaffProfile> {
    const staff = await this.getStaffById(tenantId, staffId);

    if (!staff) {
      throw new Error('Staff profile not found');
    }

    staff.terminationDate = terminationDate;
    staff.terminationReason = reason;
    staff.isActive = false;

    return this.staffRepository.save(staff);
  }

  /**
   * Reactivate terminated staff
   */
  async reactivateStaff(tenantId: string, staffId: string): Promise<StaffProfile> {
    const staff = await this.getStaffById(tenantId, staffId);

    if (!staff) {
      throw new Error('Staff profile not found');
    }

    staff.terminationDate = undefined;
    staff.terminationReason = undefined;
    staff.isActive = true;

    return this.staffRepository.save(staff);
  }

  /**
   * Delete staff profile (soft delete)
   */
  async deleteStaff(tenantId: string, staffId: string): Promise<void> {
    const staff = await this.getStaffById(tenantId, staffId);

    if (!staff) {
      throw new Error('Staff profile not found');
    }

    staff.isActive = false;
    await this.staffRepository.save(staff);
  }

  /**
   * Get staff statistics
   */
  async getStaffStatistics(tenantId: string): Promise<{
    totalStaff: number;
    activeStaff: number;
    byPosition: Record<StaffPosition, number>;
    byEmploymentType: Record<EmploymentType, number>;
    averageYearsOfService: number;
    recentHires: StaffProfile[];
    upcomingTerminations: StaffProfile[];
  }> {
    const allStaff = await this.staffRepository.find({
      where: { tenantId },
      relations: ['user'],
    });

    const activeStaff = allStaff.filter((s) => s.isActive);

    const statistics = {
      totalStaff: allStaff.length,
      activeStaff: activeStaff.length,
      byPosition: {} as Record<StaffPosition, number>,
      byEmploymentType: {} as Record<EmploymentType, number>,
      averageYearsOfService: 0,
      recentHires: [] as StaffProfile[],
      upcomingTerminations: [] as StaffProfile[],
    };

    // Initialize counts
    Object.values(StaffPosition).forEach((position) => {
      statistics.byPosition[position] = 0;
    });

    Object.values(EmploymentType).forEach((type) => {
      statistics.byEmploymentType[type] = 0;
    });

    let totalYears = 0;

    allStaff.forEach((staff) => {
      statistics.byPosition[staff.position]++;
      statistics.byEmploymentType[staff.employmentType]++;
      totalYears += staff.getYearsOfService();
    });

    statistics.averageYearsOfService = allStaff.length > 0 ? totalYears / allStaff.length : 0;

    // Recent hires (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    statistics.recentHires = activeStaff
      .filter((s) => s.hireDate >= thirtyDaysAgo)
      .sort((a, b) => b.hireDate.getTime() - a.hireDate.getTime())
      .slice(0, 10);

    // Upcoming terminations (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    statistics.upcomingTerminations = allStaff
      .filter((s) => s.terminationDate && s.terminationDate <= thirtyDaysFromNow)
      .sort((a, b) => {
        if (!a.terminationDate || !b.terminationDate) return 0;
        return a.terminationDate.getTime() - b.terminationDate.getTime();
      });

    return statistics;
  }

  /**
   * Get staff by center
   */
  async getStaffByCenter(tenantId: string, centerId: string): Promise<StaffProfile[]> {
    return this.staffRepository.find({
      where: { tenantId, centerId, isActive: true },
      relations: ['user', 'certifications'],
      order: { position: 'ASC', hireDate: 'DESC' },
    });
  }

  /**
   * Assign staff to center
   */
  async assignToCenter(
    tenantId: string,
    staffId: string,
    centerId: string
  ): Promise<StaffProfile> {
    const staff = await this.getStaffById(tenantId, staffId);

    if (!staff) {
      throw new Error('Staff profile not found');
    }

    // If changing to a different center, clear the class assignment
    // since classes belong to specific centers
    if (staff.centerId && staff.centerId !== centerId) {
      staff.classId = null;
    }

    staff.centerId = centerId;
    return this.staffRepository.save(staff);
  }

  /**
   * Assign staff to class
   */
  async assignToClass(
    tenantId: string,
    staffId: string,
    classId: string | null
  ): Promise<StaffProfile> {
    const staff = await this.getStaffById(tenantId, staffId);

    if (!staff) {
      throw new Error('Staff profile not found');
    }

    // Check if staff has been assigned to a center
    if (!staff.centerId) {
      throw new Error('Staff must be assigned to a center before being assigned to a class');
    }

    // If assigning to a class (not removing), validate the class belongs to the staff's center
    if (classId) {
      const classEntity = await this.classRepository.findOne({
        where: { id: classId, tenantId },
      });

      if (!classEntity) {
        throw new Error('Class not found');
      }

      if (classEntity.centerId !== staff.centerId) {
        throw new Error('Class must belong to the same center as the staff member');
      }
    }

    // Allow null to unassign staff from class
    staff.classId = classId || null;
    return this.staffRepository.save(staff);
  }

  /**
   * Update salary
   */
  async updateSalary(
    tenantId: string,
    staffId: string,
    newSalary: number,
    salaryFrequency: string
  ): Promise<StaffProfile> {
    const staff = await this.getStaffById(tenantId, staffId);

    if (!staff) {
      throw new Error('Staff profile not found');
    }

    staff.salary = newSalary;
    staff.salaryFrequency = salaryFrequency as any;

    return this.staffRepository.save(staff);
  }

  /**
   * Generate QR code for staff member
   */
  async generateQRCode(
    tenantId: string,
    staffId: string
  ): Promise<StaffProfile> {
    const staff = await this.getStaffById(tenantId, staffId);

    if (!staff) {
      throw new Error('Staff profile not found');
    }

    // Generate a unique QR code using UUID + timestamp
    const qrCode = `STAFF-${staffId}-${Date.now()}`;

    staff.qrCode = qrCode;
    return this.staffRepository.save(staff);
  }
}

// Singleton instance
let staffServiceInstance: StaffService | null = null;

export function getStaffService(): StaffService {
  if (!staffServiceInstance) {
    staffServiceInstance = new StaffService();
  }
  return staffServiceInstance;
}
