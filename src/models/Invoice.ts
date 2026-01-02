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
import { Child } from './Child';
import { Payment } from './Payment';

@Entity('invoices')
@Index(['tenantId', 'centerId'])
@Index(['tenantId', 'childId'])
@Index(['invoiceNumber'], { unique: true })
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  centerId: string;

  @Column('uuid')
  childId: string;

  @Column('varchar', { length: 50, unique: true })
  invoiceNumber: string;

  @Column('date')
  invoiceDate: Date;

  @Column('date')
  dueDate: Date;

  @Column('date', { nullable: true })
  paidDate: Date;

  // Amount breakdown
  @Column('decimal', { precision: 10, scale: 2 })
  tuitionAmount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  mealFeeAmount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  activityFeeAmount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  otherCharges: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  subsidy: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  lateFee: number;

  // Totals
  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  // Payment tracking
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amountPaid: number;

  @Column('decimal', { precision: 10, scale: 2 })
  balanceRemaining: number;

  @Column('varchar', { length: 50, default: 'pending' })
  status: string; // 'pending', 'partial', 'paid', 'overdue', 'cancelled'

  // Period
  @Column('int')
  month: number;

  @Column('int')
  year: number;

  // Notes
  @Column('text', { nullable: true })
  notes: string;

  @Column('text', { nullable: true })
  description: string;

  // PDF/Document
  @Column('text', { nullable: true })
  pdfUrl: string;

  // Payment plan
  @Column('boolean', { default: false })
  isPartOfPaymentPlan: boolean;

  @Column('int', { nullable: true })
  installmentNumber: number;

  @Column('int', { nullable: true })
  totalInstallments: number;

  // Recurring billing
  @Column('boolean', { default: false })
  isRecurring: boolean;

  @Column('uuid', { nullable: true })
  recurringBillingId: string;

  // Relationships
  @ManyToOne(() => Child, { onDelete: 'CASCADE' })
  child: Child;

  @OneToMany(() => Payment, payment => payment.invoice)
  payments: Payment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  deletedAt: Date;

  /**
   * Check if invoice is overdue
   */
  isOverdue(): boolean {
    return new Date() > this.dueDate && this.status !== 'paid';
  }

  /**
   * Get days overdue
   */
  getDaysOverdue(): number {
    if (!this.isOverdue()) return 0;
    const diffTime = Math.abs(new Date().getTime() - this.dueDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
