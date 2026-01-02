import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { MessageType } from '@shared';
import { User } from './User';

@Entity('messages')
@Index(['tenantId', 'centerId'])
@Index(['tenantId', 'senderId', 'recipientId'])
@Index(['tenantId', 'conversationId'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  centerId: string;

  @Column('uuid')
  senderId: string;

  @Column('uuid', { nullable: true })
  recipientId: string;

  @Column('uuid', { nullable: true })
  conversationId: string;

  @Column('varchar', { length: 255, nullable: true })
  conversationName: string; // For group conversations

  @Column('enum', { enum: MessageType })
  messageType: MessageType;

  @Column('text')
  content: string;

  // Translation
  @Column('text', { nullable: true })
  translatedContent: string;

  @Column('varchar', { length: 10, nullable: true })
  translatedLanguage: string; // 'en', 'tw', 'ga', 'ee'

  // Media attachments
  @Column('simple-array', { nullable: true })
  attachmentUrls: string[];

  // Read receipts
  @Column('boolean', { default: false })
  isRead: boolean;

  @Column('timestamp', { nullable: true })
  readAt: Date;

  // Typing indicator
  @Column('boolean', { default: false })
  isTyping: boolean;

  // Pinning
  @Column('boolean', { default: false })
  isPinned: boolean;

  @Column('timestamp', { nullable: true })
  pinnedAt: Date;

  @Column('uuid', { nullable: true })
  pinnedByUserId: string;

  // Reply to another message
  @Column('uuid', { nullable: true })
  replyToMessageId: string;

  // Reactions/Emojis
  @Column('simple-json', { nullable: true })
  reactions: { userId: string; emoji: string }[];

  // Emergency flag
  @Column('boolean', { default: false })
  isEmergency: boolean;

  // Status
  @Column('boolean', { default: false })
  isDeleted: boolean;

  @Column('timestamp', { nullable: true })
  deletedAt: Date;

  // Relationships
  @ManyToOne(() => User, { nullable: true })
  sender: User;

  @ManyToOne(() => User, { nullable: true })
  recipient: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
