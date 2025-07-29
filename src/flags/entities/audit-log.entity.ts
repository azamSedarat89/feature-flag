import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FeatureFlag } from './feature-flag.entity';
import { AuditActionType } from '../enums/audit-actions-type.enum';

@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => FeatureFlag, (flag) => flag.logs)
  flag: FeatureFlag;

  @Column({
    type: process.env.NODE_ENV === 'test' ? 'text' : 'enum',
    enum: AuditActionType,
  })
  action: AuditActionType;

  @Column({ nullable: true })
  reason: string;

  @Column()
  actor: string;

  @CreateDateColumn()
  timestamp: Date;
}
