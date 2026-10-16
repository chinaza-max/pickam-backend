import { Module } from '@nestjs/common';
import { AdminServiceController } from './admin-service.controller';
import { LocationController } from './location.controller';
import { AdminServiceService } from './admin-service.service';
import { PrismaModule } from 'libs/prisma';
import { GuardsModule } from 'libs/guards';
import { ConfigModule } from 'libs/config';

@Module({
  imports: [
    PrismaModule,
    GuardsModule,
    ConfigModule,
  ],
  controllers: [AdminServiceController, LocationController],
  providers: [AdminServiceService],
})
export class AdminServiceModule {}

