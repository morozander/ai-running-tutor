/**
 * AWS Lambda Handler for Test Cron Job
 *
 * This Lambda function is used to verify that the cron infrastructure
 * is working properly without performing any actual business logic.
 *
 * Handler: src/crons/test/test.handler.handler
 */

import { bootstrapExecutionContext } from '../cron';
import { TestService } from './test.service';

export const handler = async () => {
  const { service, app } = await bootstrapExecutionContext(TestService);

  try {
    await service.execute();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Test cron job completed successfully',
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: `Test cron job failed: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      }),
    };
  } finally {
    await app.close();
  }
};
