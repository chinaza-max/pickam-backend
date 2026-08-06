import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { WalletServiceModule } from './wallet-service.module';
import { HttpExceptionFilter } from 'libs/filters';
import { TransformInterceptor } from 'libs/interceptors';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(WalletServiceModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const configService = app.get(ConfigService);
  const port = configService.get<number>('WALLET_SERVICE_PORT') || 3002;

  await app.listen(port);
  console.log(`Wallet Service is running on: http://localhost:${port}`);
}
bootstrap();
