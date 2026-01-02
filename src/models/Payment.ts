import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Invoice } from './Invoice';

@Entity('payments')
@Index(['tenantId', 'centerId'])
@Index(['tenantId', 'invoiceId'])
@Index(['referenceNumber'], { unique: true })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  centerId: string;

  @Column('uuid')
  invoiceId: string;

  @Column('varchar', { length: 50, unique: true })
  referenceNumber: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('varchar', { length: 50 })
  paymentMethod: string; // 'mobile_money', 'bank_transfer', 'cash', 'card', 'check'

  // Mobile Money specific
  @Column('varchar', { length: 50, nullable: true })
  mobileMoneyProvider: string; // 'mtn', 'vodafone', 'airteltigo'

  @Column('varchar', { length: 20, nullable: true })
  mobileMoneyPhone: string;

  @Column('varchar', { length: 100, nullable: true })
  mobileMoneyNetwork: string;

  // Bank transfer specific
  @Column('varchar', { length: 100, nullable: true })
  bankName: string;

  @Column('varchar', { length: 50, nullable: true })
  accountNumber: string;

  @Column('varchar', { length: 100, nullable: true })
  transactionId: string;

  // Card payment specific
  @Column('varchar', { length: 100, nullable: true })
  cardProvider: string; // 'paystack', 'stripe'

  @Column('varchar', { length: 50, nullable: true })
  cardLastFourDigits: string;

  // Cash specific
  @Column('varchar', { length: 100, nullable: true })
  cashReceivedBy: string;

  // Payment status
  @Column('varchar', { length: 50, default: 'pending' })
  status: string; // 'pending', 'processing', 'completed', 'failed', 'refunded'

  @Column('timestamp', { nullable: true })
  processedAt: Date;

  @Column('text', { nullable: true })
  failureReason: string;

  // Receipt
  @Column('text', { nullable: true })
  receiptUrl: string;

  @Column('boolean', { default: false })
  receiptSent: boolean;

  @Column('timestamp', { nullable: true })
  receiptSentAt: Date;

  // Confirmation
  @Column('varchar', { length: 255, nullable: true })
  confirmationCode: string;

  // Notes
  @Column('text', { nullable: true })
  notes: string;

  // Refund information
  @Column('boolean', { default: false })
  isRefunded: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  refundAmount: number;

  @Column('timestamp', { nullable: true })
  refundedAt: Date;

  @Column('text', { nullable: true })
  refundReason: string;

  // Parent/Guardian information
  @Column('varchar', { length: 100, nullable: true })
  paidBy: string;

  @Column('varchar', { length: 20, nullable: true })
  paidByPhone: string;

  @Column('varchar', { length: 255, nullable: true })
  paidByEmail: string;

  // Currency
  @Column('varchar', { length: 3, default: 'GHS' })
  currency: string;

  // Relationships
  @ManyToOne(() => Invoice, invoice => invoice.payments, { onDelete: 'CASCADE' })
  invoice: Invoice;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  deletedAt: Date;
}
