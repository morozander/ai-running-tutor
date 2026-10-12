import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, Logger } from '@nestjs/common';

/**
 * TestService - Service for testing cron infrastructure
 */
@Injectable()
export class TestService {
  private readonly logger = new Logger(TestService.name);

  constructor(private readonly em: EntityManager) {}

  /**
   * Test database connectivity
   */
  async execute(): Promise<void> {
    this.logger.log('Test cron job executed');

    await this.em.getConnection().execute(`SELECT 1`);

    this.logger.log('Test cron job completed successfully');
  }
}
