import { INestApplicationContext, Logger, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CronModule } from './cron.module';

const logger = new Logger('CronBootstrap');

/**
 * Bootstrap application context for cron Lambda functions
 *
 * Creates a minimal NestJS context without HTTP server,
 * loads dependencies, and returns the requested service.
 *
 * @param serviceClass - The service class to retrieve
 * @returns Object with service and app instance
 */
export async function bootstrapExecutionContext<S extends object>(
  serviceClass: Type<S>,
): Promise<{
  service: S;
  app: INestApplicationContext;
}> {
  try {
    logger.log('BootstrapExecutionContext: Starting bootstrap...');

    const app = await NestFactory.createApplicationContext(CronModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    logger.log('BootstrapExecutionContext: Application context created');

    const service = app.get(serviceClass);

    logger.log(`BootstrapExecutionContext: Service ${serviceClass.name} retrieved successfully`);

    return { service, app };
  } catch (error) {
    logger.error(
      `BootstrapExecutionContext: Failed to bootstrap - ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error.stack : undefined,
    );
    throw error;
  }
}
