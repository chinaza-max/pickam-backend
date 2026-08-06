import { Test, TestingModule } from '@nestjs/testing';
import { AdminServiceController } from './admin-service.controller';
import { AdminServiceService } from './admin-service.service';

describe('AdminServiceController', () => {
  let controller: AdminServiceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminServiceController],
      providers: [
        {
          provide: AdminServiceService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<AdminServiceController>(AdminServiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
