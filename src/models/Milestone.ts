import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { MilestoneCategory } from '@shared';
import { Child } from './Child';
import { User } from './User';

@Entity('milestones')
@Index(['tenantId', 'childId'])
@Index(['tenantId', 'category'])
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  childId: string;

  @Column('enum', { enum: MilestoneCategory })
  category: MilestoneCategory;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text')
  description: string;

  @Column('int')
  ageExpected: number; // Expected age in months

  @Column('date', { nullable: true })
  dateAchieved: Date;

  @Column('text', { nullable: true })
  notes: string;

  @Column('simple-array', { nullable: true })
  photoUrls: string[];

  @Column('uuid')
  recordedBy: string; // User ID who recorded this milestone

  @Column('boolean', { default: false })
  isAchieved: boolean;

  @Column('boolean', { default: true })
  isActive: boolean;

  // Relationships
  @ManyToOne(() => Child, child => child.activityLogs)
  child: Child;

  @ManyToOne(() => User, { nullable: true })
  recorder: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Check if milestone is delayed
   */
  isDelayed(currentAgeInMonths: number): boolean {
    if (this.isAchieved) return false;
    return currentAgeInMonths > this.ageExpected;
  }

  /**
   * Get milestone status
   */
  getStatus(currentAgeInMonths: number): string {
    if (this.isAchieved) return 'achieved';
    if (currentAgeInMonths < this.ageExpected) return 'upcoming';
    if (currentAgeInMonths === this.ageExpected) return 'due';
    return 'delayed';
  }
}
