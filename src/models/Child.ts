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
import { EnrollmentStatus } from '@shared';
import { Center } from './Center';
import { Class } from './Class';
import { Guardian } from './Guardian';
import { Attendance } from './Attendance';
import { ActivityLog } from './ActivityLog';

@Entity('children')
@Index(['tenantId', 'centerId'])
export class Child {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  centerId: string;

  @Column('uuid', { nullable: true })
  classId: string;

  @Column('varchar', { length: 100 })
  firstName: string;

  @Column('varchar', { length: 100 })
  lastName: string;

  @Column('date')
  dateOfBirth: Date;

  @Column('varchar', { length: 10 })
  gender: string;

  @Column('text', { nullable: true })
  photoUrl: string;

  // Medical Information
  @Column('varchar', { length: 5, nullable: true })
  bloodType: string;

  @Column('text', { nullable: true })
  allergies: string;

  @Column('text', { nullable: true })
  medicalConditions: string;

  @Column('text', { nullable: true })
  currentMedications: string;

  @Column('text', { nullable: true })
  dietaryRestrictions: string;

  // Emergency Contacts
  @Column('varchar', { length: 255, nullable: true })
  emergencyContactName: string;

  @Column('varchar', { length: 20, nullable: true })
  emergencyContactPhone: string;

  @Column('varchar', { length: 50, nullable: true })
  emergencyContactRelationship: string;

  // Enrollment Information
  @Column('enum', { enum: EnrollmentStatus, default: EnrollmentStatus.PENDING })
  enrollmentStatus: EnrollmentStatus;

  @Column('date', { nullable: true })
  enrollmentDate: Date;

  @Column('date', { nullable: true })
  withdrawalDate: Date;

  @Column('text', { nullable: true })
  withdrawalReason: string;

  @Column('date', { nullable: true })
  applicationDate: Date;

  @Column('date', { nullable: true })
  approvalDate: Date;

  @Column('varchar', { length: 255, nullable: true })
  approvedBy: string;

  @Column('text', { nullable: true })
  rejectionReason: string;

  @Column('int', { nullable: true })
  waitlistPosition: number;

  @Column('date', { nullable: true })
  waitlistAddedDate: Date;

  // Special Needs
  @Column('text', { nullable: true })
  specialNeeds: string;

  @Column('text', { nullable: true })
  specialNeedsAccommodations: string;

  // Pick-up Authorization
  @Column('simple-array', { nullable: true })
  authorizedPickupPersons: string[];

  // QR Code for attendance
  @Column('text', { nullable: true, unique: true })
  qrCode: string;

  // Siblings
  @Column('simple-array', { nullable: true })
  siblingIds: string[];

  // Photos/Documents
  @Column('text', { nullable: true })
  birthCertificateUrl: string;

  @Column('text', { nullable: true })
  medicalFormUrl: string;

  @Column('boolean', { default: false })
  isActive: boolean;

  // Relationships
  @ManyToOne(() => Center, center => center.children, { onDelete: 'CASCADE' })
  center: Center;

  @ManyToOne(() => Class, classRoom => classRoom.children, { nullable: true })
  class: Class;

  @OneToMany(() => Guardian, guardian => guardian.child)
  guardians: Guardian[];

  @OneToMany(() => Attendance, attendance => attendance.child)
  attendances: Attendance[];

  @OneToMany(() => ActivityLog, activityLog => activityLog.child)
  activityLogs: ActivityLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  deletedAt: Date;

  /**
   * Get child's full name
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  /**
   * Calculate age in months
   */
  getAgeInMonths(): number {
    const now = new Date();
    const birth = new Date(this.dateOfBirth);
    let months = (now.getFullYear() - birth.getFullYear()) * 12;
    months += now.getMonth() - birth.getMonth();
    return months;
  }

  /**
   * Get age group based on age in months
   */
  getAgeGroup(): string {
    const ageMonths = this.getAgeInMonths();
    if (ageMonths < 12) return 'infant';
    if (ageMonths < 36) return 'toddler';
    return 'preschool';
  }
}
