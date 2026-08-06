import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { GuardsModule } from 'libs/guards';
import { ConfigModule } from 'libs/config';

@Module({
  imports: [
    HttpModule,
    GuardsModule,
    ConfigModule,
  ],
  controllers: [GatewayController],
  providers: [GatewayService],
})
export class GatewayModule {}
