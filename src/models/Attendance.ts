import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { AttendanceStatus } from '@shared';
import { Child } from './Child';
import { Class } from './Class';
import { User } from './User';

@Entity('attendances')
@Index(['tenantId', 'centerId', 'childId', 'date'])
@Index(['tenantId', 'classId', 'date'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  centerId: string;

  @Column('uuid')
  childId: string;

  @Column('uuid', { nullable: true })
  classId: string;

  @Column('date')
  date: Date;

  @Column('enum', { enum: AttendanceStatus })
  status: AttendanceStatus;

  // Check-in details
  @Column('time', { nullable: true })
  checkInTime: string;

  @Column('text', { nullable: true })
  checkInPhotoUrl: string;

  @Column('boolean', { default: false })
  isLateArrival: boolean;

  @Column('int', { nullable: true })
  lateMinutes: number;

  // Check-out details
  @Column('time', { nullable: true })
  checkOutTime: string;

  @Column('text', { nullable: true })
  checkOutPhotoUrl: string;

  @Column('boolean', { default: false })
  isEarlyPickup: boolean;

  @Column('int', { nullable: true })
  earlyMinutes: number;

  // Guardian/Staff information
  @Column('uuid', { nullable: true })
  checkedInByUserId: string;

  @Column('uuid', { nullable: true })
  checkedOutByUserId: string;

  @Column('varchar', { length: 100, nullable: true })
  checkedOutByName: string;

  @Column('varchar', { length: 20, nullable: true })
  checkedOutByRelationship: string;

  // Health screening
  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  temperature: number;

  @Column('text', { nullable: true })
  healthNotes: string;

  // Absence reporting
  @Column('text', { nullable: true })
  absenceReason: string;

  @Column('boolean', { default: false })
  parentNotified: boolean;

  @Column('timestamp', { nullable: true })
  parentNotifiedAt: Date;

  // Notes
  @Column('text', { nullable: true })
  notes: string;

  // Relationships
  @ManyToOne(() => Child, child => child.attendances, { onDelete: 'CASCADE' })
  child: Child;

  @ManyToOne(() => Class, classRoom => classRoom.attendances, { onDelete: 'CASCADE' })
  class: Class;

  @ManyToOne(() => User, { nullable: true })
  checkedInByUser: User;

  @ManyToOne(() => User, { nullable: true })
  checkedOutByUser: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  deletedAt: Date;
}
