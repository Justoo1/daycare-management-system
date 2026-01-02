import { AppDataSource } from '@config/database';
import { StaffAttendance } from '@models/StaffAttendance';
import { StaffProfile } from '@models/StaffProfile';
import { Center } from '@models/Center';
import { StaffAttendanceStatus } from '@shared';
import { Repository, Between } from 'typeorm';

export class StaffAttendanceService {
  private attendanceRepository: Repository<StaffAttendance>;
  private staffRepository: Repository<StaffProfile>;
  private centerRepository: Repository<Center>;

  constructor() {
    this.attendanceRepository = AppDataSource.getRepository(StaffAttendance);
    this.staffRepository = AppDataSource.getRepository(StaffProfile);
    this.centerRepository = AppDataSource.getRepository(Center);
  }

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   * Returns distance in meters
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Verify if staff is within geofence radius of the center
   */
  async verifyLocation(
    staffId: string,
    latitude: number,
    longitude: number
  ): Promise<{ valid: boolean; distance?: number; message?: string }> {
    const staff = await this.staffRepository.findOne({
      where: { id: staffId },
      relations: ['center'],
    });

    if (!staff) {
      return { valid: false, message: 'Staff not found' };
    }

    const center = await this.centerRepository.findOne({
      where: { id: staff.centerId },
    });

    if (!center || !center.latitude || !center.longitude) {
      // If center has no geofence configured, allow check-in
      return { valid: true, message: 'No geofence configured' };
    }

    const distance = this.calculateDistance(
      latitude,
      longitude,
      center.latitude,
      center.longitude
    );

    const geofenceRadius = center.geofenceRadius || 100; // Default 100 meters

    if (distance <= geofenceRadius) {
      return { valid: true, distance };
    } else {
      return {
        valid: false,
        distance,
        message: `You are ${Math.round(distance)}m away from the center. You must be within ${geofenceRadius}m to check in.`,
      };
    }
  }

  /**
   * Record staff attendance (check-in) with optional location verification
   */
  async recordCheckIn(
    tenantId: string,
    staffId: string,
    attendanceDate: Date,
    checkInTime: string,
    notes?: string,
    latitude?: number,
    longitude?: number
  ): Promise<StaffAttendance> {
    // Verify location if coordinates provided
    if (latitude !== undefined && longitude !== undefined) {
      const locationCheck = await this.verifyLocation(staffId, latitude, longitude);
      if (!locationCheck.valid) {
        throw new Error(locationCheck.message || 'Location verification failed');
      }
    }

    // Check if attendance already exists for today
    const existing = await this.attendanceRepository.findOne({
      where: {
        tenantId,
        staffId,
        attendanceDate,
      },
    });

    if (existing) {
      throw new Error('Attendance already recorded for this date');
    }

    const attendance = this.attendanceRepository.create({
      tenantId,
      staffId,
      attendanceDate,
      checkInTime,
      status: StaffAttendanceStatus.PRESENT,
      notes,
      isActive: true,
    });

    // Auto-update status based on time
    attendance.updateStatus();

    return this.attendanceRepository.save(attendance);
  }

  /**
   * Record check-in via QR code scan
   */
  async recordCheckInByQRCode(
    qrCode: string,
    latitude: number,
    longitude: number
  ): Promise<StaffAttendance> {
    // Find staff by QR code
    const staff = await this.staffRepository.findOne({
      where: { qrCode, isActive: true },
    });

    if (!staff) {
      throw new Error('Invalid QR code or staff not found');
    }

    // Verify location
    const locationCheck = await this.verifyLocation(staff.id, latitude, longitude);
    if (!locationCheck.valid) {
      throw new Error(locationCheck.message || 'You must be at the center to check in');
    }

    // Get current time and date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const checkInTime = `${hours}:${minutes}`;

    return this.recordCheckIn(
      staff.tenantId,
      staff.id,
      today,
      checkInTime,
      `Checked in via QR code at ${Math.round(locationCheck.distance || 0)}m from center`
    );
  }

  /**
   * Record check-out
   */
  async recordCheckOut(
    tenantId: string,
    attendanceId: string,
    checkOutTime: string,
    breakDuration?: number
  ): Promise<StaffAttendance> {
    const attendance = await this.getAttendanceById(tenantId, attendanceId);

    if (!attendance) {
      throw new Error('Attendance record not found');
    }

    if (!attendance.checkInTime) {
      throw new Error('Cannot check out without checking in first');
    }

    if (attendance.checkOutTime) {
      throw new Error('Already checked out');
    }

    attendance.checkOutTime = checkOutTime;
    if (breakDuration !== undefined) {
      attendance.breakDuration = breakDuration;
    }

    // Calculate total hours
    const totalHours = attendance.calculateTotalHours();
    if (totalHours !== null) {
      attendance.totalHours = totalHours;
    }

    // Update status
    attendance.updateStatus();

    return this.attendanceRepository.save(attendance);
  }

  /**
   * Record check-out via QR code scan
   */
  async recordCheckOutByQRCode(
    qrCode: string,
    latitude: number,
    longitude: number,
    breakDuration?: number
  ): Promise<StaffAttendance> {
    // Find staff by QR code
    const staff = await this.staffRepository.findOne({
      where: { qrCode, isActive: true },
    });

    if (!staff) {
      throw new Error('Invalid QR code or staff not found');
    }

    // Verify location
    const locationCheck = await this.verifyLocation(staff.id, latitude, longitude);
    if (!locationCheck.valid) {
      throw new Error(locationCheck.message || 'You must be at the center to check out');
    }

    // Find today's attendance record
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const attendance = await this.getAttendanceByStaffAndDate(
      staff.tenantId,
      staff.id,
      todayDate
    );

    if (!attendance) {
      throw new Error('No check-in record found for today');
    }

    if (attendance.checkOutTime) {
      throw new Error('Already checked out');
    }

    // Get current time
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    const checkOutTime = `${hours}:${minutes}`;

    return this.recordCheckOut(
      staff.tenantId,
      attendance.id,
      checkOutTime,
      breakDuration
    );
  }

  /**
   * Mark staff as absent
   */
  async markAbsent(
    tenantId: string,
    staffId: string,
    attendanceDate: Date,
    notes?: string
  ): Promise<StaffAttendance> {
    const attendance = this.attendanceRepository.create({
      tenantId,
      staffId,
      attendanceDate,
      status: StaffAttendanceStatus.ABSENT,
      notes,
      isActive: true,
    });

    return this.attendanceRepository.save(attendance);
  }

  /**
   * Mark staff on leave
   */
  async markOnLeave(
    tenantId: string,
    staffId: string,
    attendanceDate: Date,
    leaveType: 'on_leave' | 'sick_leave',
    notes?: string
  ): Promise<StaffAttendance> {
    const status = leaveType === 'sick_leave'
      ? StaffAttendanceStatus.SICK_LEAVE
      : StaffAttendanceStatus.ON_LEAVE;

    const attendance = this.attendanceRepository.create({
      tenantId,
      staffId,
      attendanceDate,
      status,
      notes,
      isActive: true,
    });

    return this.attendanceRepository.save(attendance);
  }

  /**
   * Get attendance by ID
   */
  async getAttendanceById(tenantId: string, attendanceId: string): Promise<StaffAttendance | null> {
    return this.attendanceRepository.findOne({
      where: { id: attendanceId, tenantId },
      relations: ['staff'],
    });
  }

  /**
   * Get attendance by staff and date
   */
  async getAttendanceByStaffAndDate(
    tenantId: string,
    staffId: string,
    attendanceDate: Date
  ): Promise<StaffAttendance | null> {
    return this.attendanceRepository.findOne({
      where: { tenantId, staffId, attendanceDate, isActive: true },
      relations: ['staff'],
    });
  }

  /**
   * Get attendance records for a staff member
   */
  async getAttendanceByStaff(
    tenantId: string,
    staffId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<StaffAttendance[]> {
    const where: any = { tenantId, staffId, isActive: true };

    if (startDate && endDate) {
      where.attendanceDate = Between(startDate, endDate);
    }

    return this.attendanceRepository.find({
      where,
      relations: ['staff'],
      order: { attendanceDate: 'DESC' },
    });
  }

  /**
   * Get attendance records for a date
   */
  async getAttendanceByDate(tenantId: string, date: Date): Promise<StaffAttendance[]> {
    return this.attendanceRepository.find({
      where: { tenantId, attendanceDate: date, isActive: true },
      relations: ['staff'],
      order: { checkInTime: 'ASC' },
    });
  }

  /**
   * Update attendance record
   */
  async updateAttendance(
    tenantId: string,
    attendanceId: string,
    data: Partial<StaffAttendance>
  ): Promise<StaffAttendance> {
    const attendance = await this.getAttendanceById(tenantId, attendanceId);

    if (!attendance) {
      throw new Error('Attendance record not found');
    }

    // Don't allow updating these fields
    const { tenantId: _, id: __, staffId, attendanceDate, ...updateData } = data as any;

    Object.assign(attendance, updateData);

    // Recalculate total hours if times changed
    if (updateData.checkInTime || updateData.checkOutTime || updateData.breakDuration !== undefined) {
      const totalHours = attendance.calculateTotalHours();
      if (totalHours !== null) {
        attendance.totalHours = totalHours;
      }
      attendance.updateStatus();
    }

    return this.attendanceRepository.save(attendance);
  }

  /**
   * Delete attendance record (soft delete)
   */
  async deleteAttendance(tenantId: string, attendanceId: string): Promise<void> {
    const attendance = await this.getAttendanceById(tenantId, attendanceId);

    if (!attendance) {
      throw new Error('Attendance record not found');
    }

    attendance.isActive = false;
    await this.attendanceRepository.save(attendance);
  }

  /**
   * Get attendance statistics for a staff member
   */
  async getStaffAttendanceStatistics(
    tenantId: string,
    staffId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    halfDays: number;
    leaveDays: number;
    sickLeaveDays: number;
    totalHoursWorked: number;
    averageHoursPerDay: number;
    attendanceRate: number;
    byStatus: Record<StaffAttendanceStatus, number>;
  }> {
    const attendances = await this.getAttendanceByStaff(tenantId, staffId, startDate, endDate);

    const statistics = {
      totalDays: attendances.length,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      halfDays: 0,
      leaveDays: 0,
      sickLeaveDays: 0,
      totalHoursWorked: 0,
      averageHoursPerDay: 0,
      attendanceRate: 0,
      byStatus: {} as Record<StaffAttendanceStatus, number>,
    };

    // Initialize status counts
    Object.values(StaffAttendanceStatus).forEach((status) => {
      statistics.byStatus[status] = 0;
    });

    attendances.forEach((attendance) => {
      statistics.byStatus[attendance.status]++;

      switch (attendance.status) {
        case StaffAttendanceStatus.PRESENT:
          statistics.presentDays++;
          break;
        case StaffAttendanceStatus.ABSENT:
          statistics.absentDays++;
          break;
        case StaffAttendanceStatus.LATE:
          statistics.lateDays++;
          statistics.presentDays++; // Late is still present
          break;
        case StaffAttendanceStatus.HALF_DAY:
          statistics.halfDays++;
          statistics.presentDays++; // Half day is still present
          break;
        case StaffAttendanceStatus.ON_LEAVE:
          statistics.leaveDays++;
          break;
        case StaffAttendanceStatus.SICK_LEAVE:
          statistics.sickLeaveDays++;
          break;
      }

      if (attendance.totalHours) {
        statistics.totalHoursWorked += attendance.totalHours;
      }
    });

    statistics.averageHoursPerDay =
      statistics.presentDays > 0 ? statistics.totalHoursWorked / statistics.presentDays : 0;

    statistics.attendanceRate =
      statistics.totalDays > 0 ? (statistics.presentDays / statistics.totalDays) * 100 : 0;

    return statistics;
  }

  /**
   * Get attendance summary for all staff on a date
   */
  async getDailyAttendanceSummary(tenantId: string, date: Date): Promise<{
    totalStaff: number;
    present: number;
    absent: number;
    late: number;
    onLeave: number;
    notMarked: number;
    attendances: StaffAttendance[];
  }> {
    const attendances = await this.getAttendanceByDate(tenantId, date);

    const summary = {
      totalStaff: attendances.length,
      present: 0,
      absent: 0,
      late: 0,
      onLeave: 0,
      notMarked: 0,
      attendances,
    };

    attendances.forEach((attendance) => {
      switch (attendance.status) {
        case StaffAttendanceStatus.PRESENT:
          summary.present++;
          break;
        case StaffAttendanceStatus.ABSENT:
          summary.absent++;
          break;
        case StaffAttendanceStatus.LATE:
          summary.late++;
          summary.present++; // Late counts as present
          break;
        case StaffAttendanceStatus.ON_LEAVE:
        case StaffAttendanceStatus.SICK_LEAVE:
          summary.onLeave++;
          break;
      }
    });

    return summary;
  }

  /**
   * Get late arrivals for a date range
   */
  async getLateArrivals(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StaffAttendance[]> {
    const attendances = await this.attendanceRepository.find({
      where: {
        tenantId,
        attendanceDate: Between(startDate, endDate),
        status: StaffAttendanceStatus.LATE,
        isActive: true,
      },
      relations: ['staff'],
      order: { attendanceDate: 'DESC' },
    });

    return attendances;
  }

  /**
   * Get overtime records
   */
  async getOvertimeRecords(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    minOvertimeHours: number = 0
  ): Promise<Array<StaffAttendance & { overtimeHours: number }>> {
    const attendances = await this.attendanceRepository.find({
      where: {
        tenantId,
        attendanceDate: Between(startDate, endDate),
        isActive: true,
      },
      relations: ['staff'],
      order: { attendanceDate: 'DESC' },
    });

    const overtimeRecords: Array<StaffAttendance & { overtimeHours: number }> = [];

    attendances.forEach((attendance) => {
      const overtimeHours = attendance.getOvertimeHours();
      if (overtimeHours > minOvertimeHours) {
        overtimeRecords.push(Object.assign(attendance, { overtimeHours }));
      }
    });

    return overtimeRecords;
  }

  /**
   * Bulk create attendance records (e.g., mark all as present)
   */
  async bulkCreateAttendance(
    tenantId: string,
    records: Array<{
      staffId: string;
      attendanceDate: Date;
      checkInTime?: string;
      status: StaffAttendanceStatus;
      notes?: string;
    }>
  ): Promise<StaffAttendance[]> {
    const attendances: StaffAttendance[] = [];

    for (const record of records) {
      const attendance = this.attendanceRepository.create({
        tenantId,
        staffId: record.staffId,
        attendanceDate: record.attendanceDate,
        checkInTime: record.checkInTime,
        status: record.status,
        notes: record.notes,
        isActive: true,
      });

      attendances.push(attendance);
    }

    return this.attendanceRepository.save(attendances);
  }
}

// Singleton instance
let staffAttendanceServiceInstance: StaffAttendanceService | null = null;

export function getStaffAttendanceService(): StaffAttendanceService {
  if (!staffAttendanceServiceInstance) {
    staffAttendanceServiceInstance = new StaffAttendanceService();
  }
  return staffAttendanceServiceInstance;
}
