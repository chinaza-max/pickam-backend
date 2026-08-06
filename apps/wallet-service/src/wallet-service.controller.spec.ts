import { Test, TestingModule } from '@nestjs/testing';
import { WalletServiceController } from './wallet-service.controller';
import { WalletService } from './wallet-service.service';

describe('WalletServiceController', () => {
  let controller: WalletServiceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletServiceController],
      providers: [
        {
          provide: WalletService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<WalletServiceController>(WalletServiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
