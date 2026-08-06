import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UserServiceController } from './user-service.controller';
import { UserServiceService } from './user-service.service';
import { PrismaModule } from 'libs/prisma';
import { AuthModule } from 'libs/auth';
import { GuardsModule } from 'libs/guards';
import { ConfigModule } from 'libs/config';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    AuthModule,
    GuardsModule,
    ConfigModule,
  ],
  controllers: [UserServiceController],
  providers: [UserServiceService],
})
export class UserServiceModule {}
