import { Test, TestingModule } from '@nestjs/testing';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationService } from './notification-service.service';

describe('NotificationServiceController', () => {
  let controller: NotificationServiceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationServiceController],
      providers: [
        {
          provide: NotificationService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<NotificationServiceController>(NotificationServiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
