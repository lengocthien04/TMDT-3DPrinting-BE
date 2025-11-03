import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  const apiPrefix = configService.get<string>('apiPrefix') ?? 'api';
  const apiVersion = configService.get<string>('apiVersion') ?? 'v1';
  const port = configService.get<number>('port') ?? 3000;
  const corsOrigin = configService.get<string[]>('cors.origin') ?? [
    'http://localhost:3001',
  ];

  app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // --- Swagger setup ---
  const config = new DocumentBuilder()
    .setTitle('3D Printing Store API')
    .setDescription(
      'API documentation for 3D Printing Store – a backend for managing products, orders, and users.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Users', 'User profile management')
    .addTag('Products', '3D printing product management')
    .addTag('Orders', 'Customer order management')
    .addTag('Statistics', 'Store analytics and reports')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);
  logger.log(`🔗 API Prefix: ${apiPrefix}/${apiVersion}`);
}

bootstrap();
