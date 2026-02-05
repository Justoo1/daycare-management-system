import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Child } from './Child';
import { Class } from './Class';
import { User } from './User';

export enum ClassChangeReason {
  PROMOTION = 'promotion',
  AGE_PROGRESSION = 'age_progression',
  TRANSFER = 'transfer',
  INITIAL_ENROLLMENT = 'initial_enrollment',
  PARENT_REQUEST = 'parent_request',
  CAPACITY_ADJUSTMENT = 'capacity_adjustment',
  OTHER = 'other',
}

@Entity('class_history')
@Index(['tenantId', 'childId'])
@Index(['childId', 'startDate'])
export class ClassHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  childId: string;

  @Column('uuid')
  classId: string;

  @Column('varchar', { length: 100 })
  className: string; // Stored for historical reference even if class is deleted

  @Column('int', { nullable: true })
  ageGroupMin: number; // Stored for historical reference

  @Column('int', { nullable: true })
  ageGroupMax: number; // Stored for historical reference

  @Column('date')
  startDate: Date;

  @Column('date', { nullable: true })
  endDate: Date; // null means current class

  @Column({
    type: 'enum',
    enum: ClassChangeReason,
    default: ClassChangeReason.INITIAL_ENROLLMENT,
  })
  reason: ClassChangeReason;

  @Column('text', { nullable: true })
  notes: string;

  @Column('uuid', { nullable: true })
  promotedBy: string; // User who made the change

  // Performance summary at the time of leaving the class
  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  attendanceRate: number;

  @Column('int', { nullable: true })
  totalDaysPresent: number;

  @Column('int', { nullable: true })
  totalDaysAbsent: number;

  @Column('int', { nullable: true })
  totalActivities: number;

  @Column('int', { nullable: true })
  milestonesAchieved: number;

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  averagePerformanceRating: number; // 1-5 scale

  @Column('text', { nullable: true })
  teacherRemarks: string;

  // Relationships
  @ManyToOne(() => Child)
  @JoinColumn({ name: 'childId' })
  child: Child;

  @ManyToOne(() => Class, { nullable: true })
  @JoinColumn({ name: 'classId' })
  class: Class;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'promotedBy' })
  promoter: User;

  @CreateDateColumn()
  createdAt: Date;

  /**
   * Get duration in this class (in days)
   */
  getDurationInDays(): number {
    const end = this.endDate ? new Date(this.endDate) : new Date();
    const start = new Date(this.startDate);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get duration in months
   */
  getDurationInMonths(): number {
    return Math.round(this.getDurationInDays() / 30);
  }

  /**
   * Check if this is the current class
   */
  isCurrent(): boolean {
    return this.endDate === null;
  }
}
