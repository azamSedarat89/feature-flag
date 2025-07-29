import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { FlagDependency } from './flag-dependency.entity';
import { AuditLog } from './audit-log.entity';

@Entity()
export class FeatureFlag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ default: false })
  isEnabled: boolean;

  @OneToMany(() => FlagDependency, (dep) => dep.source)
  dependencies: FlagDependency[];

  @OneToMany(() => FlagDependency, (dep) => dep.target)
  dependents: FlagDependency[];

  @OneToMany(() => AuditLog, (log) => log.flag)
  logs: AuditLog[];
}
