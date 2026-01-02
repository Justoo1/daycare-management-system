import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CertificationStatus } from '@shared';
import { StaffProfile } from './StaffProfile';

@Entity('certifications')
@Index(['tenantId', 'staffId'])
@Index(['expiryDate'])
export class Certification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  staffId: string;

  @Column('varchar', { length: 255 })
  certificationType: string; // "CPR", "First Aid", "Child Development Associate", etc.

  @Column('varchar', { length: 255 })
  issuingOrganization: string;

  @Column('date')
  issueDate: Date;

  @Column('date', { nullable: true })
  expiryDate: Date;

  @Column('varchar', { length: 100, nullable: true })
  certificateNumber: string;

  @Column('text', { nullable: true })
  documentUrl: string; // URL to uploaded certificate document

  @Column('enum', { enum: CertificationStatus, default: CertificationStatus.ACTIVE })
  status: CertificationStatus;

  @Column('text', { nullable: true })
  notes: string;

  @Column('boolean', { default: true })
  isActive: boolean;

  // Relationships
  @ManyToOne(() => StaffProfile, staff => staff.certifications, { onDelete: 'CASCADE' })
  staff: StaffProfile;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Check if certification is expired
   */
  isExpired(): boolean {
    if (!this.expiryDate) return false;
    return new Date() > this.expiryDate;
  }

  /**
   * Check if certification is expiring soon (within 30 days)
   */
  isExpiringSoon(daysThreshold: number = 30): boolean {
    if (!this.expiryDate) return false;
    const now = new Date();
    const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);
    return this.expiryDate <= threshold && this.expiryDate > now;
  }

  /**
   * Get days until expiry
   */
  getDaysUntilExpiry(): number | null {
    if (!this.expiryDate) return null;
    const now = new Date();
    const diff = this.expiryDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Auto-update status based on expiry date
   */
  updateStatus(): void {
    if (this.isExpired()) {
      this.status = CertificationStatus.EXPIRED;
    } else if (this.isExpiringSoon(60)) {
      this.status = CertificationStatus.PENDING_RENEWAL;
    } else {
      this.status = CertificationStatus.ACTIVE;
    }
  }
}
