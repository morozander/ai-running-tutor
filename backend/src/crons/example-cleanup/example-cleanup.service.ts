import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, Logger } from '@nestjs/common';

/**
 * ExampleCleanupService - Example service for cleaning up data
 *
 * This is an example cron job that can be used as a template.
 */
@Injectable()
export class ExampleCleanupService {
  private readonly logger = new Logger(ExampleCleanupService.name);

  constructor(private readonly em: EntityManager) {}

  /**
   * Execute cleanup logic
   */
  async execute(): Promise<void> {
    this.logger.log('Starting example cleanup...');

    try {
      const startTime = Date.now();

      const countResult = await this.em
        .getConnection()
        .execute(
          `SELECT COUNT(*) as count FROM ip_log WHERE created_at < now() - interval '180 days'`,
        );

      const count = countResult[0]?.count ?? 0;

      if (count === 0) {
        this.logger.log('No old records to delete');
        return;
      }

      await this.em
        .getConnection()
        .execute(`DELETE FROM ip_log WHERE created_at < now() - interval '180 days'`);

      const duration = Date.now() - startTime;

      this.logger.log(`Deleted ${count} records in ${duration}ms`);
    } catch (error) {
      this.logger.error('Failed to cleanup', error as Error);
      throw error;
    }
  }
}
