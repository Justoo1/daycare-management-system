import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { AssessmentType } from '@shared';
import { Child } from './Child';
import { User } from './User';

@Entity('assessments')
@Index(['tenantId', 'childId'])
@Index(['tenantId', 'assessmentType'])
export class Assessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  childId: string;

  @Column('enum', { enum: AssessmentType })
  assessmentType: AssessmentType;

  @Column('date')
  assessmentDate: Date;

  @Column('uuid')
  assessor: string; // User ID who conducted assessment

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  overallScore: number; // 0-100 scale

  @Column('jsonb', { nullable: true })
  ratings: Record<string, number>; // { "motor_skills": 85, "social_skills": 90, ... }

  @Column('text', { nullable: true })
  strengths: string;

  @Column('text', { nullable: true })
  areasForImprovement: string;

  @Column('text', { nullable: true })
  recommendations: string;

  @Column('text', { nullable: true })
  notes: string;

  @Column('date', { nullable: true })
  nextAssessmentDate: Date;

  @Column('simple-array', { nullable: true })
  attachmentUrls: string[]; // Supporting documents/photos

  @Column('boolean', { default: true })
  isActive: boolean;

  // Relationships
  @ManyToOne(() => Child, child => child.activityLogs)
  child: Child;

  @ManyToOne(() => User, { nullable: true })
  assessorUser: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Get assessment grade
   */
  getGrade(): string {
    if (!this.overallScore) return 'N/A';
    if (this.overallScore >= 90) return 'Excellent';
    if (this.overallScore >= 80) return 'Very Good';
    if (this.overallScore >= 70) return 'Good';
    if (this.overallScore >= 60) return 'Satisfactory';
    return 'Needs Improvement';
  }

  /**
   * Check if assessment is due for follow-up
   */
  isDueForFollowUp(): boolean {
    if (!this.nextAssessmentDate) return false;
    return new Date() >= this.nextAssessmentDate;
  }
}
