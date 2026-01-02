import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { MealStatus } from '@shared';
import { Child } from './Child';
import { User } from './User';

@Entity('activity_logs')
@Index(['tenantId', 'centerId', 'childId', 'date'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  centerId: string;

  @Column('uuid')
  childId: string;

  @Column('uuid', { nullable: true })
  recordedByUserId: string;

  @Column('date')
  date: Date;

  @Column('time')
  time: string;

  // Activity type
  @Column('varchar', { length: 50 })
  activityType: string; // 'meal', 'nap', 'diaper', 'bathroom', 'learning', 'play', 'medication'

  // Meal-related
  @Column('enum', { enum: MealStatus, nullable: true })
  mealStatus: MealStatus;

  @Column('varchar', { length: 50, nullable: true })
  mealType: string; // 'breakfast', 'lunch', 'snack'

  @Column('simple-array', { nullable: true })
  foodItems: string[];

  // Sleep-related
  @Column('int', { nullable: true })
  napDurationMinutes: number;

  @Column('varchar', { length: 50, nullable: true })
  napQuality: string; // 'excellent', 'good', 'fair', 'poor'

  // Diaper-related
  @Column('varchar', { length: 50, nullable: true })
  diaperType: string; // 'wet', 'soiled', 'both'

  // Bathroom-related
  @Column('varchar', { length: 50, nullable: true })
  bathroomType: string; // 'wet', 'soiled', 'both'

  @Column('boolean', { nullable: true })
  pottyTrainingProgress: boolean;

  // Learning/Activities
  @Column('simple-array', { nullable: true })
  skillsPracticed: string[];

  @Column('simple-array', { nullable: true })
  materialsUsed: string[];

  @Column('text', { nullable: true })
  learningAreas: string; // 'cognitive', 'physical', 'social-emotional', 'language', 'creative'

  // Outdoor play
  @Column('int', { nullable: true })
  playDurationMinutes: number;

  @Column('varchar', { length: 50, nullable: true })
  weather: string;

  @Column('simple-array', { nullable: true })
  activitiesPerformed: string[];

  // Medication
  @Column('varchar', { length: 255, nullable: true })
  medicationName: string;

  @Column('varchar', { length: 100, nullable: true })
  medicationDosage: string;

  @Column('boolean', { nullable: true })
  medicationAuthorized: boolean;

  // Mood tracking
  @Column('varchar', { length: 50, nullable: true })
  mood: string; // 'happy', 'calm', 'playful', 'cranky', 'sleepy', 'anxious'

  // Media
  @Column('simple-array', { nullable: true })
  photoUrls: string[];

  @Column('text', { nullable: true })
  videoUrl: string;

  @Column('text', { nullable: true })
  voiceNoteUrl: string;

  // Notes and observations
  @Column('text', { nullable: true })
  description: string;

  @Column('text', { nullable: true })
  observations: string;

  @Column('boolean', { default: false })
  parentNotified: boolean;

  @Column('timestamp', { nullable: true })
  parentNotifiedAt: Date;

  // Privacy settings
  @Column('boolean', { default: true })
  isVisibleToParents: boolean;

  @Column('simple-array', { nullable: true })
  visibleToGuardianIds: string[];

  // Relationships
  @ManyToOne(() => Child, child => child.activityLogs, { onDelete: 'CASCADE' })
  child: Child;

  @ManyToOne(() => User, { nullable: true })
  recordedByUser: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  deletedAt: Date;
}
