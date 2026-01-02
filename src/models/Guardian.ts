import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Child } from './Child';

@Entity('guardians')
@Index(['tenantId', 'centerId', 'childId'])
export class Guardian {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  centerId: string;

  @Column('uuid')
  childId: string;

  @Column('uuid', { nullable: true })
  userId: string; // Link to User account for parent login

  @Column('varchar', { length: 100 })
  firstName: string;

  @Column('varchar', { length: 100 })
  lastName: string;

  @Column('varchar', { length: 255 })
  email: string;

  @Column('varchar', { length: 20 })
  phoneNumber: string;

  @Column('varchar', { length: 50 })
  relationship: string; // 'mother', 'father', 'aunt', 'uncle', 'grandparent', etc.

  @Column('varchar', { length: 255, nullable: true })
  occupation: string;

  @Column('varchar', { length: 255, nullable: true })
  company: string;

  @Column('text', { nullable: true })
  workAddress: string;

  @Column('varchar', { length: 20, nullable: true })
  workPhoneNumber: string;

  // Contact preferences
  @Column('boolean', { default: true })
  canReceiveSMS: boolean;

  @Column('boolean', { default: true })
  canReceiveEmail: boolean;

  @Column('boolean', { default: true })
  canReceivePushNotifications: boolean;

  // Primary/Secondary guardian
  @Column('int', { default: 1 })
  priority: number; // 1 = primary, 2 = secondary, etc.

  @Column('boolean', { default: false })
  isPrimaryGuardian: boolean;

  @Column('boolean', { default: true })
  isAuthorizedPickup: boolean;

  // Address information
  @Column('text', { nullable: true })
  residentialAddress: string;

  @Column('varchar', { length: 50, nullable: true })
  city: string;

  @Column('varchar', { length: 50, nullable: true })
  region: string;

  @Column('varchar', { length: 10, nullable: true })
  postalCode: string;

  @Column('boolean', { default: true })
  isActive: boolean;

  // Relationship
  @ManyToOne(() => Child, child => child.guardians, { onDelete: 'CASCADE' })
  child: Child;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  deletedAt: Date;

  /**
   * Get guardian's full name
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
