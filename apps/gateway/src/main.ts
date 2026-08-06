import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { GatewayModule } from './gateway.module';
import { HttpExceptionFilter } from 'libs/filters';
import { TransformInterceptor } from 'libs/interceptors';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);

  // 1. Security Middlewares
  app.use(helmet());
  app.enableCors();

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        data: null,
        error: {
          statusCode: 429,
          message: 'Too many requests, please try again later.',
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // 2. Global Pipes, Filters & Interceptors
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // 3. Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('PickAm API System')
    .setDescription('API Gateway documenting all public-facing services (User, Wallet, Order, Admin, Notifications).')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // 4. Port Bootstrapping
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  await app.listen(port);
  console.log(`API Gateway is running on: http://localhost:${port}`);
  console.log(`OpenAPI documentation available at: http://localhost:${port}/docs`);
}
bootstrap();
