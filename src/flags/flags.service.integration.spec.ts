import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlagsService } from './flags.service';
import { FeatureFlag } from './entities/feature-flag.entity';
import { FlagDependency } from './entities/flag-dependency.entity';
import { AuditLog } from './entities/audit-log.entity';

describe('FlagsService Integration', () => {
  let service: FlagsService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          entities: [FeatureFlag, FlagDependency, AuditLog],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([FeatureFlag, FlagDependency, AuditLog]),
      ],
      providers: [FlagsService],
    }).compile();

    service = module.get<FlagsService>(FlagsService);
  });

  it('should create a flag successfully', async () => {
    const flag = await service.createFlag('testFlag');
    expect(flag.name).toBe('testFlag');
    expect(flag.isEnabled).toBe(false);
  });

  it('should toggle a flag on and off', async () => {
    await service.createFlag('toggleFlag');
    const enabled = await service.toggleFlag('toggleFlag', true);
    expect(enabled.isEnabled).toBe(true);

    const disabled = await service.toggleFlag('toggleFlag', false);
    expect(disabled.isEnabled).toBe(false);
  });

  it('should enforce dependency enabling', async () => {
    await service.createFlag('depFlag');
    await service.toggleFlag('depFlag', true);

    await service.createFlag('mainFlag', ['depFlag']);

    const mainEnabled = await service.toggleFlag('mainFlag', true);
    expect(mainEnabled.isEnabled).toBe(true);

    await service.toggleFlag('depFlag', false);
    const mainStatus = await service.getStatus('mainFlag');
    expect(mainStatus.isEnabled).toBe(false);
  });

  afterAll(async () => {
    await module.close();
  });
});
