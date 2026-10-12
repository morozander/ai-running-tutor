/**
 * AWS Lambda Handler
 *
 * Entry point for AWS Lambda deployments.
 * Uses @codegenie/serverless-express to wrap the NestJS app.
 *
 */

import serverlessExpress from '@codegenie/serverless-express';
import type { AppConfig } from '@config/app.config';
import { APP_CONFIG_KEY } from '@config/app.config';
// Import tracing FIRST for OpenTelemetry (if enabled)
import { otelSDK } from '@core/telemetry/tracing';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { buildCorsOptions } from '@shared/http/cors-options';
import type { Callback, Context, Handler } from 'aws-lambda';
import express from 'express';
import { AppModule } from './app.module';

let cachedServer: Handler;

async function bootstrap(): Promise<Handler> {
  if (!cachedServer) {
    // Start OpenTelemetry SDK (if enabled)
    if (otelSDK) {
      await otelSDK.start();
    }

    const expressApp = express();
    const adapter = new ExpressAdapter(expressApp);

    const app = await NestFactory.create(AppModule, adapter, {
      logger: ['error', 'warn', 'log'], // Reduce logging for Lambda
    });

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

    await app.init();

    cachedServer = serverlessExpress({ app: expressApp });
  }

  return cachedServer;
}

export const handler: Handler = async (event: unknown, context: Context, callback: Callback) => {
  // Optimize for Lambda: don't wait for event loop to be empty
  context.callbackWaitsForEmptyEventLoop = false;

  const server = await bootstrap();
  return server(event, context, callback);
};
