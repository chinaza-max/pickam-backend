import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { UserServiceModule } from './user-service.module';
import { HttpExceptionFilter } from 'libs/filters';
import { TransformInterceptor } from 'libs/interceptors';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(UserServiceModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const configService = app.get(ConfigService);
  const port = configService.get<number>('USER_SERVICE_PORT') || 3001;

  await app.listen(port);
  console.log(`User Service is running on: http://localhost:${port}`);
}
bootstrap();
