import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ShiftStatus } from '@shared';
import { StaffProfile } from './StaffProfile';
import { Center } from './Center';
import { Class } from './Class';

@Entity('shifts')
@Index(['tenantId', 'centerId', 'shiftDate'])
@Index(['tenantId', 'staffId', 'shiftDate'])
export class Shift {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  centerId: string;

  @Column('uuid')
  staffId: string;

  @Column('uuid', { nullable: true })
  classId: string; // Optional - staff might work across multiple classes

  @Column('date')
  shiftDate: Date;

  @Column('time')
  startTime: string; // Format: "08:00"

  @Column('time')
  endTime: string; // Format: "17:00"

  @Column('int', { default: 0 })
  breakDuration: number; // Minutes

  @Column('enum', { enum: ShiftStatus, default: ShiftStatus.SCHEDULED })
  status: ShiftStatus;

  @Column('text', { nullable: true })
  notes: string;

  @Column('time', { nullable: true })
  actualStartTime: string;

  @Column('time', { nullable: true })
  actualEndTime: string;

  @Column('boolean', { default: true })
  isActive: boolean;

  // Relationships
  @ManyToOne(() => StaffProfile, staff => staff.shifts, { onDelete: 'CASCADE' })
  staff: StaffProfile;

  @ManyToOne(() => Center, { onDelete: 'CASCADE' })
  center: Center;

  @ManyToOne(() => Class, { nullable: true })
  class: Class;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Calculate shift duration in hours
   */
  getShiftDuration(): number {
    const [startHour, startMin] = this.startTime.split(':').map(Number);
    const [endHour, endMin] = this.endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    let duration = (endMinutes - startMinutes) - this.breakDuration;

    // Handle overnight shifts
    if (duration < 0) {
      duration += 24 * 60;
    }

    return duration / 60; // Convert to hours
  }

  /**
   * Calculate actual hours worked (if shift is completed)
   */
  getActualHoursWorked(): number | null {
    if (!this.actualStartTime || !this.actualEndTime) return null;

    const [startHour, startMin] = this.actualStartTime.split(':').map(Number);
    const [endHour, endMin] = this.actualEndTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    let duration = (endMinutes - startMinutes) - this.breakDuration;

    // Handle overnight shifts
    if (duration < 0) {
      duration += 24 * 60;
    }

    return duration / 60; // Convert to hours
  }

  /**
   * Check if shift is in the past
   */
  isPastShift(): boolean {
    const now = new Date();
    const shiftDateTime = new Date(this.shiftDate);
    shiftDateTime.setHours(23, 59, 59); // End of shift day
    return shiftDateTime < now;
  }

  /**
   * Check if shift is today
   */
  isToday(): boolean {
    const now = new Date();
    const shiftDate = new Date(this.shiftDate);
    return (
      shiftDate.getDate() === now.getDate() &&
      shiftDate.getMonth() === now.getMonth() &&
      shiftDate.getFullYear() === now.getFullYear()
    );
  }
}
