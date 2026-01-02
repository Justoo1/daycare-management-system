import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { StaffPosition, EmploymentType, SalaryFrequency } from '@shared';
import { User } from './User';
import { Center } from './Center';
import { Class } from './Class';
import { Certification } from './Certification';
import { Shift } from './Shift';
import { StaffAttendance } from './StaffAttendance';

@Entity('staff_profiles')
@Index(['tenantId', 'centerId'])
@Index(['tenantId', 'userId'])
export class StaffProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  centerId: string;

  @Column('uuid', { nullable: true })
  classId: string | null; // Assigned class for teachers/staff

  @Column('varchar', { length: 50, unique: true })
  employeeId: string;

  @Column('enum', { enum: StaffPosition })
  position: StaffPosition;

  @Column('varchar', { length: 100, nullable: true })
  department: string;

  @Column('date')
  hireDate: Date;

  @Column('enum', { enum: EmploymentType, default: EmploymentType.FULL_TIME })
  employmentType: EmploymentType;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  salary: number;

  @Column('enum', { enum: SalaryFrequency, default: SalaryFrequency.MONTHLY })
  salaryFrequency: SalaryFrequency;

  @Column('varchar', { length: 255, nullable: true })
  emergencyContactName: string;

  @Column('varchar', { length: 20, nullable: true })
  emergencyContactPhone: string;

  @Column('varchar', { length: 100, nullable: true })
  emergencyContactRelationship: string;

  @Column('text', { nullable: true })
  qualifications: string; // JSON or comma-separated

  @Column('text', { nullable: true })
  specializations: string; // e.g., "Early Childhood Education, Special Needs"

  @Column('text', { nullable: true })
  notes: string;

  // QR Code for attendance check-in
  @Column('varchar', { length: 255, nullable: true, unique: true })
  qrCode: string; // Unique QR code identifier for this staff member

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('date', { nullable: true })
  terminationDate?: Date;

  @Column('text', { nullable: true })
  terminationReason?: string;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Center, { onDelete: 'CASCADE' })
  center: Center;

  @ManyToOne(() => Class, { nullable: true })
  class: Class;

  @OneToMany(() => Certification, cert => cert.staff)
  certifications: Certification[];

  @OneToMany(() => Shift, shift => shift.staff)
  shifts: Shift[];

  @OneToMany(() => StaffAttendance, attendance => attendance.staff)
  attendances: StaffAttendance[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Calculate years of service
   */
  getYearsOfService(): number {
    const now = new Date();
    const years = (now.getTime() - this.hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.floor(years * 10) / 10; // Round to 1 decimal
  }

  /**
   * Check if employment is active
   */
  isCurrentlyEmployed(): boolean {
    return this.isActive && !this.terminationDate;
  }

  /**
   * Get salary in monthly equivalent
   */
  getMonthlySalary(): number {
    if (!this.salary) return 0;

    switch (this.salaryFrequency) {
      case SalaryFrequency.HOURLY:
        return this.salary * 160; // Assuming 160 hours/month
      case SalaryFrequency.DAILY:
        return this.salary * 22; // Assuming 22 working days/month
      case SalaryFrequency.WEEKLY:
        return this.salary * 4.33; // Average weeks per month
      case SalaryFrequency.ANNUAL:
        return this.salary / 12;
      case SalaryFrequency.MONTHLY:
      default:
        return this.salary;
    }
  }
}
