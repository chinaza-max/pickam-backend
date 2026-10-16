import { Module } from '@nestjs/common';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationService } from './notification-service.service';
import { EmailService } from './email.service';
import { PrismaModule } from 'libs/prisma';
import { GuardsModule } from 'libs/guards';
import { ConfigModule } from 'libs/config';

@Module({
  imports: [
    PrismaModule,
    GuardsModule,
    ConfigModule,
  ],
  controllers: [NotificationServiceController],
  providers: [NotificationService, EmailService],
  exports: [EmailService],
})
export class NotificationServiceModule {}

