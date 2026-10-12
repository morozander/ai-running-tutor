import { Injectable, Logger } from '@nestjs/common';

/**
 * Application logger
 *
 * Thin wrapper around NestJS Logger for consistency.
 * In production/Lambda, you can swap this for a JSON logger if needed.
 */
@Injectable()
export class AppLogger extends Logger {
  /**
   * Create a child logger with a specific context
   */
  static forContext(context: string): AppLogger {
    const logger = new AppLogger();
    logger.setContext(context);
    return logger;
  }

  setContext(context: string): void {
    this.context = context;
  }
}
