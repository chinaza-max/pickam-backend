import { Module } from '@nestjs/common';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationService } from './notification-service.service';
import { FirebaseService } from './firebase.service';
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
  providers: [NotificationService, FirebaseService, EmailService],
  exports: [EmailService, FirebaseService],
})
export class NotificationServiceModule {}
