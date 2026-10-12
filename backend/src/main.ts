// IMPORTANT: Import tracing FIRST - before any other imports
// OpenTelemetry must instrument modules before they are loaded
import { otelSDK } from '@core/telemetry/tracing';
import type { AppConfig } from '@config/app.config';
import { APP_CONFIG_KEY } from '@config/app.config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { buildCorsOptions } from '@shared/http/cors-options';
import { AppModule } from './app.module';

async function bootstrap() {
  // Start OpenTelemetry SDK before NestJS (if enabled)
  if (otelSDK) {
    await otelSDK.start();
    console.log('OpenTelemetry SDK started');
  }

  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS: explicit origin allowlist from config; credentials are
  // only enabled alongside explicit origins (never with a '*' fallback).
  const appConfig = app.get(ConfigService).get<AppConfig>(APP_CONFIG_KEY);
  app.enableCors(buildCorsOptions(appConfig?.corsOrigin));

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`Application is running on: http://localhost:${port}/api/v1`);
}

bootstrap();
