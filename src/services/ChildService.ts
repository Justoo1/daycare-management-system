import { AppDataSource } from '@config/database';
import { Child } from '@models/Child';
import { Guardian } from '@models/Guardian';
import { Class } from '@models/Class';
import { ClassHistory, ClassChangeReason } from '@models/ClassHistory';
import { Attendance } from '@models/Attendance';
import { ActivityLog } from '@models/ActivityLog';
import { ProgressReport } from '@models/ProgressReport';
import { Milestone } from '@models/Milestone';
import { EnrollmentStatus, AttendanceStatus } from '@shared';
import { Repository, In, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export class ChildService {
  private childRepository: Repository<Child>;
  private guardianRepository: Repository<Guardian>;
  private classRepository: Repository<Class>;
  private classHistoryRepository: Repository<ClassHistory>;
  private attendanceRepository: Repository<Attendance>;
  private activityLogRepository: Repository<ActivityLog>;
  private progressReportRepository: Repository<ProgressReport>;
  private milestoneRepository: Repository<Milestone>;

  constructor() {
    this.childRepository = AppDataSource.getRepository(Child);
    this.guardianRepository = AppDataSource.getRepository(Guardian);
    this.classRepository = AppDataSource.getRepository(Class);
    this.classHistoryRepository = AppDataSource.getRepository(ClassHistory);
    this.attendanceRepository = AppDataSource.getRepository(Attendance);
    this.activityLogRepository = AppDataSource.getRepository(ActivityLog);
    this.progressReportRepository = AppDataSource.getRepository(ProgressReport);
    this.milestoneRepository = AppDataSource.getRepository(Milestone);
  }

  /**
   * Check if class has available capacity
   */
  private async checkClassCapacity(tenantId: string, classId: string): Promise<void> {
    const classEntity = await this.classRepository.findOne({
      where: { id: classId, tenantId, deletedAt: IsNull() },
      relations: ['children'],
    });

    if (!classEntity) {
      throw new Error('Class not found');
    }

    // Count only enrolled children (not deleted)
    const enrolledCount = await this.childRepository.count({
      where: {
        tenantId,
        class: { id: classId },
        deletedAt: IsNull(),
        enrollmentStatus: EnrollmentStatus.ENROLLED,
      },
    });

    if (enrolledCount >= classEntity.capacity) {
      throw new Error(`Class "${classEntity.name}" is at full capacity (${classEntity.capacity}/${classEntity.capacity}). Cannot add more children.`);
    }
  }

  /**
   * Create a new child
   */
  async createChild(
    tenantId: string,
    centerId: string,
    data: {
      firstName: string;
      lastName: string;
      dateOfBirth: Date;
      gender: string;
      bloodType?: string;
      allergies?: string;
      medicalConditions?: string;
      dietaryRestrictions?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      emergencyContactRelationship?: string;
      specialNeeds?: string;
      classId?: string;
    }
  ): Promise<Child> {
    const { classId, ...childData } = data;

    // Check class capacity if classId is provided
    if (classId) {
      await this.checkClassCapacity(tenantId, classId);
    }

    const child = this.childRepository.create({
      tenantId,
      centerId,
      ...childData,
      enrollmentStatus: EnrollmentStatus.PENDING,
      applicationDate: new Date(),
      isActive: true,
    });

    // If classId is provided, set both the classId column and the class relationship
    if (classId) {
      child.classId = classId;
      child.class = { id: classId } as any;
    }

    return this.childRepository.save(child);
  }

  /**
   * Get child by ID
   */
  async getChildById(tenantId: string, childId: string): Promise<Child | null> {
    return this.childRepository.findOne({
      where: { id: childId, tenantId, deletedAt: IsNull() },
      relations: ['guardians', 'class', 'center'],
    });
  }

  /**
   * Get all children for a center
   */
  async getChildrenByCenter(
    tenantId: string,
    centerId: string,
    options?: { skip: number; take: number },
    classId?: string
  ): Promise<[Child[], number]> {
    console.log('Querying children with:', { tenantId, centerId, classId, options });

    const where: any = { tenantId, centerId, deletedAt: IsNull() };

    // Add classId filter if provided
    if (classId) {
      where.classId = classId;
    }

    const result = await this.childRepository.findAndCount({
      where,
      relations: ['guardians', 'class'],
      skip: options?.skip || 0,
      take: options?.take || 20,
      order: { createdAt: 'DESC' },
    });

    console.log('Query result:', { count: result[0].length, total: result[1] });

    return result;
  }

  /**
   * Get all children in tenant (across all centers)
   * Used for parent management where managers need to see all children
   */
  async getAllChildrenInTenant(
    tenantId: string,
    options?: { skip: number; take: number },
    classId?: string
  ): Promise<[Child[], number]> {
    console.log('Querying all children in tenant:', { tenantId, classId, options });

    const where: any = { tenantId, deletedAt: IsNull() };

    // Add classId filter if provided
    if (classId) {
      where.classId = classId;
    }

    const result = await this.childRepository.findAndCount({
      where,
      relations: ['guardians', 'class', 'center'],
      skip: options?.skip || 0,
      take: options?.take || 1000,
      order: { createdAt: 'DESC' },
    });

    console.log('All children query result:', { count: result[0].length, total: result[1] });

    return result;
  }

  /**
   * Get children by class
   */
  async getChildrenByClass(
    tenantId: string,
    classId: string
  ): Promise<Child[]> {
    return this.childRepository.find({
      where: { tenantId, class: { id: classId }, deletedAt: IsNull() },
      relations: ['guardians', 'class'],
      order: { firstName: 'ASC' },
    });
  }

  /**
   * Update child information
   */
  async updateChild(
    tenantId: string,
    childId: string,
    data: Partial<Child>
  ): Promise<Child> {
    const child = await this.getChildById(tenantId, childId);
    if (!child) {
      throw new Error('Child not found');
    }

    // Don't allow updating these fields
    const { tenantId: _, id: __, centerId: ___, ...updateData } = data;

    Object.assign(child, updateData);
    return this.childRepository.save(child);
  }

  /**
   * Add guardian to child
   */
  async addGuardian(
    tenantId: string,
    centerId: string,
    childId: string,
    guardianData: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber: string;
      relationship: string;
      isPrimaryGuardian?: boolean;
      canReceiveSMS?: boolean;
      canReceiveEmail?: boolean;
      canReceivePushNotifications?: boolean;
    }
  ): Promise<Guardian> {
    const child = await this.getChildById(tenantId, childId);
    if (!child) {
      throw new Error('Child not found');
    }

    const guardian = this.guardianRepository.create({
      tenantId,
      centerId,
      childId,
      ...guardianData,
      isActive: true,
      priority: guardianData.isPrimaryGuardian ? 1 : 2,
    });

    return this.guardianRepository.save(guardian);
  }

  /**
   * Update guardian information
   */
  async updateGuardian(
    tenantId: string,
    guardianId: string,
    data: Partial<Guardian>
  ): Promise<Guardian> {
    const guardian = await this.guardianRepository.findOne({
      where: { id: guardianId, tenantId },
    });

    if (!guardian) {
      throw new Error('Guardian not found');
    }

    // Don't allow updating these fields
    const { tenantId: _, id: __, childId: ___, centerId: ____, ...updateData } = data;

    Object.assign(guardian, updateData);
    return this.guardianRepository.save(guardian);
  }

  /**
   * Get child's guardians
   */
  async getGuardians(tenantId: string, childId: string): Promise<Guardian[]> {
    return this.guardianRepository.find({
      where: { tenantId, childId, isActive: true },
      order: { priority: 'ASC' },
    });
  }

  /**
   * Enroll child to a class
   */
  async enrollChild(
    tenantId: string,
    childId: string,
    classId: string
  ): Promise<Child> {
    const child = await this.getChildById(tenantId, childId);
    if (!child) {
      throw new Error('Child not found');
    }

    // Check class capacity before enrolling
    await this.checkClassCapacity(tenantId, classId);

    child.classId = classId;
    child.class = { id: classId } as any;
    child.enrollmentStatus = EnrollmentStatus.ENROLLED;
    child.enrollmentDate = new Date();

    return this.childRepository.save(child);
  }

  /**
   * Withdraw child from class/center
   */
  async withdrawChild(
    tenantId: string,
    childId: string,
    reason: string
  ): Promise<Child> {
    const child = await this.getChildById(tenantId, childId);
    if (!child) {
      throw new Error('Child not found');
    }

    child.enrollmentStatus = EnrollmentStatus.WITHDRAWN;
    child.withdrawalDate = new Date();
    child.withdrawalReason = reason;
    child.isActive = false;

    return this.childRepository.save(child);
  }

  /**
   * Put child on waitlist
   */
  async addToWaitlist(tenantId: string, childId: string, classId?: string): Promise<Child> {
    const child = await this.getChildById(tenantId, childId);
    if (!child) {
      throw new Error('Child not found');
    }

    // Calculate waitlist position
    const waitlistCount = await this.childRepository.count({
      where: { tenantId, centerId: child.centerId, enrollmentStatus: EnrollmentStatus.WAITLIST },
    });

    child.enrollmentStatus = EnrollmentStatus.WAITLIST;
    child.waitlistPosition = waitlistCount + 1;
    child.waitlistAddedDate = new Date();

    if (classId) {
      child.classId = classId;
      child.class = { id: classId } as any;
    }

    return this.childRepository.save(child);
  }

  /**
   * Approve enrollment application
   */
  async approveApplication(
    tenantId: string,
    childId: string,
    approvedBy: string
  ): Promise<Child> {
    const child = await this.getChildById(tenantId, childId);
    if (!child) {
      throw new Error('Child not found');
    }

    if (child.enrollmentStatus !== EnrollmentStatus.PENDING) {
      throw new Error('Only pending applications can be approved');
    }

    child.enrollmentStatus = EnrollmentStatus.APPROVED;
    child.approvalDate = new Date();
    child.approvedBy = approvedBy;

    return this.childRepository.save(child);
  }

  /**
   * Reject enrollment application
   */
  async rejectApplication(
    tenantId: string,
    childId: string,
    reason: string
  ): Promise<Child> {
    const child = await this.getChildById(tenantId, childId);
    if (!child) {
      throw new Error('Child not found');
    }

    if (child.enrollmentStatus !== EnrollmentStatus.PENDING) {
      throw new Error('Only pending applications can be rejected');
    }

    child.enrollmentStatus = EnrollmentStatus.REJECTED;
    child.rejectionReason = reason;

    return this.childRepository.save(child);
  }

  /**
   * Move child from waitlist to enrolled
   */
  async promoteFromWaitlist(
    tenantId: string,
    childId: string,
    classId: string
  ): Promise<Child> {
    const child = await this.getChildById(tenantId, childId);
    if (!child) {
      throw new Error('Child not found');
    }

    if (child.enrollmentStatus !== EnrollmentStatus.WAITLIST) {
      throw new Error('Child is not on waitlist');
    }

    // Check class capacity before promoting
    await this.checkClassCapacity(tenantId, classId);

    child.enrollmentStatus = EnrollmentStatus.ENROLLED;
    child.enrollmentDate = new Date();
    child.classId = classId;
    child.class = { id: classId } as any;
    child.isActive = true;
    (child as any).waitlistPosition = null;

    // Update waitlist positions for remaining children
    await this.updateWaitlistPositions(tenantId, child.centerId);

    return this.childRepository.save(child);
  }

  /**
   * Update waitlist positions after removal
   */
  private async updateWaitlistPositions(tenantId: string, centerId: string): Promise<void> {
    const waitlistChildren = await this.childRepository.find({
      where: { tenantId, centerId, enrollmentStatus: EnrollmentStatus.WAITLIST, deletedAt: IsNull() },
      order: { waitlistAddedDate: 'ASC' },
    });

    for (let i = 0; i < waitlistChildren.length; i++) {
      waitlistChildren[i].waitlistPosition = i + 1;
    }

    await this.childRepository.save(waitlistChildren);
  }

  /**
   * Get waitlist for a center
   */
  async getWaitlist(tenantId: string, centerId: string): Promise<Child[]> {
    return this.childRepository.find({
      where: { tenantId, centerId, enrollmentStatus: EnrollmentStatus.WAITLIST, deletedAt: IsNull() },
      relations: ['guardians', 'class'],
      order: { waitlistPosition: 'ASC' },
    });
  }

  /**
   * Get pending applications for a center
   */
  async getPendingApplications(tenantId: string, centerId: string): Promise<Child[]> {
    return this.childRepository.find({
      where: { tenantId, centerId, enrollmentStatus: EnrollmentStatus.PENDING, deletedAt: IsNull() },
      relations: ['guardians'],
      order: { applicationDate: 'ASC' },
    });
  }

  /**
   * Bulk approve applications
   */
  async bulkApproveApplications(
    tenantId: string,
    childIds: string[],
    approvedBy: string
  ): Promise<Child[]> {
    const children = await this.childRepository.find({
      where: { tenantId, id: In(childIds), enrollmentStatus: EnrollmentStatus.PENDING, deletedAt: IsNull() },
    });

    if (children.length !== childIds.length) {
      throw new Error('Some children not found or not in pending status');
    }

    for (const child of children) {
      child.enrollmentStatus = EnrollmentStatus.APPROVED;
      child.approvalDate = new Date();
      child.approvedBy = approvedBy;
    }

    return this.childRepository.save(children);
  }

  /**
   * Bulk enroll children
   */
  async bulkEnrollChildren(
    tenantId: string,
    enrollments: Array<{ childId: string; classId: string }>
  ): Promise<Child[]> {
    const childIds = enrollments.map(e => e.childId);
    const children = await this.childRepository.find({
      where: { tenantId, id: In(childIds), deletedAt: IsNull() },
    });

    if (children.length !== enrollments.length) {
      throw new Error('Some children not found');
    }

    // Check capacity for all classes before enrolling any children
    const uniqueClassIds = [...new Set(enrollments.map(e => e.classId))];
    for (const classId of uniqueClassIds) {
      await this.checkClassCapacity(tenantId, classId);
    }

    for (const child of children) {
      const enrollment = enrollments.find(e => e.childId === child.id);
      if (enrollment) {
        child.classId = enrollment.classId;
        child.class = { id: enrollment.classId } as any;
        child.enrollmentStatus = EnrollmentStatus.ENROLLED;
        child.enrollmentDate = new Date();
        child.isActive = true;
      }
    }

    return this.childRepository.save(children);
  }

  /**
   * Get enrollment statistics for a center
   */
  async getEnrollmentStats(tenantId: string, centerId: string): Promise<{
    totalEnrolled: number;
    totalPending: number;
    totalWaitlist: number;
    totalApproved: number;
    totalWithdrawn: number;
    totalRejected: number;
    totalInactive: number;
  }> {
    const [totalEnrolled, totalPending, totalWaitlist, totalApproved, totalWithdrawn, totalRejected, totalInactive] = await Promise.all([
      this.childRepository.count({ where: { tenantId, centerId, enrollmentStatus: EnrollmentStatus.ENROLLED } }),
      this.childRepository.count({ where: { tenantId, centerId, enrollmentStatus: EnrollmentStatus.PENDING } }),
      this.childRepository.count({ where: { tenantId, centerId, enrollmentStatus: EnrollmentStatus.WAITLIST } }),
      this.childRepository.count({ where: { tenantId, centerId, enrollmentStatus: EnrollmentStatus.APPROVED } }),
      this.childRepository.count({ where: { tenantId, centerId, enrollmentStatus: EnrollmentStatus.WITHDRAWN } }),
      this.childRepository.count({ where: { tenantId, centerId, enrollmentStatus: EnrollmentStatus.REJECTED } }),
      this.childRepository.count({ where: { tenantId, centerId, enrollmentStatus: EnrollmentStatus.INACTIVE } }),
    ]);

    return {
      totalEnrolled,
      totalPending,
      totalWaitlist,
      totalApproved,
      totalWithdrawn,
      totalRejected,
      totalInactive,
    };
  }

  /**
   * Search children by name
   */
  async searchChildren(
    tenantId: string,
    centerId: string,
    searchQuery: string,
    classId?: string
  ): Promise<Child[]> {
    const queryBuilder = this.childRepository
      .createQueryBuilder('child')
      .where('child.tenantId = :tenantId AND child.centerId = :centerId', {
        tenantId,
        centerId,
      })
      .andWhere('(child.firstName ILIKE :query OR child.lastName ILIKE :query)', {
        query: `%${searchQuery}%`,
      })
      .andWhere('child.isActive = true');

    // Add classId filter if provided
    if (classId) {
      queryBuilder.andWhere('child.classId = :classId', { classId });
    }

    return queryBuilder
      .leftJoinAndSelect('child.guardians', 'guardians')
      .limit(20)
      .getMany();
  }

  /**
   * Get child by enrollment status
   */
  async getChildrenByEnrollmentStatus(
    tenantId: string,
    centerId: string,
    status: EnrollmentStatus
  ): Promise<Child[]> {
    return this.childRepository.find({
      where: { tenantId, centerId, enrollmentStatus: status },
      relations: ['guardians', 'class'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Generate QR code for a child
   */
  async generateQRCode(tenantId: string, childId: string): Promise<Child> {
    const child = await this.childRepository.findOne({
      where: { id: childId, tenantId, deletedAt: IsNull() },
      relations: ['guardians'],
    });

    if (!child) {
      throw new Error('Child not found');
    }

    // Generate a unique QR code using UUID
    const qrCode = `NKABOM-${uuidv4()}`;
    child.qrCode = qrCode;

    return this.childRepository.save(child);
  }

  /**
   * Get child by QR code
   */
  async getChildByQRCode(tenantId: string, qrCode: string): Promise<Child | null> {
    return this.childRepository.findOne({
      where: { qrCode, tenantId, deletedAt: IsNull() },
      relations: ['guardians', 'class', 'center'],
    });
  }

  /**
   * Set child active status
   */
  async setChildActiveStatus(
    tenantId: string,
    childId: string,
    isActive: boolean
  ): Promise<Child> {
    const child = await this.getChildById(tenantId, childId);
    if (!child) {
      throw new Error('Child not found');
    }

    child.isActive = isActive;
    return this.childRepository.save(child);
  }

  /**
   * Bulk set active status for multiple children
   */
  async bulkSetActiveStatus(
    tenantId: string,
    childIds: string[],
    isActive: boolean
  ): Promise<{ updated: number }> {
    const result = await this.childRepository
      .createQueryBuilder()
      .update(Child)
      .set({ isActive })
      .where('tenantId = :tenantId', { tenantId })
      .andWhere('id IN (:...childIds)', { childIds })
      .andWhere('deletedAt IS NULL')
      .execute();

    return { updated: result.affected || 0 };
  }

  /**
   * Delete a child (soft delete by setting deletedAt)
   */
  async deleteChild(tenantId: string, childId: string): Promise<void> {
    const child = await this.childRepository.findOne({
      where: { id: childId, tenantId },
    });

    if (!child) {
      throw new Error('Child not found');
    }

    // Soft delete by setting deletedAt timestamp
    child.deletedAt = new Date();
    await this.childRepository.save(child);
  }

  /**
   * Promote a child to a new class
   */
  async promoteChild(
    tenantId: string,
    childId: string,
    newClassId: string,
    promotedByUserId: string,
    reason: ClassChangeReason = ClassChangeReason.PROMOTION,
    notes?: string
  ): Promise<{ child: Child; history: ClassHistory }> {
    const child = await this.getChildById(tenantId, childId);
    if (!child) {
      throw new Error('Child not found');
    }

    const newClass = await this.classRepository.findOne({
      where: { id: newClassId, tenantId, deletedAt: IsNull() },
    });

    if (!newClass) {
      throw new Error('Target class not found');
    }

    // Check capacity
    await this.checkClassCapacity(tenantId, newClassId);

    const oldClassId = child.classId;
    const oldClassName = child.class?.name || 'No Class';
    const today = new Date();

    // Calculate performance stats for the old class
    let attendanceStats = { rate: 0, present: 0, absent: 0 };
    let totalActivities = 0;
    let milestonesCount = 0;

    if (oldClassId) {
      // Get attendance stats
      const attendances = await this.attendanceRepository.find({
        where: { childId, tenantId, classId: oldClassId, deletedAt: IsNull() },
      });

      if (attendances.length > 0) {
        const present = attendances.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
        const absent = attendances.filter(a => a.status === AttendanceStatus.ABSENT).length;
        attendanceStats = {
          rate: attendances.length > 0 ? (present / attendances.length) * 100 : 0,
          present,
          absent,
        };
      }

      // Get activity count
      totalActivities = await this.activityLogRepository.count({
        where: { childId, tenantId, deletedAt: IsNull() },
      });

      // Get milestones count
      milestonesCount = await this.milestoneRepository.count({
        where: { childId, tenantId, isActive: true },
      });

      // Close the current class history entry
      const currentHistory = await this.classHistoryRepository.findOne({
        where: { childId, tenantId, endDate: IsNull() },
      });

      if (currentHistory) {
        currentHistory.endDate = today;
        currentHistory.attendanceRate = attendanceStats.rate;
        currentHistory.totalDaysPresent = attendanceStats.present;
        currentHistory.totalDaysAbsent = attendanceStats.absent;
        currentHistory.totalActivities = totalActivities;
        currentHistory.milestonesAchieved = milestonesCount;
        currentHistory.teacherRemarks = notes;
        await this.classHistoryRepository.save(currentHistory);
      }
    }

    // Create new class history entry
    const newHistory = this.classHistoryRepository.create({
      tenantId,
      childId,
      classId: newClassId,
      className: newClass.name,
      ageGroupMin: newClass.ageGroupMin,
      ageGroupMax: newClass.ageGroupMax,
      startDate: today,
      reason,
      notes: `Promoted from ${oldClassName} to ${newClass.name}${notes ? '. ' + notes : ''}`,
      promotedBy: promotedByUserId,
    });
    // endDate is null by default for current class

    await this.classHistoryRepository.save(newHistory);

    // Update the child's class
    child.classId = newClassId;
    child.class = newClass;
    await this.childRepository.save(child);

    // Reload child with relationships
    const updatedChild = await this.getChildById(tenantId, childId);

    return { child: updatedChild!, history: newHistory };
  }

  /**
   * Get child's class history
   */
  async getChildClassHistory(
    tenantId: string,
    childId: string
  ): Promise<ClassHistory[]> {
    return this.classHistoryRepository.find({
      where: { childId, tenantId },
      relations: ['class', 'promoter'],
      order: { startDate: 'DESC' },
    });
  }

  /**
   * Get comprehensive child history including attendance, activities, milestones
   */
  async getChildFullHistory(
    tenantId: string,
    childId: string
  ): Promise<{
    classHistory: ClassHistory[];
    attendanceSummary: {
      total: number;
      present: number;
      absent: number;
      late: number;
      rate: number;
    };
    recentAttendance: Attendance[];
    recentActivities: ActivityLog[];
    progressReports: ProgressReport[];
    milestones: Milestone[];
  }> {
    const child = await this.getChildById(tenantId, childId);
    if (!child) {
      throw new Error('Child not found');
    }

    // Get class history
    const classHistory = await this.classHistoryRepository.find({
      where: { childId, tenantId },
      relations: ['promoter'],
      order: { startDate: 'DESC' },
    });

    // Get all attendance records
    const allAttendance = await this.attendanceRepository.find({
      where: { childId, tenantId, deletedAt: IsNull() },
    });

    const present = allAttendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const absent = allAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const late = allAttendance.filter(a => a.status === AttendanceStatus.LATE).length;

    // Get recent attendance (last 30 records)
    const recentAttendance = await this.attendanceRepository.find({
      where: { childId, tenantId, deletedAt: IsNull() },
      relations: ['class'],
      order: { date: 'DESC' },
      take: 30,
    });

    // Get recent activities (last 50)
    const recentActivities = await this.activityLogRepository.find({
      where: { childId, tenantId, deletedAt: IsNull() },
      relations: ['recordedByUser'],
      order: { date: 'DESC' },
      take: 50,
    });

    // Get progress reports
    const progressReports = await this.progressReportRepository.find({
      where: { childId, tenantId, isActive: true },
      relations: ['generator'],
      order: { generatedAt: 'DESC' },
    });

    // Get milestones
    const milestones = await this.milestoneRepository.find({
      where: { childId, tenantId, isActive: true },
      order: { dateAchieved: 'DESC' },
    });

    return {
      classHistory,
      attendanceSummary: {
        total: allAttendance.length,
        present,
        absent,
        late,
        rate: allAttendance.length > 0 ? (present / allAttendance.length) * 100 : 0,
      },
      recentAttendance,
      recentActivities,
      progressReports,
      milestones,
    };
  }

  /**
   * Create initial class history when a child is first assigned to a class
   */
  async createInitialClassHistory(
    tenantId: string,
    childId: string,
    classId: string,
    userId?: string
  ): Promise<ClassHistory> {
    const classEntity = await this.classRepository.findOne({
      where: { id: classId, tenantId },
    });

    if (!classEntity) {
      throw new Error('Class not found');
    }

    const history = this.classHistoryRepository.create({
      tenantId,
      childId,
      classId,
      className: classEntity.name,
      ageGroupMin: classEntity.ageGroupMin,
      ageGroupMax: classEntity.ageGroupMax,
      startDate: new Date(),
      endDate: null,
      reason: ClassChangeReason.INITIAL_ENROLLMENT,
      notes: `Initially enrolled in ${classEntity.name}`,
      promotedBy: userId,
    });

    return this.classHistoryRepository.save(history);
  }

  /**
   * Get eligible classes for promotion (based on age progression)
   */
  async getEligibleClassesForPromotion(
    tenantId: string,
    childId: string
  ): Promise<Class[]> {
    const child = await this.getChildById(tenantId, childId);
    if (!child) {
      throw new Error('Child not found');
    }

    const ageInMonths = child.getAgeInMonths();
    const currentClassId = child.classId;
    const centerId = child.centerId;

    // Get all active classes that the child could fit into
    const classes = await this.classRepository.find({
      where: {
        tenantId,
        centerId,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: { ageGroupMin: 'ASC' },
    });

    // Filter to classes where child's age is within range, excluding current class
    return classes.filter(c =>
      c.id !== currentClassId &&
      ageInMonths >= c.ageGroupMin &&
      ageInMonths <= c.ageGroupMax
    );
  }
}

let childService: ChildService;

export function getChildService(): ChildService {
  if (!childService) {
    childService = new ChildService();
  }
  return childService;
}
