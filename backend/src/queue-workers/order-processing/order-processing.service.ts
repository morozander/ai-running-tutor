import { Injectable, Logger } from '@nestjs/common';
import type { OrderProcessingEvent, SqsMessage } from '../../core/aws/sqs/sqs.types';

/**
 * Order Processing Service - SQS Consumer
 *
 * This service processes order messages from SQS queue.
 * Used by Lambda worker function.
 */
@Injectable()
export class OrderProcessingService {
  private readonly logger = new Logger(OrderProcessingService.name);

  /**
   * Process a single order message
   */
  async processOrder(message: SqsMessage<OrderProcessingEvent>): Promise<void> {
    this.logger.log(`Processing order: ${message.body.orderId}`);

    try {
      // Your business logic here:
      // - Validate order
      // - Process payment
      // - Update inventory
      // - Send confirmation

      this.logger.log(`Order processed successfully: ${message.body.orderId}`);
    } catch (error) {
      this.logger.error('Failed to process order', error as Error);
      throw error; // Re-throw to trigger SQS retry
    }
  }
}
