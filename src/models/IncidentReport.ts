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

export enum IncidentType {
  INJURY = 'injury',
  SICKNESS = 'sickness',
  OTHER = 'other',
}

@Entity('incident_reports')
@Index(['tenantId', 'childId'])
@Index(['tenantId', 'loggedAt'])
export class IncidentReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  childId: string;

  @Column('enum', { enum: IncidentType })
  type: IncidentType;

  @Column('text')
  description: string;

  @Column('varchar', { length: 100, nullable: true })
  bodyPart: string | null; // used when type = injury

  @Column('text')
  actionTaken: string;

  @Column('uuid')
  loggedBy: string; // userId of the staff member who logged it

  @Column('timestamp')
  loggedAt: Date;

  @Column('boolean', { default: false })
  parentNotified: boolean;

  @ManyToOne(() => Child, { onDelete: 'CASCADE' })
  child: Child;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
