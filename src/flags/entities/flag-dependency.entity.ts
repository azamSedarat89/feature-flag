import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FeatureFlag } from './feature-flag.entity';

@Entity()
export class FlagDependency {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => FeatureFlag, (flag) => flag.dependencies)
  source: FeatureFlag;

  @ManyToOne(() => FeatureFlag, (flag) => flag.dependents)
  target: FeatureFlag;
}
