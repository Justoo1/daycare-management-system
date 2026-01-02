import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './User';
import { Child } from './Child';
import { Class } from './Class';

@Entity('centers')
@Index(['tenantId'])
export class Center {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('varchar')
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('varchar', { length: 20 })
  registrationNumber: string;

  @Column('varchar', { length: 15 })
  phoneNumber: string;

  @Column('varchar')
  email: string;

  @Column('text')
  address: string;

  @Column('varchar', { length: 100, nullable: true })
  city: string;

  @Column('varchar', { length: 50, nullable: true })
  region: string;

  @Column('varchar', { length: 50, nullable: true })
  district: string;

  @Column('text', { nullable: true })
  gpLocation: string;

  // Geolocation for attendance verification
  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column('int', { default: 100, nullable: true })
  geofenceRadius: number; // Radius in meters for check-in verification

  // Operating hours
  @Column('time')
  operatingHoursStart: string;

  @Column('time')
  operatingHoursEnd: string;

  // Pricing
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  monthlyTuition: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  mealFee: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  activityFee: number;

  @Column('varchar', { length: 3, nullable: true })
  currency: string;

  // Late fee settings
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  lateFeePerDay: number;

  @Column('int', { nullable: true })
  lateFeeMaxDays: number;

  // Staff-to-child ratios (Ghana standards)
  @Column('int', { default: 4 })
  infantRatio: number; // 1 staff : X infants

  @Column('int', { default: 6 })
  toddlerRatio: number; // 1 staff : X toddlers

  @Column('int', { default: 8 })
  preschoolRatio: number; // 1 staff : X preschoolers

  // Configuration flags
  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('boolean', { default: false })
  requiresQRCodeCheckIn: boolean;

  @Column('boolean', { default: false })
  requiresNFCCheckIn: boolean;

  // Logo and branding
  @Column('text', { nullable: true })
  logoUrl: string;

  @Column('int', { nullable: true })
  capacity: number;

  // Relationships
  @OneToMany(() => User, user => user.center)
  users: User[];

  @OneToMany(() => Child, child => child.center)
  children: Child[];

  @OneToMany(() => Class, classRoom => classRoom.center)
  classes: Class[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  deletedAt: Date;
}
