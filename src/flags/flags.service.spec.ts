import { Test, TestingModule } from '@nestjs/testing';
import { FlagsService } from './flags.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeatureFlag } from './entities/feature-flag.entity';
import { AuditLog } from './entities/audit-log.entity';
import { FlagDependency } from './entities/flag-dependency.entity';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('FlagsService', () => {
  let service: FlagsService;
  let flagRepo: Repository<FeatureFlag>;
  let depRepo: Repository<FlagDependency>;
  let logRepo: Repository<AuditLog>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlagsService,
        {
          provide: getRepositoryToken(FeatureFlag),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(FlagDependency),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(AuditLog),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<FlagsService>(FlagsService);
    flagRepo = module.get<Repository<FeatureFlag>>(getRepositoryToken(FeatureFlag));
    depRepo = module.get<Repository<FlagDependency>>(getRepositoryToken(FlagDependency));
    logRepo = module.get<Repository<AuditLog>>(getRepositoryToken(AuditLog));
  });

  describe('createFlag', () => {
    it('should throw error if flag exists', async () => {
      jest.spyOn(flagRepo, 'findOne').mockResolvedValue({} as FeatureFlag);

      await expect(service.createFlag('flag1')).rejects.toThrow(BadRequestException);
    });

    it('should throw error if dependencies not found', async () => {
      jest.spyOn(flagRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(flagRepo, 'create').mockReturnValue({ name: 'flag1' } as FeatureFlag);
      jest.spyOn(flagRepo, 'save').mockResolvedValue({ name: 'flag1' } as FeatureFlag);
      jest.spyOn(flagRepo, 'findBy').mockResolvedValue([]);

      await expect(service.createFlag('flag1', ['dep1'])).rejects.toThrow(BadRequestException);
    });

    it('should throw error on circular dependency', async () => {
      jest.spyOn(flagRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(flagRepo, 'create').mockReturnValue({ id: 1, name: 'flag1' } as FeatureFlag);
      jest.spyOn(flagRepo, 'save').mockResolvedValue({ id: 1, name: 'flag1' } as FeatureFlag);

      jest.spyOn(flagRepo, 'findBy').mockResolvedValue([{ id: 2, name: 'dep1' } as FeatureFlag]);

      jest.spyOn(depRepo, 'create').mockImplementation((obj) => obj as any);
      jest.spyOn(depRepo, 'save').mockResolvedValue({} as FlagDependency);

      jest.spyOn(service as any, 'checkCycle').mockResolvedValue(true);

      await expect(service.createFlag('flag1', ['dep1'])).rejects.toThrow(BadRequestException);
    });

    it('should create flag successfully', async () => {
      jest.spyOn(flagRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(flagRepo, 'create').mockReturnValue({ id: 1, name: 'flag1' } as FeatureFlag);
      jest.spyOn(flagRepo, 'save').mockResolvedValue({ id: 1, name: 'flag1' } as FeatureFlag);
      jest.spyOn(flagRepo, 'findBy').mockResolvedValue([]);

      jest.spyOn(depRepo, 'create').mockImplementation((obj) => obj as any);
      jest.spyOn(depRepo, 'save').mockResolvedValue({} as FlagDependency);

      jest.spyOn(logRepo, 'save').mockResolvedValue({} as AuditLog);

      const result = await service.createFlag('flag1', []);

      expect(result.name).toBe('flag1');
    });
  });

  describe('toggleFlag', () => {
    it('should throw NotFoundException if flag not found', async () => {
      jest.spyOn(flagRepo, 'findOne').mockResolvedValue(null);

      await expect(service.toggleFlag('flag1', true)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if dependencies missing when enabling', async () => {
      const flag = { id: 1, name: 'flag1', isEnabled: false };
      jest.spyOn(flagRepo, 'findOne').mockResolvedValue(flag as any);
      jest.spyOn(depRepo, 'find').mockResolvedValue([{ target: { isEnabled: false, name: 'dep1' } }] as any);

      await expect(service.toggleFlag('flag1', true)).rejects.toThrow(BadRequestException);
    });

    it('should enable flag if all dependencies enabled', async () => {
      const flag = { id: 1, name: 'flag1', isEnabled: false };
      jest.spyOn(flagRepo, 'findOne').mockResolvedValue(flag as any);
      jest.spyOn(depRepo, 'find').mockResolvedValue([{ target: { isEnabled: true, name: 'dep1' } }] as any);
      jest.spyOn(flagRepo, 'save').mockResolvedValue({ ...flag, isEnabled: true } as any);
      jest.spyOn(logRepo, 'save').mockResolvedValue({} as any);

      const result = await service.toggleFlag('flag1', true);

      expect(result.isEnabled).toBe(true);
    });

    it('should disable flag and dependents', async () => {
      const flag = { id: 1, name: 'flag1', isEnabled: true };
      const dependentFlag = { id: 2, name: 'flag2', isEnabled: true };
      jest.spyOn(flagRepo, 'findOne').mockResolvedValue(flag as any);
      jest.spyOn(flagRepo, 'save').mockResolvedValue(flag as any);
      jest.spyOn(logRepo, 'save').mockResolvedValue({} as any);
      jest.spyOn(depRepo, 'find').mockResolvedValue([{ source: dependentFlag, target: flag }] as any);

      const disableSpy = jest.spyOn(service, 'disableDependents').mockImplementation(async () => {});

      const result = await service.toggleFlag('flag1', false);

      expect(result.isEnabled).toBe(false);
      expect(disableSpy).toHaveBeenCalledWith(flag, 'user');
    });
  });
});
