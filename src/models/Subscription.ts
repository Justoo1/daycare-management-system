import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Tenant } from './Tenant';

@Entity('subscriptions')
@Index(['tenantId'])
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  // Plan details
  @Column('varchar', { length: 50 })
  planType: string; // 'trial', 'basic', 'standard', 'premium'

  @Column('varchar', { length: 50 })
  billingCycle: string; // 'monthly', 'quarterly', 'yearly'

  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value)
    }
  })
  amount: number;

  @Column('varchar', { length: 3, default: 'GHS' })
  currency: string;

  // Subscription period
  @Column('timestamp')
  startDate: Date;

  @Column('timestamp')
  endDate: Date;

  @Column('timestamp', { nullable: true })
  trialEndDate: Date;

  // Status
  @Column('varchar', { length: 50, default: 'active' })
  status: string; // 'trial', 'active', 'cancelled', 'expired', 'suspended'

  @Column('boolean', { default: false })
  autoRenew: boolean;

  // Payment tracking
  @Column('timestamp', { nullable: true })
  lastPaymentDate: Date;

  @Column('timestamp', { nullable: true })
  nextBillingDate: Date;

  // Features/Limits
  @Column('int', { nullable: true })
  maxChildren: number; // null = unlimited

  @Column('int', { nullable: true })
  maxStaff: number; // null = unlimited

  @Column('int', { nullable: true })
  maxUsers: number; // null = unlimited

  @Column('int', { nullable: true })
  maxCenters: number; // null = unlimited

  @Column('boolean', { default: true })
  hasMessaging: boolean;

  @Column('boolean', { default: true })
  hasReports: boolean;

  @Column('boolean', { default: true })
  hasAnalytics: boolean;

  @Column('boolean', { default: false })
  hasApiAccess: boolean;

  // Cancellation
  @Column('timestamp', { nullable: true })
  cancelledAt: Date;

  @Column('text', { nullable: true })
  cancellationReason: string;

  // Notes
  @Column('text', { nullable: true })
  notes: string;

  // Relationship
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Check if subscription is active
   */
  isActive(): boolean {
    return (
      (this.status === 'active' || this.status === 'trial') &&
      new Date() <= this.endDate
    );
  }

  /**
   * Check if in trial period
   */
  isInTrial(): boolean {
    return (
      this.status === 'trial' &&
      this.trialEndDate !== null &&
      new Date() <= this.trialEndDate
    );
  }

  /**
   * Get days remaining
   */
  getDaysRemaining(): number {
    const now = new Date();
    const end = this.endDate;
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if subscription is expiring soon (within 7 days)
   */
  isExpiringSoon(): boolean {
    const daysRemaining = this.getDaysRemaining();
    return daysRemaining > 0 && daysRemaining <= 7;
  }
}
