import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlagsService } from './flags.service';
import { FlagsController } from './flags.controller';
import { FeatureFlag } from './entities/feature-flag.entity';
import { FlagDependency } from './entities/flag-dependency.entity';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FeatureFlag, FlagDependency, AuditLog])],
  providers: [FlagsService],
  controllers: [FlagsController],
})
export class FlagsModule {}
