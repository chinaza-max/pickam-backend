import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WalletServiceController } from './wallet-service.controller';
import { WalletService } from './wallet-service.service';
import { SafeHavenService } from './safehaven.service';
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
  controllers: [WalletServiceController],
  providers: [WalletService, SafeHavenService],
})
export class WalletServiceModule {}
