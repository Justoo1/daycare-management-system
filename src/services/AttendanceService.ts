import { AppDataSource } from '@config/database';
import { Attendance } from '@models/Attendance';
import { Child } from '@models/Child';
import { Class } from '@models/Class';
import { PendingCheckout, CheckoutOTPStatus } from '@models/PendingCheckout';
import { AttendanceStatus } from '@shared';
import { Repository, IsNull, Between } from 'typeorm';
import { getNotificationService } from './NotificationService';

export class AttendanceService {
  private attendanceRepository: Repository<Attendance>;
  private childRepository: Repository<Child>;
  private classRepository: Repository<Class>;
  private pendingCheckoutRepository: Repository<PendingCheckout>;

  constructor() {
    this.attendanceRepository = AppDataSource.getRepository(Attendance);
    this.childRepository = AppDataSource.getRepository(Child);
    this.classRepository = AppDataSource.getRepository(Class);
    this.pendingCheckoutRepository = AppDataSource.getRepository(PendingCheckout);
  }

  /**
   * Generate a 6-digit OTP code
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Parse time string (HH:MM) to minutes since midnight
   */
  private parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Calculate late minutes based on class start time
   */
  private calculateLateMinutes(checkInTime: string, classStartTime: string): number {
    const checkInMinutes = this.parseTimeToMinutes(checkInTime);
    const startMinutes = this.parseTimeToMinutes(classStartTime);
    return Math.max(0, checkInMinutes - startMinutes);
  }

  /**
   * Calculate early pickup minutes based on class end time
   */
  private calculateEarlyMinutes(checkOutTime: string, classEndTime: string): number {
    const checkOutMinutes = this.parseTimeToMinutes(checkOutTime);
    const endMinutes = this.parseTimeToMinutes(classEndTime);
    return Math.max(0, endMinutes - checkOutMinutes);
  }

  /**
   * Record check-in for child
   */
  async checkIn(
    tenantId: string,
    centerId: string,
    childId: string,
    data: {
      classId?: string;
      checkInTime: string;
      checkInPhotoUrl?: string;
      temperature?: number;
      healthNotes?: string;
      notes?: string;
      checkedInByUserId?: string;
    },
    staffClassId?: string
  ): Promise<Attendance> {
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    // Validate staff can only check-in children from their assigned class
    if (staffClassId && data.classId && staffClassId !== data.classId) {
      throw new Error('This child is not in your assigned class');
    }

    // Check if already checked in today
    const existingAttendance = await this.attendanceRepository.findOne({
      where: {
        tenantId,
        centerId,
        childId,
        date,
      },
    });

    if (existingAttendance && existingAttendance.checkInTime) {
      throw new Error('Child already checked in today');
    }

    let attendance: Attendance;

    if (existingAttendance) {
      attendance = existingAttendance;
    } else {
      attendance = this.attendanceRepository.create({
        tenantId,
        centerId,
        childId,
        classId: data.classId,
        date,
      });
    }

    // Set classId if provided (for updates to existing records)
    if (data.classId) {
      attendance.classId = data.classId;
    }

    attendance.status = AttendanceStatus.PRESENT;
    attendance.checkInTime = data.checkInTime;
    if (data.checkInPhotoUrl) attendance.checkInPhotoUrl = data.checkInPhotoUrl;
    if (data.temperature !== undefined) attendance.temperature = data.temperature;
    if (data.healthNotes) attendance.healthNotes = data.healthNotes;
    if (data.notes) attendance.notes = data.notes;
    if (data.checkedInByUserId) attendance.checkedInByUserId = data.checkedInByUserId;

    // Get class start time for late arrival calculation
    let classStartTime = '08:00'; // Default to 8:00 AM if no class configured
    if (data.classId) {
      const classInfo = await this.classRepository.findOne({
        where: { id: data.classId, tenantId },
        select: ['startTime'],
      });
      if (classInfo?.startTime) {
        classStartTime = classInfo.startTime;
      }
    }

    // Check if late arrival based on class start time
    const lateMinutes = this.calculateLateMinutes(data.checkInTime, classStartTime);
    if (lateMinutes > 0) {
      attendance.isLateArrival = true;
      attendance.lateMinutes = lateMinutes;
      attendance.status = AttendanceStatus.LATE;
    }

    return this.attendanceRepository.save(attendance);
  }

  /**
   * Record check-out for child
   */
  async checkOut(
    tenantId: string,
    centerId: string,
    childId: string,
    data: {
      checkOutTime: string;
      checkOutPhotoUrl?: string;
      notes?: string;
      checkedOutByUserId?: string;
      checkedOutByName?: string;
      checkedOutByRelationship?: string;
    },
    staffClassId?: string
  ): Promise<Attendance> {
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    const attendance = await this.attendanceRepository.findOne({
      where: {
        tenantId,
        centerId,
        childId,
        date,
      },
    });

    if (!attendance) {
      throw new Error('No check-in record found for today');
    }

    // Validate staff can only check-out children from their assigned class
    if (staffClassId && attendance.classId && staffClassId !== attendance.classId) {
      throw new Error('This child is not in your assigned class');
    }

    // Validate pickup authorization if pickup person name is provided
    if (data.checkedOutByName && data.checkedOutByRelationship) {
      // Fetch child with relations to check authorized pickup persons
      const child = await this.childRepository.findOne({
        where: { id: childId, tenantId, deletedAt: IsNull() },
        relations: ['guardians'],
      });

      if (!child) {
        throw new Error('Child not found');
      }

      const isAuthorized = this.validatePickupAuthorization(
        child,
        data.checkedOutByName,
        data.checkedOutByRelationship
      );

      if (!isAuthorized) {
        throw new Error(
          `Unauthorized pickup attempt. ${data.checkedOutByName} (${data.checkedOutByRelationship}) is not authorized to pick up ${child.firstName} ${child.lastName}. Please contact the center administrator.`
        );
      }
    }

    attendance.checkOutTime = data.checkOutTime;
    if (data.checkOutPhotoUrl) attendance.checkOutPhotoUrl = data.checkOutPhotoUrl;
    if (data.notes) attendance.notes = data.notes;
    if (data.checkedOutByUserId) attendance.checkedOutByUserId = data.checkedOutByUserId;
    if (data.checkedOutByName) attendance.checkedOutByName = data.checkedOutByName;
    if (data.checkedOutByRelationship) attendance.checkedOutByRelationship = data.checkedOutByRelationship;

    // Get class end time for early pickup calculation
    let classEndTime = '15:00'; // Default to 3:00 PM if no class configured
    if (attendance.classId) {
      const classInfo = await this.classRepository.findOne({
        where: { id: attendance.classId, tenantId },
        select: ['endTime'],
      });
      if (classInfo?.endTime) {
        classEndTime = classInfo.endTime;
      }
    }

    // Check if early pick-up based on class end time
    const earlyMinutes = this.calculateEarlyMinutes(data.checkOutTime, classEndTime);
    if (earlyMinutes > 0) {
      attendance.isEarlyPickup = true;
      attendance.earlyMinutes = earlyMinutes;
      attendance.status = AttendanceStatus.EARLY_PICKUP;
    }

    return this.attendanceRepository.save(attendance);
  }

  /**
   * Check-in using QR code
   */
  async checkInByQRCode(
    tenantId: string,
    centerId: string,
    qrCode: string,
    data: {
      checkInTime: string;
      temperature?: number;
      healthNotes?: string;
      checkInPhotoUrl?: string;
      notes?: string;
      checkedInByUserId?: string;
    },
    staffClassId?: string
  ): Promise<{ attendance: Attendance; child: Child }> {
    // Find child by QR code
    const child = await this.childRepository.findOne({
      where: { qrCode, tenantId, deletedAt: IsNull() },
      relations: ['guardians', 'class'],
    });

    if (!child) {
      throw new Error('Invalid QR code or child not found');
    }

    // Use the passed centerId parameter and pass staffClassId for validation
    const attendance = await this.checkIn(tenantId, centerId, child.id, {
      ...data,
      classId: child.classId,
    }, staffClassId);

    return { attendance, child };
  }

  /**
   * Check-out using QR code with pickup authorization validation
   */
  async checkOutByQRCode(
    tenantId: string,
    centerId: string,
    qrCode: string,
    data: {
      checkOutTime: string;
      checkOutPhotoUrl?: string;
      notes?: string;
      checkedOutByUserId?: string;
      checkedOutByName: string;
      checkedOutByRelationship: string;
    },
    staffClassId?: string
  ): Promise<{ attendance: Attendance; child: Child }> {
    // Find child by QR code
    const child = await this.childRepository.findOne({
      where: { qrCode, tenantId, deletedAt: IsNull() },
      relations: ['guardians', 'class'],
    });

    if (!child) {
      throw new Error('Invalid QR code or child not found');
    }

    // Validate pickup authorization
    const isAuthorized = this.validatePickupAuthorization(child, data.checkedOutByName, data.checkedOutByRelationship);

    if (!isAuthorized) {
      throw new Error(
        `Unauthorized pickup attempt. ${data.checkedOutByName} (${data.checkedOutByRelationship}) is not authorized to pick up ${child.firstName} ${child.lastName}. Please contact the center administrator.`
      );
    }

    // Proceed with check-out and pass staffClassId for validation
    const attendance = await this.checkOut(tenantId, centerId, child.id, data, staffClassId);

    return { attendance, child };
  }

  /**
   * Validate if a person is authorized to pick up the child
   */
  private validatePickupAuthorization(
    child: Child,
    pickupPersonName: string,
    _pickupPersonRelationship: string
  ): boolean {
    // Check if the person is in the guardians list and authorized for pickup
    if (child.guardians && child.guardians.length > 0) {
      const authorizedGuardian = child.guardians.find(guardian => {
        const guardianName = guardian.getFullName();
        const isNameMatch = guardianName.toLowerCase().trim() === pickupPersonName.toLowerCase().trim();
        const canPickup = guardian.isAuthorizedPickup;

        return isNameMatch && canPickup;
      });

      if (authorizedGuardian) {
        return true;
      }
    }

    // Check if the person is in the authorizedPickupPersons array
    if (child.authorizedPickupPersons && child.authorizedPickupPersons.length > 0) {
      const isInAuthorizedList = child.authorizedPickupPersons.some(
        person => person.toLowerCase().trim() === pickupPersonName.toLowerCase().trim()
      );

      if (isInAuthorizedList) {
        return true;
      }
    }

    return false;
  }

  /**
   * Record absence
   */
  async recordAbsence(
    tenantId: string,
    centerId: string,
    childId: string,
    data: {
      date: Date;
      reason?: string;
    }
  ): Promise<Attendance> {
    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    // Check for existing attendance record
    const existingAttendance = await this.attendanceRepository.findOne({
      where: { tenantId, centerId, childId, date },
    });

    // Validate - cannot mark absent if already checked in
    if (existingAttendance && existingAttendance.checkInTime) {
      throw new Error('Cannot mark as absent - child has already checked in today');
    }

    // Validate - cannot mark absent if already marked absent
    if (existingAttendance && existingAttendance.status === AttendanceStatus.ABSENT) {
      throw new Error('Child is already marked as absent for today');
    }

    let attendance: Attendance;
    if (existingAttendance) {
      attendance = existingAttendance;
    } else {
      // Get child's classId for the attendance record
      const child = await this.childRepository.findOne({
        where: { id: childId, tenantId },
        select: ['classId'],
      });

      attendance = this.attendanceRepository.create({
        tenantId,
        centerId,
        childId,
        classId: child?.classId,
        date,
      });
    }

    attendance.status = AttendanceStatus.ABSENT;
    if (data.reason) attendance.absenceReason = data.reason;

    return this.attendanceRepository.save(attendance);
  }

  /**
   * Get attendance record for a specific date
   */
  async getAttendanceByDate(
    tenantId: string,
    childId: string,
    date: Date
  ): Promise<Attendance | null> {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    return this.attendanceRepository.findOne({
      where: { tenantId, childId, date: dateOnly },
    });
  }

  /**
   * Get attendance history for a child
   */
  async getAttendanceHistory(
    tenantId: string,
    childId: string,
    options?: { skip: number; take: number; startDate?: Date; endDate?: Date }
  ): Promise<[Attendance[], number]> {
    console.log('[AttendanceService] getAttendanceHistory called:', {
      tenantId,
      childId,
      startDate: options?.startDate?.toISOString(),
      endDate: options?.endDate?.toISOString(),
    });

    // First, let's see all attendance records for this child (without date filter)
    const allRecordsForChild = await this.attendanceRepository.find({
      where: { tenantId, childId },
      order: { date: 'DESC' },
      take: 10,
    });
    console.log('[AttendanceService] All records for child (no date filter):',
      allRecordsForChild.map(r => ({ id: r.id, date: r.date, status: r.status }))
    );

    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.tenantId = :tenantId AND attendance.childId = :childId', {
        tenantId,
        childId,
      });

    if (options?.startDate) {
      // Format date as YYYY-MM-DD string for proper comparison
      const startDateStr = options.startDate.toISOString().split('T')[0];
      console.log('[AttendanceService] Filtering by startDate:', startDateStr);
      query.andWhere('attendance.date >= :startDate', { startDate: startDateStr });
    }

    if (options?.endDate) {
      // Format date as YYYY-MM-DD string for proper comparison
      const endDateStr = options.endDate.toISOString().split('T')[0];
      console.log('[AttendanceService] Filtering by endDate:', endDateStr);
      query.andWhere('attendance.date <= :endDate', { endDate: endDateStr });
    }

    const result = await query
      .orderBy('attendance.date', 'DESC')
      .skip(options?.skip || 0)
      .take(options?.take || 30)
      .getManyAndCount();

    console.log('[AttendanceService] Query result count:', result[1]);
    return result;
  }

  /**
   * Get class attendance for a specific date
   */
  async getClassAttendance(
    tenantId: string,
    classId: string,
    date: Date
  ): Promise<Attendance[]> {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    return this.attendanceRepository.find({
      where: { tenantId, classId, date: dateOnly },
      relations: ['child'],
      order: { child: { firstName: 'ASC' } },
    });
  }

  /**
   * Get center attendance for a specific date
   */
  async getCenterAttendance(
    tenantId: string,
    centerId: string,
    date: Date
  ): Promise<Attendance[]> {
    // Format date as YYYY-MM-DD for date-only comparison
    const dateStr = date.toISOString().split('T')[0];

    const records = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.child', 'child')
      .where('attendance.tenantId = :tenantId', { tenantId })
      .andWhere('attendance.centerId = :centerId', { centerId })
      .andWhere('attendance.date = :date', { date: dateStr })
      .orderBy('child.firstName', 'ASC')
      .getMany();

    console.log('getCenterAttendance - Records found with exact match:', records.length);
    if (records.length > 0) {
      console.log('getCenterAttendance - Sample record:', {
        childId: records[0].childId,
        date: records[0].date,
        checkInTime: records[0].checkInTime,
        checkOutTime: records[0].checkOutTime
      });
    }

    return records;
  }

  /**
   * Get daily attendance summary for center
   */
  async getDailyAttendanceSummary(
    tenantId: string,
    centerId: string,
    date: Date
  ): Promise<{
    total: number;
    present: number;
    absent: number;
    late: number;
    earlyPickup: number;
  }> {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const records = await this.attendanceRepository.find({
      where: { tenantId, centerId, date: dateOnly },
    });

    return {
      total: records.length,
      present: records.filter(r => r.status === AttendanceStatus.PRESENT).length,
      absent: records.filter(r => r.status === AttendanceStatus.ABSENT).length,
      late: records.filter(r => r.status === AttendanceStatus.LATE).length,
      earlyPickup: records.filter(r => r.status === AttendanceStatus.EARLY_PICKUP).length,
    };
  }

  /**
   * Get attendance pattern analysis
   */
  async getAttendancePattern(
    tenantId: string,
    childId: string,
    daysCount: number = 30
  ): Promise<{
    presentDays: number;
    absentDays: number;
    attendancePercentage: number;
    lastCheckIn: Date | null;
    lastCheckOut: Date | null;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysCount);

    const records = await this.attendanceRepository.find({
      where: { tenantId, childId },
      order: { date: 'DESC' },
    });

    const recentRecords = records.filter(r => r.date >= startDate);

    const presentDays = recentRecords.filter(
      r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE
    ).length;

    const absentDays = recentRecords.filter(r => r.status === AttendanceStatus.ABSENT)
      .length;

    const totalDays = presentDays + absentDays;

    return {
      presentDays,
      absentDays,
      attendancePercentage: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
      lastCheckIn: records.find(r => r.checkInTime)?.date || null,
      lastCheckOut: records.find(r => r.checkOutTime)?.date || null,
    };
  }

  /**
   * Mark absence with automatic parent notification flag
   */
  async recordAbsenceWithNotification(
    tenantId: string,
    centerId: string,
    childId: string,
    data: {
      date: Date;
      reason?: string;
      notifyParent?: boolean;
    }
  ): Promise<Attendance> {
    const attendance = await this.recordAbsence(tenantId, centerId, childId, data);

    if (data.notifyParent) {
      attendance.parentNotified = true;
      attendance.parentNotifiedAt = new Date();
    }

    return this.attendanceRepository.save(attendance);
  }

  /**
   * Initiate secure checkout with OTP verification
   * Sends OTP to the pickup person's phone
   */
  async initiateSecureCheckout(
    tenantId: string,
    centerId: string,
    childId: string,
    data: {
      pickupPersonName: string;
      pickupPersonRelationship: string;
      checkOutTime: string;
      checkOutPhotoUrl?: string;
      notes?: string;
    },
    initiatedByUserId: string,
    staffClassId?: string
  ): Promise<{ pendingCheckout: PendingCheckout; child: Child }> {
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    // Find today's attendance record
    const attendance = await this.attendanceRepository.findOne({
      where: {
        tenantId,
        centerId,
        childId,
        date,
      },
    });

    if (!attendance) {
      throw new Error('No check-in record found for today');
    }

    if (attendance.checkOutTime) {
      throw new Error('Child has already been checked out today');
    }

    // Validate staff can only checkout children from their assigned class
    if (staffClassId && attendance.classId && staffClassId !== attendance.classId) {
      throw new Error('This child is not in your assigned class');
    }

    // Fetch child with guardians
    const child = await this.childRepository.findOne({
      where: { id: childId, tenantId, deletedAt: IsNull() },
      relations: ['guardians'],
    });

    if (!child) {
      throw new Error('Child not found');
    }

    // Find the pickup person in guardians to get their phone number
    const pickupPerson = child.guardians?.find(guardian => {
      const guardianName = guardian.getFullName();
      return guardianName.toLowerCase().trim() === data.pickupPersonName.toLowerCase().trim();
    });

    if (!pickupPerson) {
      throw new Error(
        `${data.pickupPersonName} is not found in the child's guardian list. Please verify the pickup person.`
      );
    }

    if (!pickupPerson.isAuthorizedPickup) {
      throw new Error(
        `Unauthorized pickup attempt. ${data.pickupPersonName} (${data.pickupPersonRelationship}) is not authorized to pick up ${child.firstName} ${child.lastName}. Please contact the center administrator.`
      );
    }

    if (!pickupPerson.phoneNumber) {
      throw new Error(
        `No phone number on file for ${data.pickupPersonName}. Cannot send verification code.`
      );
    }

    // Expire any existing pending checkouts for this child
    await this.pendingCheckoutRepository.update(
      { childId, tenantId, status: CheckoutOTPStatus.PENDING },
      { status: CheckoutOTPStatus.EXPIRED }
    );

    // Generate OTP and create pending checkout
    const otpCode = this.generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP valid for 10 minutes

    const pendingCheckout = this.pendingCheckoutRepository.create({
      tenantId,
      centerId,
      childId,
      attendanceId: attendance.id,
      otpCode,
      status: CheckoutOTPStatus.PENDING,
      pickupPersonName: data.pickupPersonName,
      pickupPersonRelationship: data.pickupPersonRelationship,
      pickupPersonPhone: pickupPerson.phoneNumber,
      initiatedByUserId,
      expiresAt,
      checkOutTime: data.checkOutTime,
      checkOutPhotoUrl: data.checkOutPhotoUrl,
      notes: data.notes,
    });

    await this.pendingCheckoutRepository.save(pendingCheckout);

    // Send OTP to pickup person's phone
    try {
      const notificationService = getNotificationService();
      const message = `Nkabom Pickup Verification: Your code to pick up ${child.firstName} ${child.lastName} is ${otpCode}. Valid for 10 minutes. Please give this code to the staff member.`;
      await notificationService.sendSMS({
        recipient: pickupPerson.phoneNumber,
        message,
      });
    } catch (error) {
      console.error('Failed to send checkout OTP:', error);
      // Delete the pending checkout since we couldn't send the OTP
      await this.pendingCheckoutRepository.delete(pendingCheckout.id);
      throw new Error('Failed to send verification code. Please try again.');
    }

    return { pendingCheckout, child };
  }

  /**
   * Initiate secure checkout via QR code with OTP verification
   * Sends OTP to the pickup person's phone
   */
  async initiateSecureCheckoutByQRCode(
    tenantId: string,
    centerId: string,
    qrCode: string,
    data: {
      pickupPersonName: string;
      pickupPersonRelationship: string;
      checkOutTime: string;
      checkOutPhotoUrl?: string;
      notes?: string;
    },
    initiatedByUserId: string,
    staffClassId?: string
  ): Promise<{ pendingCheckout: PendingCheckout; child: Child }> {
    // Find child by QR code
    const child = await this.childRepository.findOne({
      where: { qrCode, tenantId, deletedAt: IsNull() },
      relations: ['guardians', 'class'],
    });

    if (!child) {
      throw new Error('Invalid QR code or child not found');
    }

    // Use the existing initiateSecureCheckout method with the found childId
    return this.initiateSecureCheckout(
      tenantId,
      centerId,
      child.id,
      data,
      initiatedByUserId,
      staffClassId
    );
  }

  /**
   * Verify OTP and complete checkout
   */
  async verifyCheckoutOTP(
    tenantId: string,
    pendingCheckoutId: string,
    otpCode: string,
    verifiedByUserId: string
  ): Promise<{ success: boolean; attendance?: Attendance; child?: Child; error?: string; remainingAttempts?: number }> {
    const pendingCheckout = await this.pendingCheckoutRepository.findOne({
      where: { id: pendingCheckoutId, tenantId },
      relations: ['child', 'attendance'],
    });

    if (!pendingCheckout) {
      return { success: false, error: 'Checkout request not found' };
    }

    // Check if already processed
    if (pendingCheckout.status !== CheckoutOTPStatus.PENDING) {
      if (pendingCheckout.status === CheckoutOTPStatus.FAILED) {
        return {
          success: false,
          error: 'Maximum verification attempts exceeded. This checkout request has been blocked. Please initiate a new checkout.'
        };
      }
      return { success: false, error: `Checkout request has already been ${pendingCheckout.status}` };
    }

    // Check if expired
    if (pendingCheckout.isExpired()) {
      pendingCheckout.status = CheckoutOTPStatus.EXPIRED;
      await this.pendingCheckoutRepository.save(pendingCheckout);
      return { success: false, error: 'Verification code has expired. Please initiate a new checkout.' };
    }

    // Check if max attempts already exceeded (from previous attempts)
    if (pendingCheckout.isMaxAttemptsExceeded()) {
      pendingCheckout.status = CheckoutOTPStatus.FAILED;
      await this.pendingCheckoutRepository.save(pendingCheckout);
      return {
        success: false,
        error: `Maximum verification attempts exceeded. Please initiate a new checkout.`,
      };
    }

    // Verify OTP FIRST, before incrementing attempt count
    // This allows correct code entry even on the last attempt
    if (!pendingCheckout.verifyOTP(otpCode)) {
      // Only increment attempt count on failed verification
      pendingCheckout.attemptCount += 1;

      // Check if this failed attempt exceeded max attempts
      if (pendingCheckout.isMaxAttemptsExceeded()) {
        pendingCheckout.status = CheckoutOTPStatus.FAILED;
        await this.pendingCheckoutRepository.save(pendingCheckout);
        return {
          success: false,
          error: `Maximum verification attempts exceeded. Possible unauthorized pickup attempt for ${pendingCheckout.child.firstName} ${pendingCheckout.child.lastName}. Please contact the administrator.`,
        };
      }

      await this.pendingCheckoutRepository.save(pendingCheckout);
      const remainingAttempts = pendingCheckout.maxAttempts - pendingCheckout.attemptCount;
      return {
        success: false,
        error: `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`,
        remainingAttempts,
      };
    }

    // OTP verified - complete checkout
    pendingCheckout.status = CheckoutOTPStatus.VERIFIED;
    pendingCheckout.verifiedAt = new Date();
    await this.pendingCheckoutRepository.save(pendingCheckout);

    // Update attendance record
    const attendance = pendingCheckout.attendance;
    attendance.checkOutTime = pendingCheckout.checkOutTime;
    attendance.checkOutPhotoUrl = pendingCheckout.checkOutPhotoUrl;
    attendance.checkedOutByUserId = verifiedByUserId;
    attendance.checkedOutByName = pendingCheckout.pickupPersonName;
    attendance.checkedOutByRelationship = pendingCheckout.pickupPersonRelationship;
    attendance.notes = pendingCheckout.notes || attendance.notes;

    // Calculate early pickup if applicable
    if (attendance.classId) {
      const classEntity = await this.classRepository.findOne({
        where: { id: attendance.classId },
      });
      if (classEntity && classEntity.endTime) {
        const earlyMinutes = this.calculateEarlyMinutes(attendance.checkOutTime, classEntity.endTime);
        attendance.isEarlyPickup = earlyMinutes > 0;
        attendance.earlyMinutes = earlyMinutes;
      }
    }

    await this.attendanceRepository.save(attendance);

    // Send checkout notification to parent
    try {
      const notificationService = getNotificationService();
      await notificationService.sendCheckOutNotification(
        pendingCheckout.pickupPersonPhone,
        `${pendingCheckout.child.firstName} ${pendingCheckout.child.lastName}`,
        pendingCheckout.checkOutTime
      );
    } catch (error) {
      console.error('Failed to send checkout notification:', error);
    }

    return {
      success: true,
      attendance,
      child: pendingCheckout.child,
    };
  }

  /**
   * Get pending checkout by ID
   */
  async getPendingCheckout(
    tenantId: string,
    pendingCheckoutId: string
  ): Promise<PendingCheckout | null> {
    return this.pendingCheckoutRepository.findOne({
      where: { id: pendingCheckoutId, tenantId },
      relations: ['child', 'attendance'],
    });
  }

  /**
   * Cancel a pending checkout
   */
  async cancelPendingCheckout(
    tenantId: string,
    pendingCheckoutId: string
  ): Promise<void> {
    await this.pendingCheckoutRepository.update(
      { id: pendingCheckoutId, tenantId, status: CheckoutOTPStatus.PENDING },
      { status: CheckoutOTPStatus.EXPIRED }
    );
  }

  /**
   * Resend OTP for pending checkout
   */
  async resendCheckoutOTP(
    tenantId: string,
    pendingCheckoutId: string
  ): Promise<{ success: boolean; expiresAt?: Date; error?: string }> {
    const pendingCheckout = await this.pendingCheckoutRepository.findOne({
      where: { id: pendingCheckoutId, tenantId, status: CheckoutOTPStatus.PENDING },
      relations: ['child'],
    });

    if (!pendingCheckout) {
      return { success: false, error: 'Pending checkout not found or already processed' };
    }

    // Generate new OTP and extend expiry
    const newOtpCode = this.generateOTP();
    const newExpiresAt = new Date();
    newExpiresAt.setMinutes(newExpiresAt.getMinutes() + 10);

    pendingCheckout.otpCode = newOtpCode;
    pendingCheckout.expiresAt = newExpiresAt;
    pendingCheckout.attemptCount = 0; // Reset attempt count on resend

    await this.pendingCheckoutRepository.save(pendingCheckout);

    // Send new OTP
    try {
      const notificationService = getNotificationService();
      const message = `Nkabom Pickup Verification: Your new code to pick up ${pendingCheckout.child.firstName} ${pendingCheckout.child.lastName} is ${newOtpCode}. Valid for 10 minutes.`;
      await notificationService.sendSMS({
        recipient: pendingCheckout.pickupPersonPhone,
        message,
      });
      return { success: true, expiresAt: newExpiresAt };
    } catch (error) {
      console.error('Failed to resend checkout OTP:', error);
      return { success: false, error: 'Failed to send verification code' };
    }
  }
}

let attendanceService: AttendanceService;

export function getAttendanceService(): AttendanceService {
  if (!attendanceService) {
    attendanceService = new AttendanceService();
  }
  return attendanceService;
}
