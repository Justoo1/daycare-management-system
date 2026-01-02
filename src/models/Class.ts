import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Center } from './Center';
import { Child } from './Child';
import { User } from './User';
import { Attendance } from './Attendance';

@Entity('classes')
@Index(['tenantId', 'centerId'])
export class Class {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  centerId: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('int')
  ageGroupMin: number; // minimum age in months

  @Column('int')
  ageGroupMax: number; // maximum age in months

  @Column('int', { default: 20 })
  capacity: number;

  @Column('varchar', { length: 50, nullable: true })
  room: string;

  @Column('text', { nullable: true })
  schedule: string;

  @Column('text', { nullable: true })
  classPhotoUrl: string;

  @Column('boolean', { default: true })
  isActive: boolean;

  // Relationships
  @ManyToOne(() => Center, center => center.classes, { onDelete: 'CASCADE' })
  center: Center;

  @OneToMany(() => Child, child => child.class)
  children: Child[];

  // Teachers/Staff assigned to this class
  @ManyToMany(() => User, { nullable: true })
  @JoinTable({
    name: 'class_teachers',
    joinColumn: { name: 'classId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  teachers: User[];

  @OneToMany(() => Attendance, attendance => attendance.class)
  attendances: Attendance[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  deletedAt: Date;

  /**
   * Get current enrollment count
   */
  getEnrollmentCount(): number {
    return this.children?.length || 0;
  }

  /**
   * Get available capacity
   */
  getAvailableCapacity(): number {
    return this.capacity - this.getEnrollmentCount();
  }

  /**
   * Check if class is full
   */
  isFull(): boolean {
    return this.getEnrollmentCount() >= this.capacity;
  }
}
