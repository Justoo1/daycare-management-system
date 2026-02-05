import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Center } from './Center';
import { User } from './User';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { unique: true })
  name: string;

  @Column('varchar', { unique: true })
  slug: string;

  @Column('varchar', { nullable: true })
  domain: string;

  @Column('varchar', { nullable: true })
  logo: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('varchar', { nullable: true })
  contactEmail: string;

  @Column('varchar', { nullable: true })
  contactPhone: string;

  @Column('varchar', { nullable: true })
  address: string;

  @Column('varchar', { nullable: true })
  country: string;

  @Column('varchar', { default: 'GHS' })
  currency: string;

  @Column('varchar', { nullable: true })
  timezone: string;

  @Column('varchar', { default: 'en' })
  language: string;

  // Subscription & Billing
  @Column('varchar', { default: 'trial' })
  subscriptionStatus: string; // trial, active, suspended, cancelled

  @Column('varchar', { default: 'free' })
  subscriptionPlan: string; // free, basic, premium, enterprise

  @Column('timestamp', { nullable: true })
  subscriptionExpiresAt: Date;

  // Payment Settings - Bank Details for receiving payments
  @Column('varchar', { nullable: true })
  bankName: string;

  @Column('varchar', { nullable: true })
  bankCode: string; // Paystack bank code

  @Column('varchar', { nullable: true })
  accountNumber: string;

  @Column('varchar', { nullable: true })
  accountName: string;

  // Paystack Subaccount
  @Column('varchar', { nullable: true })
  paystackSubaccountCode: string;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  platformFeePercentage: number; // Platform fee percentage (e.g., 2.5 for 2.5%)

  @Column('boolean', { default: false })
  paymentSettingsVerified: boolean;

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('timestamp', { nullable: true })
  deletedAt: Date;

  // Relationships
  @OneToMany(() => Center, center => center.tenantId)
  centers: Center[];

  @OneToMany(() => User, user => user.tenantId)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
