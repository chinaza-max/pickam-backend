import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OrderServiceController } from './order-service.controller';
import { OrderServiceService } from './order-service.service';
import { PrismaModule } from 'libs/prisma';
import { GuardsModule } from 'libs/guards';
import { ConfigModule } from 'libs/config';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    GuardsModule,
    ConfigModule,
  ],
  controllers: [OrderServiceController],
  providers: [OrderServiceService],
})
export class OrderServiceModule {}
