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
import { User } from './User';

@Entity('progress_reports')
@Index(['tenantId', 'childId'])
export class ProgressReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  childId: string;

  @Column('varchar', { length: 100 })
  reportPeriod: string; // "Q1 2025", "Jan-Mar 2025", "Term 1 2025"

  @Column('date')
  startDate: Date;

  @Column('date')
  endDate: Date;

  @Column('text', { nullable: true })
  teacherComments: string;

  @Column('text', { nullable: true })
  directorComments: string;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  attendanceRate: number; // Percentage

  @Column('int', { nullable: true })
  totalDaysPresent: number;

  @Column('int', { nullable: true })
  totalDaysAbsent: number;

  @Column('int', { nullable: true, default: 1 })
  behaviorRating: number; // 1-5 scale

  @Column('int', { nullable: true, default: 1 })
  socialSkillsRating: number; // 1-5 scale

  @Column('int', { nullable: true, default: 1 })
  academicProgressRating: number; // 1-5 scale

  @Column('text', { nullable: true })
  academicProgress: string; // Detailed academic progress notes

  @Column('text', { nullable: true })
  socialEmotionalDevelopment: string;

  @Column('text', { nullable: true })
  physicalDevelopment: string;

  @Column('text', { nullable: true })
  languageDevelopment: string;

  @Column('text', { nullable: true })
  cognitiveDevelopment: string;

  @Column('jsonb', { nullable: true })
  milestonesAchieved: Array<{ id: string; title: string; date: Date }>; // Summary of milestones

  @Column('jsonb', { nullable: true })
  assessmentsSummary: Array<{ id: string; type: string; score: number }>; // Summary of assessments

  @Column('text', { nullable: true })
  recommendations: string;

  @Column('text', { nullable: true })
  goalsForNextPeriod: string;

  @Column('uuid')
  generatedBy: string; // User ID who generated the report

  @Column('timestamp')
  generatedAt: Date;

  @Column('text', { nullable: true })
  pdfUrl: string; // URL to generated PDF

  @Column('boolean', { default: false })
  isSharedWithParent: boolean;

  @Column('timestamp', { nullable: true })
  sharedAt: Date;

  @Column('boolean', { default: true })
  isActive: boolean;

  // Relationships
  @ManyToOne(() => Child, child => child.activityLogs)
  child: Child;

  @ManyToOne(() => User, { nullable: true })
  generator: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Get overall rating average
   */
  getOverallRating(): number {
    const ratings = [
      this.behaviorRating || 0,
      this.socialSkillsRating || 0,
      this.academicProgressRating || 0,
    ].filter(r => r > 0);

    if (ratings.length === 0) return 0;
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
  }

  /**
   * Get rating description
   */
  getRatingDescription(rating: number): string {
    if (rating >= 4.5) return 'Outstanding';
    if (rating >= 3.5) return 'Excellent';
    if (rating >= 2.5) return 'Good';
    if (rating >= 1.5) return 'Satisfactory';
    return 'Needs Improvement';
  }

  /**
   * Get attendance status
   */
  getAttendanceStatus(): string {
    if (!this.attendanceRate) return 'Not Available';
    if (this.attendanceRate >= 95) return 'Excellent';
    if (this.attendanceRate >= 85) return 'Good';
    if (this.attendanceRate >= 75) return 'Satisfactory';
    return 'Concerning';
  }
}
