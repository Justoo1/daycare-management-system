import { AppDataSource } from '@config/database';
import { Attendance } from '@models/Attendance';
import { Child } from '@models/Child';
import { AttendanceStatus } from '@shared';
import { Repository, IsNull, Between } from 'typeorm';

export class AttendanceService {
  private attendanceRepository: Repository<Attendance>;
  private childRepository: Repository<Child>;

  constructor() {
    this.attendanceRepository = AppDataSource.getRepository(Attendance);
    this.childRepository = AppDataSource.getRepository(Child);
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

    // Check if late arrival (assuming school starts at 8:00 AM)
    const checkInHour = parseInt(data.checkInTime.split(':')[0]);
    if (checkInHour > 8) {
      attendance.isLateArrival = true;
      attendance.lateMinutes = (checkInHour - 8) * 60;
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

    // Check if early pick-up (assuming pickup is after 3:00 PM)
    const checkOutHour = parseInt(data.checkOutTime.split(':')[0]);
    if (checkOutHour < 15) {
      attendance.isEarlyPickup = true;
      attendance.earlyMinutes = (15 - checkOutHour) * 60;
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

    let attendance = await this.attendanceRepository.findOne({
      where: { tenantId, centerId, childId, date },
    });

    if (!attendance) {
      attendance = this.attendanceRepository.create({
        tenantId,
        centerId,
        childId,
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
    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.tenantId = :tenantId AND attendance.childId = :childId', {
        tenantId,
        childId,
      });

    if (options?.startDate) {
      query.andWhere('attendance.date >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      query.andWhere('attendance.date <= :endDate', { endDate: options.endDate });
    }

    return query
      .orderBy('attendance.date', 'DESC')
      .skip(options?.skip || 0)
      .take(options?.take || 30)
      .getManyAndCount();
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
}

let attendanceService: AttendanceService;

export function getAttendanceService(): AttendanceService {
  if (!attendanceService) {
    attendanceService = new AttendanceService();
  }
  return attendanceService;
}
