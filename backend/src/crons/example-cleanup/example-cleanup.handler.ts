/**
 * AWS Lambda Handler for Example Cleanup Job
 *
 * Handler: src/crons/example-cleanup/example-cleanup.handler.handler
 */

import { bootstrapExecutionContext } from '../cron';
import { ExampleCleanupService } from './example-cleanup.service';

export const handler = async () => {
  const { service, app } = await bootstrapExecutionContext(ExampleCleanupService);

  try {
    await service.execute();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Example cleanup completed successfully',
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: `Example cleanup failed: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      }),
    };
  } finally {
    await app.close();
  }
};
