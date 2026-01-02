import { AppDataSource } from '@config/database';
import { Shift } from '@models/Shift';
import { ShiftStatus } from '@shared';
import { Repository, Between } from 'typeorm';

export class ShiftService {
  private shiftRepository: Repository<Shift>;

  constructor() {
    this.shiftRepository = AppDataSource.getRepository(Shift);
  }

  /**
   * Create a new shift
   */
  async createShift(
    tenantId: string,
    data: {
      centerId: string;
      staffId: string;
      classId?: string;
      shiftDate: Date;
      startTime: string;
      endTime: string;
      breakDuration?: number;
      notes?: string;
    }
  ): Promise<Shift> {
    // Check for overlapping shifts
    const overlapping = await this.checkOverlappingShifts(
      tenantId,
      data.staffId,
      data.shiftDate,
      data.startTime,
      data.endTime
    );

    if (overlapping) {
      throw new Error('Staff already has a shift scheduled during this time');
    }

    const shift = this.shiftRepository.create({
      tenantId,
      centerId: data.centerId,
      staffId: data.staffId,
      classId: data.classId,
      shiftDate: data.shiftDate,
      startTime: data.startTime,
      endTime: data.endTime,
      breakDuration: data.breakDuration || 0,
      status: ShiftStatus.SCHEDULED,
      notes: data.notes,
      isActive: true,
    });

    return this.shiftRepository.save(shift);
  }

  /**
   * Check for overlapping shifts
   */
  async checkOverlappingShifts(
    tenantId: string,
    staffId: string,
    shiftDate: Date,
    startTime: string,
    endTime: string,
    excludeShiftId?: string
  ): Promise<boolean> {
    const shifts = await this.shiftRepository.find({
      where: {
        tenantId,
        staffId,
        shiftDate,
        isActive: true,
        status: ShiftStatus.SCHEDULED,
      },
    });

    const [newStartHour, newStartMin] = startTime.split(':').map(Number);
    const [newEndHour, newEndMin] = endTime.split(':').map(Number);
    const newStartMinutes = newStartHour * 60 + newStartMin;
    const newEndMinutes = newEndHour * 60 + newEndMin;

    for (const shift of shifts) {
      if (excludeShiftId && shift.id === excludeShiftId) continue;

      const [existingStartHour, existingStartMin] = shift.startTime.split(':').map(Number);
      const [existingEndHour, existingEndMin] = shift.endTime.split(':').map(Number);
      const existingStartMinutes = existingStartHour * 60 + existingStartMin;
      const existingEndMinutes = existingEndHour * 60 + existingEndMin;

      // Check for overlap
      if (
        (newStartMinutes >= existingStartMinutes && newStartMinutes < existingEndMinutes) ||
        (newEndMinutes > existingStartMinutes && newEndMinutes <= existingEndMinutes) ||
        (newStartMinutes <= existingStartMinutes && newEndMinutes >= existingEndMinutes)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get shifts by staff
   */
  async getShiftsByStaff(
    tenantId: string,
    staffId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Shift[]> {
    const where: any = { tenantId, staffId, isActive: true };

    if (startDate && endDate) {
      where.shiftDate = Between(startDate, endDate);
    }

    return this.shiftRepository.find({
      where,
      relations: ['staff', 'center', 'class'],
      order: { shiftDate: 'DESC', startTime: 'ASC' },
    });
  }

  /**
   * Get shifts by center
   */
  async getShiftsByCenter(
    tenantId: string,
    centerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Shift[]> {
    const where: any = { tenantId, centerId, isActive: true };

    if (startDate && endDate) {
      where.shiftDate = Between(startDate, endDate);
    }

    return this.shiftRepository.find({
      where,
      relations: ['staff', 'center', 'class'],
      order: { shiftDate: 'DESC', startTime: 'ASC' },
    });
  }

  /**
   * Get shifts by date
   */
  async getShiftsByDate(tenantId: string, date: Date): Promise<Shift[]> {
    return this.shiftRepository.find({
      where: { tenantId, shiftDate: date, isActive: true },
      relations: ['staff', 'center', 'class'],
      order: { startTime: 'ASC' },
    });
  }

  /**
   * Get shift by ID
   */
  async getShiftById(tenantId: string, shiftId: string): Promise<Shift | null> {
    return this.shiftRepository.findOne({
      where: { id: shiftId, tenantId },
      relations: ['staff', 'center', 'class'],
    });
  }

  /**
   * Update shift
   */
  async updateShift(
    tenantId: string,
    shiftId: string,
    data: Partial<Shift>
  ): Promise<Shift> {
    const shift = await this.getShiftById(tenantId, shiftId);

    if (!shift) {
      throw new Error('Shift not found');
    }

    // Don't allow updating these fields
    const { tenantId: _, id: __, staffId, centerId, ...updateData } = data as any;

    // If updating times, check for overlaps
    if (updateData.startTime || updateData.endTime) {
      const newStartTime = updateData.startTime || shift.startTime;
      const newEndTime = updateData.endTime || shift.endTime;
      const shiftDate = updateData.shiftDate || shift.shiftDate;

      const overlapping = await this.checkOverlappingShifts(
        tenantId,
        shift.staffId,
        shiftDate,
        newStartTime,
        newEndTime,
        shiftId
      );

      if (overlapping) {
        throw new Error('Updated shift times overlap with another scheduled shift');
      }
    }

    Object.assign(shift, updateData);

    return this.shiftRepository.save(shift);
  }

  /**
   * Clock in for shift
   */
  async clockIn(
    tenantId: string,
    shiftId: string,
    clockInTime: string
  ): Promise<Shift> {
    const shift = await this.getShiftById(tenantId, shiftId);

    if (!shift) {
      throw new Error('Shift not found');
    }

    if (shift.status !== ShiftStatus.SCHEDULED) {
      throw new Error('Shift is not in scheduled status');
    }

    shift.actualStartTime = clockInTime;

    return this.shiftRepository.save(shift);
  }

  /**
   * Clock out for shift
   */
  async clockOut(
    tenantId: string,
    shiftId: string,
    clockOutTime: string
  ): Promise<Shift> {
    const shift = await this.getShiftById(tenantId, shiftId);

    if (!shift) {
      throw new Error('Shift not found');
    }

    if (!shift.actualStartTime) {
      throw new Error('Cannot clock out without clocking in first');
    }

    shift.actualEndTime = clockOutTime;
    shift.status = ShiftStatus.COMPLETED;

    return this.shiftRepository.save(shift);
  }

  /**
   * Cancel shift
   */
  async cancelShift(
    tenantId: string,
    shiftId: string,
    reason?: string
  ): Promise<Shift> {
    const shift = await this.getShiftById(tenantId, shiftId);

    if (!shift) {
      throw new Error('Shift not found');
    }

    shift.status = ShiftStatus.CANCELLED;
    if (reason) {
      shift.notes = shift.notes ? `${shift.notes}\nCancellation reason: ${reason}` : `Cancellation reason: ${reason}`;
    }

    return this.shiftRepository.save(shift);
  }

  /**
   * Mark shift as no-show
   */
  async markNoShow(tenantId: string, shiftId: string): Promise<Shift> {
    const shift = await this.getShiftById(tenantId, shiftId);

    if (!shift) {
      throw new Error('Shift not found');
    }

    shift.status = ShiftStatus.NO_SHOW;

    return this.shiftRepository.save(shift);
  }

  /**
   * Delete shift (soft delete)
   */
  async deleteShift(tenantId: string, shiftId: string): Promise<void> {
    const shift = await this.getShiftById(tenantId, shiftId);

    if (!shift) {
      throw new Error('Shift not found');
    }

    shift.isActive = false;
    await this.shiftRepository.save(shift);
  }

  /**
   * Get shift statistics
   */
  async getShiftStatistics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalShifts: number;
    completedShifts: number;
    cancelledShifts: number;
    noShowShifts: number;
    totalScheduledHours: number;
    totalActualHours: number;
    byStatus: Record<ShiftStatus, number>;
    averageShiftDuration: number;
  }> {
    const shifts = await this.shiftRepository.find({
      where: {
        tenantId,
        shiftDate: Between(startDate, endDate),
        isActive: true,
      },
    });

    const statistics = {
      totalShifts: shifts.length,
      completedShifts: 0,
      cancelledShifts: 0,
      noShowShifts: 0,
      totalScheduledHours: 0,
      totalActualHours: 0,
      byStatus: {} as Record<ShiftStatus, number>,
      averageShiftDuration: 0,
    };

    // Initialize status counts
    Object.values(ShiftStatus).forEach((status) => {
      statistics.byStatus[status] = 0;
    });

    let totalDuration = 0;

    shifts.forEach((shift) => {
      statistics.byStatus[shift.status]++;

      if (shift.status === ShiftStatus.COMPLETED) {
        statistics.completedShifts++;
        const actualHours = shift.getActualHoursWorked();
        if (actualHours !== null) {
          statistics.totalActualHours += actualHours;
        }
      } else if (shift.status === ShiftStatus.CANCELLED) {
        statistics.cancelledShifts++;
      } else if (shift.status === ShiftStatus.NO_SHOW) {
        statistics.noShowShifts++;
      }

      const scheduledHours = shift.getShiftDuration();
      statistics.totalScheduledHours += scheduledHours;
      totalDuration += scheduledHours;
    });

    statistics.averageShiftDuration = shifts.length > 0 ? totalDuration / shifts.length : 0;

    return statistics;
  }

  /**
   * Get upcoming shifts for staff
   */
  async getUpcomingShifts(
    tenantId: string,
    staffId: string,
    days: number = 7
  ): Promise<Shift[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    return this.shiftRepository.find({
      where: {
        tenantId,
        staffId,
        shiftDate: Between(today, endDate),
        status: ShiftStatus.SCHEDULED,
        isActive: true,
      },
      relations: ['center', 'class'],
      order: { shiftDate: 'ASC', startTime: 'ASC' },
    });
  }

  /**
   * Create bulk shifts (e.g., weekly schedule)
   */
  async createBulkShifts(
    tenantId: string,
    shifts: Array<{
      centerId: string;
      staffId: string;
      classId?: string;
      shiftDate: Date;
      startTime: string;
      endTime: string;
      breakDuration?: number;
      notes?: string;
    }>
  ): Promise<Shift[]> {
    const createdShifts: Shift[] = [];

    for (const shiftData of shifts) {
      try {
        const shift = await this.createShift(tenantId, shiftData);
        createdShifts.push(shift);
      } catch (error) {
        // Skip overlapping shifts but continue with others
        console.error(`Failed to create shift for ${shiftData.staffId} on ${shiftData.shiftDate}:`, error);
      }
    }

    return createdShifts;
  }
}

// Singleton instance
let shiftServiceInstance: ShiftService | null = null;

export function getShiftService(): ShiftService {
  if (!shiftServiceInstance) {
    shiftServiceInstance = new ShiftService();
  }
  return shiftServiceInstance;
}
