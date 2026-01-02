import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { StaffAttendanceStatus } from '@shared';
import { StaffProfile } from './StaffProfile';

@Entity('staff_attendances')
@Index(['tenantId', 'staffId', 'attendanceDate'])
@Index(['tenantId', 'attendanceDate'])
export class StaffAttendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  staffId: string;

  @Column('date')
  attendanceDate: Date;

  @Column('time', { nullable: true })
  checkInTime: string; // Format: "08:00"

  @Column('time', { nullable: true })
  checkOutTime: string; // Format: "17:00"

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  totalHours: number;

  @Column('enum', { enum: StaffAttendanceStatus })
  status: StaffAttendanceStatus;

  @Column('text', { nullable: true })
  notes: string;

  @Column('int', { nullable: true })
  breakDuration: number; // Minutes

  @Column('boolean', { default: true })
  isActive: boolean;

  // Relationships
  @ManyToOne(() => StaffProfile, staff => staff.attendances, { onDelete: 'CASCADE' })
  staff: StaffProfile;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Calculate total hours worked
   */
  calculateTotalHours(): number | null {
    if (!this.checkInTime || !this.checkOutTime) return null;

    const [inHour, inMin] = this.checkInTime.split(':').map(Number);
    const [outHour, outMin] = this.checkOutTime.split(':').map(Number);

    const inMinutes = inHour * 60 + inMin;
    const outMinutes = outHour * 60 + outMin;

    let duration = outMinutes - inMinutes;

    // Handle overnight shifts
    if (duration < 0) {
      duration += 24 * 60;
    }

    // Subtract break duration
    if (this.breakDuration) {
      duration -= this.breakDuration;
    }

    return duration / 60; // Convert to hours
  }

  /**
   * Check if staff was late (after 8:05 AM by default)
   */
  isLate(expectedTime: string = '08:05'): boolean {
    if (!this.checkInTime) return false;

    const [checkInHour, checkInMin] = this.checkInTime.split(':').map(Number);
    const [expectedHour, expectedMin] = expectedTime.split(':').map(Number);

    const checkInMinutes = checkInHour * 60 + checkInMin;
    const expectedMinutes = expectedHour * 60 + expectedMin;

    return checkInMinutes > expectedMinutes;
  }

  /**
   * Check if it's a half day (less than 4 hours)
   */
  isHalfDay(): boolean {
    const hours = this.calculateTotalHours();
    if (hours === null) return false;
    return hours < 4 && hours > 0;
  }

  /**
   * Check if it's a full day (8+ hours)
   */
  isFullDay(): boolean {
    const hours = this.calculateTotalHours();
    if (hours === null) return false;
    return hours >= 8;
  }

  /**
   * Auto-update status based on check-in/out times
   */
  updateStatus(): void {
    if (this.status === StaffAttendanceStatus.ON_LEAVE ||
        this.status === StaffAttendanceStatus.SICK_LEAVE) {
      return; // Don't override leave statuses
    }

    if (!this.checkInTime && !this.checkOutTime) {
      this.status = StaffAttendanceStatus.ABSENT;
    } else if (this.isLate()) {
      this.status = StaffAttendanceStatus.LATE;
    } else if (this.isHalfDay()) {
      this.status = StaffAttendanceStatus.HALF_DAY;
    } else {
      this.status = StaffAttendanceStatus.PRESENT;
    }
  }

  /**
   * Get overtime hours (if worked more than 8 hours)
   */
  getOvertimeHours(): number {
    const hours = this.calculateTotalHours();
    if (hours === null || hours <= 8) return 0;
    return hours - 8;
  }
}
