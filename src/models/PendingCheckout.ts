import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Child } from './Child';
import { Attendance } from './Attendance';
import { User } from './User';

export enum CheckoutOTPStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

@Entity('pending_checkouts')
@Index(['tenantId', 'childId', 'status'])
@Index(['otpCode', 'status'])
export class PendingCheckout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  centerId: string;

  @Column('uuid')
  childId: string;

  @Column('uuid')
  attendanceId: string;

  @Column('varchar', { length: 6 })
  otpCode: string;

  @Column({
    type: 'enum',
    enum: CheckoutOTPStatus,
    default: CheckoutOTPStatus.PENDING,
  })
  status: CheckoutOTPStatus;

  // Pickup person details
  @Column('varchar', { length: 100 })
  pickupPersonName: string;

  @Column('varchar', { length: 50 })
  pickupPersonRelationship: string;

  @Column('varchar', { length: 20 })
  pickupPersonPhone: string;

  // Staff who initiated the checkout
  @Column('uuid')
  initiatedByUserId: string;

  // OTP attempts tracking
  @Column('int', { default: 0 })
  attemptCount: number;

  @Column('int', { default: 3 })
  maxAttempts: number;

  // Timestamps
  @Column('timestamp')
  expiresAt: Date;

  @Column('timestamp', { nullable: true })
  verifiedAt: Date;

  // Optional checkout data to use when verified
  @Column('time', { nullable: true })
  checkOutTime: string;

  @Column('text', { nullable: true })
  checkOutPhotoUrl: string;

  @Column('text', { nullable: true })
  notes: string;

  // Relationships
  @ManyToOne(() => Child)
  @JoinColumn({ name: 'childId' })
  child: Child;

  @ManyToOne(() => Attendance)
  @JoinColumn({ name: 'attendanceId' })
  attendance: Attendance;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'initiatedByUserId' })
  initiatedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  /**
   * Check if OTP is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if max attempts exceeded
   */
  isMaxAttemptsExceeded(): boolean {
    return this.attemptCount >= this.maxAttempts;
  }

  /**
   * Verify OTP code
   */
  verifyOTP(code: string): boolean {
    return this.otpCode === code;
  }
}
