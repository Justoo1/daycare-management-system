import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from './User';

export enum ReportType {
  ATTENDANCE = 'attendance',
  ENROLLMENT = 'enrollment',
  FINANCIAL = 'financial',
  STAFF = 'staff',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  EXCEL = 'excel',
}

@Entity('reports')
@Index(['tenantId', 'reportType', 'createdAt'])
@Index(['tenantId', 'generatedBy'])
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('enum', { enum: ReportType })
  reportType: ReportType;

  @Column('varchar', { length: 255 })
  reportName: string;

  @Column('uuid')
  generatedBy: string; // User ID

  @Column('date')
  startDate: Date;

  @Column('date')
  endDate: Date;

  @Column('jsonb', { nullable: true })
  filters: Record<string, any>; // Additional filters applied

  @Column('jsonb')
  data: any; // Report data/results

  @Column('jsonb', { nullable: true })
  summary: Record<string, any>; // Summary statistics

  @Column('enum', { enum: ReportFormat, default: ReportFormat.JSON })
  format: ReportFormat;

  @Column('text', { nullable: true })
  fileUrl: string; // URL to exported file (PDF/Excel)

  @Column('boolean', { default: true })
  isActive: boolean;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  /**
   * Get date range in days
   */
  getDateRangeDays(): number {
    const diff = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if report is recent (within last 24 hours)
   */
  isRecent(): boolean {
    const dayAgo = new Date();
    dayAgo.setHours(dayAgo.getHours() - 24);
    return this.createdAt >= dayAgo;
  }
}
