import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@shared';
import { Center } from './Center';

@Entity('users')
@Index(['tenantId', 'email'], { unique: true })
@Index(['tenantId', 'phoneNumber'], { unique: true })
@Index(['tenantId'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid', { nullable: true })
  centerId: string;

  @Column('varchar', { length: 100 })
  firstName: string;

  @Column('varchar', { length: 100 })
  lastName: string;

  @Column('varchar', { length: 255, unique: true })
  email: string;

  @Column('varchar', { length: 20, nullable: true, unique: true })
  phoneNumber: string;

  @Column('text')
  passwordHash: string;

  @Column('enum', { enum: UserRole })
  role: UserRole;

  @Column('boolean', { default: false })
  emailVerified: boolean;

  @Column('boolean', { default: false })
  phoneVerified: boolean;

  @Column('boolean', { default: false })
  mfaEnabled: boolean;

  @Column('varchar', { length: 50, nullable: true })
  mfaMethod: string; // 'sms', 'email', 'authenticator'

  @Column('text', { nullable: true })
  mfaSecret: string;

  // OTP for phone/email verification
  @Column('varchar', { length: 6, nullable: true })
  otpCode: string | null;

  @Column('timestamp', { nullable: true })
  otpExpiresAt: Date | null;

  @Column('int', { default: 0 })
  otpAttempts: number;

  // Profile information
  @Column('text', { nullable: true })
  profilePhotoUrl: string;

  @Column('date', { nullable: true })
  dateOfBirth: Date;

  @Column('varchar', { length: 10, nullable: true })
  gender: string;

  @Column('text', { nullable: true })
  address: string;

  @Column('boolean', { default: false })
  isActive: boolean;

  @Column('timestamp', { nullable: true })
  lastLoginAt: Date;

  @Column('varchar', { length: 255, nullable: true })
  language: string; // User's preferred language

  // Relationship
  @ManyToOne(() => Center, center => center.users, { onDelete: 'CASCADE' })
  center: Center;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  deletedAt: Date;

  /**
   * Hash password before saving
   */
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.passwordHash && !this.passwordHash.startsWith('$2')) {
      this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.passwordHash);
  }

  /**
   * Get full name
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
