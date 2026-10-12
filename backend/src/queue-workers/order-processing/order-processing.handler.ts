/**
 * Order Processing Worker - Lambda Handler
 *
 * This Lambda function processes order messages from SQS queue.
 *
 * Handler: src/queue-workers/order-processing/order-processing.handler.handler
 *
 * NOTE: partial-batch responses only work when the Lambda event source mapping
 * enables them — the SQS trigger MUST set
 * `function_response_types = ["ReportBatchItemFailures"]`, otherwise the
 * returned batchItemFailures is ignored by Lambda.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Context, SQSBatchItemFailure, SQSEvent, SQSHandler } from 'aws-lambda';
import type { OrderProcessingEvent } from '../../core/aws/sqs/sqs.types';
import { OrderProcessingModule } from './order-processing.module';
import { OrderProcessingService } from './order-processing.service';

const logger = new Logger('OrderProcessingHandler');

export const handler: SQSHandler = async (event: SQSEvent, context: Context) => {
  logger.log(`Processing ${event.Records.length} order messages`, {
    awsRequestId: context.awsRequestId,
  });

  let app: import('@nestjs/common').INestApplicationContext | undefined;

  try {
    app = await NestFactory.createApplicationContext(OrderProcessingModule);
    const processor = app.get(OrderProcessingService);

    const batchItemFailures: SQSBatchItemFailure[] = [];

    // Per-record isolation: one bad message must not fail the whole batch.
    // Only the failed messageIds are reported back — returning every
    // messageId on a single failure would re-deliver (and re-process) the
    // already-successful orders.
    await Promise.all(
      event.Records.map(async (record) => {
        try {
          const body = JSON.parse(record.body) as OrderProcessingEvent;

          logger.log(`Processing order: ${body.orderId}`, {
            eventType: body.eventType,
            orderId: body.orderId,
          });

          await processor.processOrder({
            messageId: record.messageId,
            body,
            receiptHandle: record.receiptHandle,
          });
        } catch (error) {
          logger.error(`Order processing failed for message ${record.messageId}`, error as Error);
          batchItemFailures.push({ itemIdentifier: record.messageId });
        }
      }),
    );

    if (batchItemFailures.length > 0) {
      logger.warn(
        `${batchItemFailures.length}/${event.Records.length} order messages failed and will be retried`,
      );
    } else {
      logger.log('All orders processed successfully');
    }

    return { batchItemFailures };
  } finally {
    if (app) {
      await app.close();
    }
  }
};
