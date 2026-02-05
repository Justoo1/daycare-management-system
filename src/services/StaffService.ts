import { AppDataSource } from '@config/database';
import { StaffProfile } from '@models/StaffProfile';
import { User } from '@models/User';
import { Class } from '@models/Class';
import { StaffPosition, EmploymentType, UserRole, StaffPermission, DEFAULT_PERMISSIONS_BY_ROLE } from '@shared';
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

  // ==================== PERMISSION MANAGEMENT ====================

  /**
   * Get staff permissions
   * Returns both the effective permissions and whether custom permissions are being used
   */
  async getStaffPermissions(
    tenantId: string,
    staffId: string
  ): Promise<{
    staffId: string;
    role: UserRole;
    useCustomPermissions: boolean;
    customPermissions: StaffPermission[] | null;
    effectivePermissions: StaffPermission[];
    defaultPermissions: StaffPermission[];
  }> {
    const staff = await this.staffRepository.findOne({
      where: { id: staffId, tenantId },
      relations: ['user'],
    });

    if (!staff) {
      throw new Error('Staff profile not found');
    }

    const role = staff.user.role;
    const defaultPermissions = DEFAULT_PERMISSIONS_BY_ROLE[role] || [];
    const customPermissions = staff.permissions as StaffPermission[] | null;
    const useCustomPermissions = staff.useCustomPermissions;

    // Calculate effective permissions
    let effectivePermissions: StaffPermission[];
    if (useCustomPermissions && customPermissions && customPermissions.length > 0) {
      effectivePermissions = customPermissions;
    } else {
      effectivePermissions = defaultPermissions;
    }

    return {
      staffId: staff.id,
      role,
      useCustomPermissions,
      customPermissions,
      effectivePermissions,
      defaultPermissions,
    };
  }

  /**
   * Update staff permissions
   * Allows admin to set custom permissions for a staff member
   */
  async updateStaffPermissions(
    tenantId: string,
    staffId: string,
    permissions: StaffPermission[],
    useCustomPermissions: boolean = true
  ): Promise<StaffProfile> {
    const staff = await this.getStaffById(tenantId, staffId);

    if (!staff) {
      throw new Error('Staff profile not found');
    }

    // Validate that all permissions are valid
    const validPermissions = Object.values(StaffPermission);
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
    }

    staff.permissions = permissions;
    staff.useCustomPermissions = useCustomPermissions;

    return this.staffRepository.save(staff);
  }

  /**
   * Reset staff permissions to default role permissions
   */
  async resetStaffPermissions(
    tenantId: string,
    staffId: string
  ): Promise<StaffProfile> {
    const staff = await this.getStaffById(tenantId, staffId);

    if (!staff) {
      throw new Error('Staff profile not found');
    }

    staff.permissions = null;
    staff.useCustomPermissions = false;

    return this.staffRepository.save(staff);
  }

  /**
   * Get all available permissions with descriptions
   */
  static getAvailablePermissions(): Array<{
    permission: StaffPermission;
    category: string;
    description: string;
  }> {
    return [
      // Children Management
      { permission: StaffPermission.VIEW_ALL_CHILDREN, category: 'Children', description: 'View all children across all classes' },
      { permission: StaffPermission.VIEW_CLASS_CHILDREN, category: 'Children', description: 'View children in assigned class only' },
      { permission: StaffPermission.CREATE_CHILDREN, category: 'Children', description: 'Add new children to the system' },
      { permission: StaffPermission.EDIT_CHILDREN, category: 'Children', description: 'Edit children\'s information' },
      { permission: StaffPermission.DELETE_CHILDREN, category: 'Children', description: 'Delete children from the system' },
      { permission: StaffPermission.MANAGE_CHILDREN, category: 'Children', description: 'Full access: add, edit, and delete children' },

      // Activity Logging
      { permission: StaffPermission.LOG_ACTIVITIES, category: 'Activities', description: 'Log activities (meals, naps, etc.)' },
      { permission: StaffPermission.VIEW_ACTIVITIES, category: 'Activities', description: 'View activity logs' },

      // Attendance
      { permission: StaffPermission.MANAGE_ATTENDANCE, category: 'Attendance', description: 'Check-in and check-out children' },
      { permission: StaffPermission.VIEW_ATTENDANCE, category: 'Attendance', description: 'View attendance records' },

      // Billing & Payments
      { permission: StaffPermission.VIEW_BILLING, category: 'Billing', description: 'View invoices and payments' },
      { permission: StaffPermission.MANAGE_BILLING, category: 'Billing', description: 'Create and edit invoices' },
      { permission: StaffPermission.RECEIVE_PAYMENTS, category: 'Billing', description: 'Record cash payments' },

      // Messaging
      { permission: StaffPermission.SEND_MESSAGES, category: 'Messaging', description: 'Send messages to parents' },
      { permission: StaffPermission.VIEW_MESSAGES, category: 'Messaging', description: 'View message history' },

      // Reports
      { permission: StaffPermission.VIEW_REPORTS, category: 'Reports', description: 'View reports' },
      { permission: StaffPermission.GENERATE_REPORTS, category: 'Reports', description: 'Generate and export reports' },

      // Staff Management
      { permission: StaffPermission.VIEW_STAFF, category: 'Staff', description: 'View staff list' },
      { permission: StaffPermission.MANAGE_STAFF, category: 'Staff', description: 'Add, edit, and delete staff' },

      // Class Management
      { permission: StaffPermission.VIEW_CLASSES, category: 'Classes', description: 'View class list' },
      { permission: StaffPermission.MANAGE_CLASSES, category: 'Classes', description: 'Add, edit, and delete classes' },

      // Center Management
      { permission: StaffPermission.MANAGE_CENTERS, category: 'Centers', description: 'Manage center settings' },

      // Dashboard
      { permission: StaffPermission.VIEW_DASHBOARD, category: 'Dashboard', description: 'View dashboard' },
      { permission: StaffPermission.VIEW_ALL_STATS, category: 'Dashboard', description: 'View statistics for all classes' },
    ];
  }

  /**
   * Get default permissions for a role
   */
  static getDefaultPermissionsForRole(role: UserRole): StaffPermission[] {
    return DEFAULT_PERMISSIONS_BY_ROLE[role] || [];
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
