import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureFlag } from './flags/entities/feature-flag.entity';
import { FlagDependency } from './flags/entities/flag-dependency.entity';
import { AuditLog } from './flags/entities/audit-log.entity';
import { FlagsModule } from './flags/flags.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: isTest ? 'sqlite' : 'postgres',
      database: isTest ? ':memory:' : process.env.POSTGRES_DB,
      host: isTest ? undefined : process.env.POSTGRES_HOST,
      port: isTest ? undefined : +process.env.POSTGRES_PORT!,
      username: isTest ? undefined : process.env.POSTGRES_USER,
      password: isTest ? undefined : process.env.POSTGRES_PASSWORD,
      entities: [FeatureFlag, FlagDependency, AuditLog],
      synchronize: true,
      dropSchema: isTest,
    }),
    FlagsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
