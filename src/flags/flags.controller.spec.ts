import { Test, TestingModule } from '@nestjs/testing';
import { FlagsController } from './flags.controller';
import { FlagsService } from './flags.service';

describe('FlagsController', () => {
  let controller: FlagsController;
  let service: FlagsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlagsController],
      providers: [
        {
          provide: FlagsService,
          useValue: {
            createFlag: jest.fn(),
            toggleFlag: jest.fn(),
            getStatus: jest.fn(),
            getHistory: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FlagsController>(FlagsController);
    service = module.get<FlagsService>(FlagsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call createFlag with correct params', async () => {
    const dto = { name: 'flag1', dependencies: ['dep1'] };
    await controller.create(dto);
    expect(service.createFlag).toHaveBeenCalledWith(dto.name, dto.dependencies);
  });

  it('should call toggleFlag with correct params', async () => {
    await controller.toggleFlag('flag1', "true");
    expect(service.toggleFlag).toHaveBeenCalledWith('flag1', true);

    await controller.toggleFlag('flag1', "false");
    expect(service.toggleFlag).toHaveBeenCalledWith('flag1', false);
  });

  it('should call getStatus with correct param', async () => {
    await controller.status('flag1');
    expect(service.getStatus).toHaveBeenCalledWith('flag1');
  });

  it('should call getHistory with correct param', async () => {
    await controller.history('flag1');
    expect(service.getHistory).toHaveBeenCalledWith('flag1');
  });
});
