import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FeatureFlag } from './entities/feature-flag.entity';
import { AuditLog } from './entities/audit-log.entity';
import { FlagDependency } from './entities/flag-dependency.entity';
import { AuditActionType } from './enums/audit-actions-type.enum';

@Injectable()
export class FlagsService {
  constructor(
    @InjectRepository(FeatureFlag)
    private flagRepo: Repository<FeatureFlag>,

    @InjectRepository(FlagDependency)
    private depRepo: Repository<FlagDependency>,

    @InjectRepository(AuditLog)
    private logRepo: Repository<AuditLog>,
  ) {}

  async createFlag(
    name: string,
    dependencies: string[] = [],
    actor = 'system',
  ) {
    const existing = await this.flagRepo.findOne({ where: { name } });
    if (existing) throw new BadRequestException('Flag already exists');

    const flag = this.flagRepo.create({ name });
    await this.flagRepo.save(flag);

    // Resolve dependencies
    const deps = await this.flagRepo.findBy({ name: In(dependencies) });

    if (deps.length !== dependencies.length) {
      throw new BadRequestException('One or more dependencies not found');
    }

    // Detect circular dependency
    for (const dep of deps) {
      const isCircular = await this.checkCycle(dep.id, flag.id);
      if (isCircular)
        throw new BadRequestException(
          `Circular dependency detected: ${dep.name} → ${name}`,
        );
    }

    const relations = deps.map((dep) =>
      this.depRepo.create({ source: flag, target: dep }),
    );
    await this.depRepo.save(relations);

    await this.logRepo.save({
      flag,
      action: AuditActionType.CREATE,
      actor,
      reason: 'initial creation',
    });

    return flag;
  }

  async toggleFlag(name: string, enable: boolean, actor = 'user') {
    const flag = await this.flagRepo.findOne({ where: { name } });
    if (!flag) throw new NotFoundException('Flag not found');

    if (enable) {
      const deps = await this.depRepo.find({
        where: { source: flag },
        relations: ['target'],
      });

      const missing = deps
        .filter((d) => !d.target.isEnabled)
        .map((d) => d.target.name);

      if (missing.length > 0) {
        throw new BadRequestException({
          error: 'Missing active dependencies',
          missing_dependencies: missing,
        });
      }

      flag.isEnabled = true;
      await this.flagRepo.save(flag);
      await this.logRepo.save({
        flag,
        action: AuditActionType.TOGGLE_ON,
        actor,
        reason: 'manual enable',
      });
    } else {
      // disable this flag
      flag.isEnabled = false;
      await this.flagRepo.save(flag);

      await this.logRepo.save({
        flag,
        action: AuditActionType.TOGGLE_OFF,
        actor,
        reason: 'manual disable',
      });

      // find all dependent flags and disable them recursively
      await this.disableDependents(flag, actor);
    }

    return flag;
  }

  async disableDependents(flag: FeatureFlag, actor: string) {
    const dependents = await this.depRepo.find({
      where: { target: flag },
      relations: ['source'],
    });

    for (const dep of dependents) {
      if (dep.source.isEnabled) {
        dep.source.isEnabled = false;
        await this.flagRepo.save(dep.source);
        await this.logRepo.save({
          flag: dep.source,
          action: AuditActionType.AUTO_DISABLE,
          actor,
          reason: `dependency ${flag.name} disabled`,
        });

        await this.disableDependents(dep.source, actor);
      }
    }
  }

  async getStatus(name: string) {
    const flag = await this.flagRepo.findOne({ where: { name } });
    if (!flag) throw new NotFoundException('Flag not found');
    return { name: flag.name, isEnabled: flag.isEnabled };
  }

  async getHistory(name: string) {
    const flag = await this.flagRepo.findOne({ where: { name } });
    if (!flag) throw new NotFoundException('Flag not found');

    const logs = await this.logRepo.find({
      where: { flag },
      order: { timestamp: 'DESC' },
    });

    return logs;
  }

  private async checkCycle(
    sourceId: number,
    targetId: number,
  ): Promise<boolean> {
    if (sourceId === targetId) return true;
    const deps = await this.depRepo.find({
      where: { source: { id: sourceId } },
      relations: ['target'],
    });

    for (const dep of deps) {
      if (await this.checkCycle(dep.target.id, targetId)) {
        return true;
      }
    }
    return false;
  }
}
